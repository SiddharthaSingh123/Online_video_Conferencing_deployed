from pydantic import BaseModel

from .user import UserOut


# Plain strings: the auth service validates them so errors come back as readable messages.
class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthOut(BaseModel):
    token: str
    user: UserOut
