from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class JoinRequest(BaseModel):
    display_name: str


class LeaveRequest(BaseModel):
    participant_id: int


class ParticipantOut(BaseModel):
    id: int
    display_name: str
    role: str
    joined_at: datetime
    left_at: Optional[datetime] = None

    class Config:
        from_attributes = True
