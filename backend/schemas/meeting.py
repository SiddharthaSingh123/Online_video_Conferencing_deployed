from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel

from .participant import ParticipantOut


class InstantMeetingCreate(BaseModel):
    title: Optional[str] = "Instant Meeting"


class ScheduledMeetingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    scheduled_start: datetime
    duration_minutes: int = 40


class MeetingOut(BaseModel):
    id: int
    meeting_code: str
    title: str
    description: Optional[str] = None
    host_id: int
    type: str
    scheduled_start: Optional[datetime] = None
    duration_minutes: int
    status: str
    created_at: datetime
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    invite_link: str

    class Config:
        from_attributes = True


class MeetingDetailOut(MeetingOut):
    participants: List[ParticipantOut] = []
