import os
import random

from sqlalchemy.orm import Session

from models import Meeting


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
