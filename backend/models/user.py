from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    avatar_color = Column(String, nullable=False, default="#0B5CFF")
    # bcrypt hash of the password (nullable: a user without one simply can't log in).
    password_hash = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    meetings = relationship("Meeting", back_populates="host")
    participations = relationship("Participant", back_populates="user")
