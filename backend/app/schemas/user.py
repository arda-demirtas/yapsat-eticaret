from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from uuid import UUID
from app.models.user import UserRole

class UserBase(BaseModel):
    """Base fields shared by all user schemas."""
    email: EmailStr
    first_name: str | None = Field(None, max_length=100)
    last_name: str | None = Field(None, max_length=100)

class UserCreate(UserBase):
    """Schema for registering a new user (password is required)."""
    password: str = Field(..., min_length=6, max_length=100)

class UserUpdate(BaseModel):
    """Schema for updating user details."""
    first_name: str | None = Field(None, max_length=100)
    last_name: str | None = Field(None, max_length=100)
    password: str | None = Field(None, min_length=6, max_length=100)

class UserResponse(UserBase):
    """Schema for user profile API responses."""
    id: UUID
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    """Schema for logging in (email and password)."""
    email: EmailStr
    password: str

class Token(BaseModel):
    """Schema for JWT access token responses."""
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    """Schema representing the parsed token payload."""
    sub: str | None = None
