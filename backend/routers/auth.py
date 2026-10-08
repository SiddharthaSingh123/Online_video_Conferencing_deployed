from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas.auth import AuthOut, LoginRequest, SignupRequest
from schemas.user import UserOut
from services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=AuthOut, status_code=201)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    user = auth_service.signup(db, payload.name, payload.email, payload.password)
    return AuthOut(token=auth_service.create_token(user), user=user)


@router.post("/login", response_model=AuthOut)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = auth_service.login(db, payload.email, payload.password)
    return AuthOut(token=auth_service.create_token(user), user=user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(auth_service.get_current_user)):
    """The logged-in user, or the default user when no token is sent."""
    return user
