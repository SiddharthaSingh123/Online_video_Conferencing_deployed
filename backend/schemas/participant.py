from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class JoinRequest(BaseModel):
    display_name: str


class LeaveRequest(BaseModel):
    participant_id: int


class HostActionRequest(BaseModel):
    # No logins, so the host proves who they are with their participant id.
    requester_participant_id: int


class MuteRequest(BaseModel):
    muted: bool


class ParticipantOut(BaseModel):
    id: int
    display_name: str
    role: str
    is_muted: bool
    is_removed: bool
    joined_at: datetime
    left_at: Optional[datetime] = None

    class Config:
        from_attributes = True
