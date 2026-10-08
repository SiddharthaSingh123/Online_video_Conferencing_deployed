"""Optional accounts: signup, login, JWT tokens, and who the current user is."""

import logging
import os
import random
import re
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models import User

DEFAULT_USER_EMAIL = "siddhartha@gmail.com"  # seeded demo account; the API acts as it when there's no token
TOKEN_ALGORITHM = "HS256"
TOKEN_LIFETIME = timedelta(days=7)
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
AVATAR_COLORS = ["#0B5CFF", "#FF742E", "#12A37F", "#8E4EC6", "#E5484D", "#0091B5", "#D6409F"]

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    # Fine for local development: tokens just stop working when the server restarts.
    SECRET_KEY = secrets.token_hex(32)
    logging.warning("SECRET_KEY is not set: using a random key, so logins reset when the server restarts.")

# auto_error=False: a missing header is allowed (logged out) instead of an automatic 403.
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str | None) -> bool:
    # bcrypt only accepts up to 72 bytes (the bcrypt package raises an error for more).
    if not password_hash or len(password.encode()) > 72:
        return False
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_token(user: User) -> str:
    expires = datetime.now(timezone.utc) + TOKEN_LIFETIME
    return jwt.encode({"sub": str(user.id), "exp": expires}, SECRET_KEY, algorithm=TOKEN_ALGORITHM)


def signup(db: Session, name: str, email: str, password: str) -> User:
    name = name.strip()
    email = email.strip().lower()
    if not name:
        raise HTTPException(status_code=400, detail="Please enter your name")
    if not EMAIL_PATTERN.match(email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if len(password.encode()) > 72:
        raise HTTPException(status_code=400, detail="Password is too long (72 characters max)")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    user = User(
        name=name,
        email=email,
        avatar_color=random.choice(AVATAR_COLORS),
        password_hash=hash_password(password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:  # two signups with the same email at the same moment
        db.rollback()
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    db.refresh(user)
    return user


def login(db: Session, email: str, password: str) -> User:
    user = db.query(User).filter(User.email == email.strip().lower()).first()
    # Same message for unknown email and wrong password, so emails can't be probed.
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return user


def get_default_user(db: Session) -> User:
    user = db.query(User).filter(User.email == DEFAULT_USER_EMAIL).first()
    if not user:
        raise HTTPException(status_code=500, detail="No default user seeded")
    return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """FastAPI dependency. With a valid "Authorization: Bearer <token>" header: that user.
    With no token: the seeded default user, so the app works logged out. Bad token: 401."""
    if credentials is None:
        return get_default_user(db)

    invalid = HTTPException(
        status_code=401,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[TOKEN_ALGORITHM])
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise invalid
    user = db.get(User, user_id)
    if not user:
        raise invalid
    return user
