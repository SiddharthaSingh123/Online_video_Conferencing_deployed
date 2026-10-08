import os
import random

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models import Meeting, User


def generate_meeting_code(db: Session) -> str:
    """10-digit numeric code, retried until unique in the DB."""
    while True:
        code = "".join(random.choices("0123456789", k=10))
        exists = db.query(Meeting).filter(Meeting.meeting_code == code).first()
        if not exists:
            return code


def build_invite_link(meeting_code: str) -> str:
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").strip().rstrip("/")
    return f"{frontend_url}/j/{meeting_code}"


def get_open_meeting(db: Session, code: str) -> Meeting:
    """Meeting that can still be joined. Ended meetings are treated as not found."""
    meeting = db.query(Meeting).filter(Meeting.meeting_code == code).first()
    if not meeting or meeting.status == "ended":
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


def list_live(db: Session, host_id: int) -> list[Meeting]:
    """The host's meetings in progress, newest first (so they can get back into them)."""
    return (
        db.query(Meeting)
        .filter(Meeting.host_id == host_id, Meeting.status == "live")
        .order_by(Meeting.started_at.desc())
        .all()
    )


def require_meeting_host(meeting: Meeting, user: User) -> None:
    if meeting.host_id != user.id:
        raise HTTPException(status_code=403, detail="Only the host can do this")
