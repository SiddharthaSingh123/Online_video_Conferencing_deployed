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
    JoinRequest,
    LeaveRequest,
)
from services.meeting_service import generate_meeting_code, build_invite_link

router = APIRouter(prefix="/meetings", tags=["meetings"])


def _to_meeting_out(meeting: Meeting) -> MeetingOut:
    return MeetingOut(
        **{c: getattr(meeting, c) for c in MeetingOut.model_fields if c != "invite_link"},
        invite_link=build_invite_link(meeting.meeting_code),
    )


def _to_meeting_detail_out(meeting: Meeting) -> MeetingDetailOut:
    active_participants = [p for p in meeting.participants if p.left_at is None]
    return MeetingDetailOut(
        **{c: getattr(meeting, c) for c in MeetingOut.model_fields if c != "invite_link"},
        invite_link=build_invite_link(meeting.meeting_code),
        participants=active_participants,
    )


def _get_default_user(db: Session) -> User:
    user = db.query(User).first()
    if not user:
        raise HTTPException(status_code=500, detail="No default user seeded")
    return user


@router.post("/instant", response_model=MeetingOut)
def create_instant_meeting(payload: InstantMeetingCreate, db: Session = Depends(get_db)):
    host = _get_default_user(db)
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
def create_scheduled_meeting(payload: ScheduledMeetingCreate, db: Session = Depends(get_db)):
    host = _get_default_user(db)
    meeting = Meeting(
        meeting_code=generate_meeting_code(db),
        title=payload.title,
        description=payload.description,
        host_id=host.id,
        type="scheduled",
        scheduled_start=payload.scheduled_start,
        duration_minutes=payload.duration_minutes,
        status="scheduled",
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return _to_meeting_out(meeting)


@router.get("/upcoming", response_model=list[MeetingOut])
def list_upcoming(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    meetings = (
        db.query(Meeting)
        .filter(Meeting.status == "scheduled", Meeting.scheduled_start >= now)
        .order_by(Meeting.scheduled_start.asc())
        .all()
    )
    return [_to_meeting_out(m) for m in meetings]


@router.get("/recent", response_model=list[MeetingOut])
def list_recent(db: Session = Depends(get_db)):
    meetings = (
        db.query(Meeting)
        .filter(Meeting.status == "ended")
        .order_by(Meeting.ended_at.desc())
        .limit(10)
        .all()
    )
    return [_to_meeting_out(m) for m in meetings]


@router.get("/{code}", response_model=MeetingDetailOut)
def get_meeting(code: str, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.meeting_code == code).first()
    if not meeting or meeting.status == "ended":
        raise HTTPException(status_code=404, detail="Meeting not found")
    return _to_meeting_detail_out(meeting)


@router.post("/{code}/join", response_model=MeetingDetailOut)
def join_meeting(code: str, payload: JoinRequest, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.meeting_code == code).first()
    if not meeting or meeting.status == "ended":
        raise HTTPException(status_code=404, detail="Meeting not found")

    if meeting.status == "scheduled":
        meeting.status = "live"
        meeting.started_at = datetime.now(timezone.utc)

    participant = Participant(
        meeting_id=meeting.id,
        display_name=payload.display_name,
        role="participant",
    )
    db.add(participant)
    db.commit()
    db.refresh(meeting)

    return _to_meeting_detail_out(meeting)


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


@router.post("/{code}/end", response_model=MeetingOut)
def end_meeting(code: str, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.meeting_code == code).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    meeting.status = "ended"
    meeting.ended_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(meeting)
    return _to_meeting_out(meeting)
