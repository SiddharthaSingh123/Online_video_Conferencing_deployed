"""Who is in a meeting, and the host controls (mute all, remove)."""

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models import Meeting, Participant


def visible_participants(meeting: Meeting) -> list[Participant]:
    """People currently in the meeting: not left, and not removed by the host."""
    return [p for p in meeting.participants if p.left_at is None and not p.is_removed]


def get_active_participant(meeting: Meeting, participant_id: int) -> Participant:
    participant = next((p for p in visible_participants(meeting) if p.id == participant_id), None)
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    return participant


def require_host(meeting: Meeting, requester_participant_id: int) -> None:
    """There are no logins, so a request counts as "from the host" when it carries the
    participant id of this meeting's host who is still in the meeting."""
    requester = next((p for p in visible_participants(meeting) if p.id == requester_participant_id), None)
    if not requester or requester.role != "host":
        raise HTTPException(status_code=403, detail="Only the host can do this")


def mute_all(db: Session, meeting: Meeting, requester_participant_id: int) -> None:
    require_host(meeting, requester_participant_id)
    for participant in visible_participants(meeting):
        if participant.role != "host":
            participant.is_muted = True
    db.commit()


def remove_participant(db: Session, meeting: Meeting, participant_id: int, requester_participant_id: int) -> None:
    require_host(meeting, requester_participant_id)
    participant = get_active_participant(meeting, participant_id)
    if participant.role == "host":
        raise HTTPException(status_code=400, detail="The host can't be removed")
    participant.is_removed = True
    participant.left_at = datetime.now(timezone.utc)
    db.commit()


def set_muted(db: Session, meeting: Meeting, participant_id: int, muted: bool) -> Participant:
    """A participant mutes or unmutes themselves (e.g. unmuting after the host muted everyone)."""
    participant = get_active_participant(meeting, participant_id)
    participant.is_muted = muted
    db.commit()
    db.refresh(participant)
    return participant


def check_can_join(meeting: Meeting, display_name: str) -> None:
    """Someone the host removed can't come back under the same name (kept simple: no accounts)."""
    name = display_name.lower()
    if any(p.is_removed and p.display_name.lower() == name for p in meeting.participants):
        raise HTTPException(status_code=403, detail="You were removed from this meeting by the host")
