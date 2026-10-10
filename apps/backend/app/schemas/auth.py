import uuid
from typing import Optional
from pydantic import BaseModel, EmailStr
from app.models.core_erp import UserRole


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: str  # user_id
    email: str
    role: UserRole
    school_id: Optional[str] = None
    branch_id: Optional[str] = None
    full_name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: UserRole
    school_id: Optional[uuid.UUID] = None
    branch_id: Optional[uuid.UUID] = None
    is_active: bool

    class Config:
        from_attributes = True
