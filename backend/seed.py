import random
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from database import SessionLocal
from models import User, Meeting, Participant
from services.meeting_service import generate_meeting_code

GUEST_NAMES = ["Alex Chen", "Priya Patel", "Sam Rivera", "Jordan Lee", "Morgan Blake"]


def seed(db: Session) -> None:
    existing_user = db.query(User).first()
    if existing_user:
        return  # already seeded

    user = User(name="Kartikeya", email="user@example.com", avatar_color="#0B5CFF")
    db.add(user)
    db.commit()
    db.refresh(user)

    now = datetime.now(timezone.utc)

    # 3 upcoming scheduled meetings
    upcoming_offsets = [timedelta(hours=2), timedelta(days=1), timedelta(days=3)]
    for i, offset in enumerate(upcoming_offsets):
        meeting = Meeting(
            meeting_code=generate_meeting_code(db),
            title=f"Upcoming Sync {i + 1}",
            description="Scheduled team meeting",
            host_id=user.id,
            type="scheduled",
            scheduled_start=now + offset,
            duration_minutes=40,
            status="scheduled",
        )
        db.add(meeting)
    db.commit()

    # 5 ended meetings in the past, each with 2-4 participants
    for i in range(5):
        started = now - timedelta(days=i + 1, hours=random.randint(1, 5))
        duration = random.choice([30, 40, 60])
        ended = started + timedelta(minutes=duration)
        meeting = Meeting(
            meeting_code=generate_meeting_code(db),
            title=f"Past Meeting {i + 1}",
            description=None,
            host_id=user.id,
            type="instant" if i % 2 == 0 else "scheduled",
            scheduled_start=started if i % 2 != 0 else None,
            duration_minutes=duration,
            status="ended",
            created_at=started,
            started_at=started,
            ended_at=ended,
        )
        db.add(meeting)
        db.commit()
        db.refresh(meeting)

        host_participant = Participant(
            meeting_id=meeting.id,
            user_id=user.id,
            display_name=user.name,
            role="host",
            joined_at=started,
            left_at=ended,
        )
        db.add(host_participant)

        guest_count = random.randint(1, 3)
        for name in random.sample(GUEST_NAMES, guest_count):
            db.add(
                Participant(
                    meeting_id=meeting.id,
                    display_name=name,
                    role="participant",
                    joined_at=started,
                    left_at=ended,
                )
            )
        db.commit()

    # 1 live meeting with the host and 3 guests already in it, to demo the host controls
    started = now - timedelta(minutes=10)
    live = Meeting(
        meeting_code=generate_meeting_code(db),
        title="Team standup (demo)",
        host_id=user.id,
        type="instant",
        status="live",
        created_at=started,
        started_at=started,
    )
    db.add(live)
    db.commit()
    db.refresh(live)

    db.add(Participant(meeting_id=live.id, user_id=user.id, display_name=user.name, role="host", joined_at=started))
    for name, muted in [("Priya Patel", False), ("Sam Rivera", False), ("Jordan Lee", True)]:
        db.add(Participant(meeting_id=live.id, display_name=name, role="participant", is_muted=muted, joined_at=started))
    db.commit()


def run_seed() -> None:
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
