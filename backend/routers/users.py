from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas.user import UserOut

router = APIRouter(prefix="/users", tags=["users"])


# No auth: the single seeded user is always the "logged in" user.
@router.get("/me", response_model=UserOut)
def get_current_user(db: Session = Depends(get_db)):
    user = db.query(User).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
