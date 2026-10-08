from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Meeting, Participant, User
from schemas import (
    InstantMeetingCreate,
    ScheduledMeetingCreate,
    MeetingOut,
    MeetingDetailOut,
    JoinOut,
    HostActionRequest,
    JoinRequest,
    LeaveRequest,
    MuteRequest,
    ParticipantOut,
)
from services import participant_service
from services.auth_service import get_current_user
from services.meeting_service import (
    build_invite_link,
    generate_meeting_code,
    get_open_meeting,
    list_live,
    require_meeting_host,
)

# `current_user` below is the logged-in user, or the seeded default user when logged out.
router = APIRouter(prefix="/meetings", tags=["meetings"])


def _to_meeting_out(meeting: Meeting) -> MeetingOut:
    return MeetingOut(
        **{c: getattr(meeting, c) for c in MeetingOut.model_fields if c != "invite_link"},
        invite_link=build_invite_link(meeting.meeting_code),
    )


def _to_meeting_detail_out(meeting: Meeting) -> MeetingDetailOut:
    return MeetingDetailOut(
        **{c: getattr(meeting, c) for c in MeetingOut.model_fields if c != "invite_link"},
        invite_link=build_invite_link(meeting.meeting_code),
        participants=participant_service.visible_participants(meeting),
    )


def _go_live(meeting: Meeting) -> None:
    if meeting.status == "scheduled":
        meeting.status = "live"
        meeting.started_at = datetime.now(timezone.utc)


@router.post("/instant", response_model=MeetingOut)
def create_instant_meeting(
    payload: InstantMeetingCreate,
    db: Session = Depends(get_db),
    host: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    meeting = Meeting(
        meeting_code=generate_meeting_code(db),
        title=payload.title or "Instant Meeting",
        host_id=host.id,
        type="instant",
        status="live",
        started_at=now,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    participant = Participant(
        meeting_id=meeting.id,
        user_id=host.id,
        display_name=host.name,
        role="host",
    )
    db.add(participant)
    db.commit()
    db.refresh(meeting)

    return _to_meeting_out(meeting)


@router.post("", response_model=MeetingOut)
def create_scheduled_meeting(
    payload: ScheduledMeetingCreate,
    db: Session = Depends(get_db),
    host: User = Depends(get_current_user),
):
    # SQLite drops the timezone when saving, so convert to UTC first.
    # A time sent without a timezone is assumed to already be UTC.
    scheduled_start = payload.scheduled_start
    if scheduled_start.tzinfo is not None:
        scheduled_start = scheduled_start.astimezone(timezone.utc)

    meeting = Meeting(
        meeting_code=generate_meeting_code(db),
        title=payload.title,
        description=payload.description,
        host_id=host.id,
        type="scheduled",
        scheduled_start=scheduled_start,
        duration_minutes=payload.duration_minutes,
        status="scheduled",
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return _to_meeting_out(meeting)


@router.get("/upcoming", response_model=list[MeetingOut])
def list_upcoming(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    meetings = (
        db.query(Meeting)
        .filter(
            Meeting.host_id == current_user.id,
            Meeting.status == "scheduled",
            Meeting.scheduled_start >= now,
        )
        .order_by(Meeting.scheduled_start.asc())
        .all()
    )
    return [_to_meeting_out(m) for m in meetings]


@router.get("/recent", response_model=list[MeetingOut])
def list_recent(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    meetings = (
        db.query(Meeting)
        .filter(Meeting.host_id == current_user.id, Meeting.status == "ended")
        .order_by(Meeting.ended_at.desc())
        .limit(10)
        .all()
    )
    return [_to_meeting_out(m) for m in meetings]


@router.get("/live", response_model=list[MeetingOut])
def list_live_meetings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return [_to_meeting_out(m) for m in list_live(db, current_user.id)]


@router.get("/{code}", response_model=MeetingDetailOut)
def get_meeting(code: str, db: Session = Depends(get_db)):
    meeting = get_open_meeting(db, code)
    return _to_meeting_detail_out(meeting)


@router.post("/{code}/join", response_model=JoinOut)
def join_meeting(code: str, payload: JoinRequest, db: Session = Depends(get_db)):
    meeting = get_open_meeting(db, code)
    display_name = payload.display_name.strip()
    if not display_name:
        raise HTTPException(status_code=400, detail="Display name is required")
    participant_service.check_can_join(meeting, display_name)

    _go_live(meeting)
    participant = Participant(
        meeting_id=meeting.id,
        display_name=display_name,
        role="participant",
    )
    db.add(participant)
    db.commit()
    db.refresh(meeting)
    db.refresh(participant)

    return JoinOut(meeting=_to_meeting_detail_out(meeting), participant=participant)


@router.post("/{code}/start", response_model=JoinOut)
def start_meeting(code: str, db: Session = Depends(get_db), host: User = Depends(get_current_user)):
    """The host enters the room: the meeting goes live and the host gets an active participant row.
    Safe to call again (e.g. on page refresh): it reuses the host's existing row."""
    meeting = get_open_meeting(db, code)
    require_meeting_host(meeting, host)

    _go_live(meeting)
    host_participant = next(
        (p for p in meeting.participants if p.role == "host" and p.left_at is None),
        None,
    )
    if not host_participant:
        host_participant = Participant(
            meeting_id=meeting.id,
            user_id=host.id,
            display_name=host.name,
            role="host",
        )
        db.add(host_participant)
    db.commit()
    db.refresh(meeting)
    db.refresh(host_participant)

    return JoinOut(meeting=_to_meeting_detail_out(meeting), participant=host_participant)


@router.post("/{code}/leave")
def leave_meeting(code: str, payload: LeaveRequest, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.meeting_code == code).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    participant = (
        db.query(Participant)
        .filter(Participant.id == payload.participant_id, Participant.meeting_id == meeting.id)
        .first()
    )
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")

    participant.left_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok"}


@router.post("/{code}/mute-all", response_model=MeetingDetailOut)
def mute_all(code: str, payload: HostActionRequest, db: Session = Depends(get_db)):
    meeting = get_open_meeting(db, code)
    participant_service.mute_all(db, meeting, payload.requester_participant_id)
    db.refresh(meeting)
    return _to_meeting_detail_out(meeting)


@router.post("/{code}/participants/{participant_id}/remove", response_model=MeetingDetailOut)
def remove_participant(code: str, participant_id: int, payload: HostActionRequest, db: Session = Depends(get_db)):
    meeting = get_open_meeting(db, code)
    participant_service.remove_participant(db, meeting, participant_id, payload.requester_participant_id)
    db.refresh(meeting)
    return _to_meeting_detail_out(meeting)


@router.post("/{code}/participants/{participant_id}/mute", response_model=ParticipantOut)
def set_participant_muted(code: str, participant_id: int, payload: MuteRequest, db: Session = Depends(get_db)):
    meeting = get_open_meeting(db, code)
    return participant_service.set_muted(db, meeting, participant_id, payload.muted)


@router.post("/{code}/end", response_model=MeetingOut)
def end_meeting(code: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    meeting = db.query(Meeting).filter(Meeting.meeting_code == code).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    require_meeting_host(meeting, current_user)

    now = datetime.now(timezone.utc)
    meeting.status = "ended"
    meeting.ended_at = now
    # Ending the meeting removes everyone still in it.
    for p in meeting.participants:
        if p.left_at is None:
            p.left_at = now
    db.commit()
    db.refresh(meeting)
    return _to_meeting_out(meeting)
