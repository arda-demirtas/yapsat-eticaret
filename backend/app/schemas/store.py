from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime

class StoreBase(BaseModel):
    """Base fields shared by all Store schemas."""
    name: str = Field(..., min_length=2, max_length=100)
    description: str | None = Field(None, max_length=1000)
    logo_url: str | None = Field(None, max_length=255)

class StoreCreate(StoreBase):
    """Schema for applying/creating a new store."""
    pass

class StoreResponse(StoreBase):
    """Detailed response schema representing a Store."""
    id: UUID
    user_id: UUID
    slug: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class StoreApproval(BaseModel):
    """Schema for admin store approval state updates."""
    is_active: bool
