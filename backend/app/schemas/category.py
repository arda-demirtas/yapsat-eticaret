from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID

class CategoryBase(BaseModel):
    """Base fields shared by all Category schemas."""
    name: str = Field(..., min_length=1, max_length=100)
    slug: str | None = Field(None, max_length=100, description="URL friendly identifier. Generated if not provided.")

class CategoryCreate(CategoryBase):
    """Schema for creating a new Category."""
    pass

class CategoryUpdate(BaseModel):
    """Schema for updating a Category."""
    name: str | None = Field(None, min_length=1, max_length=100)
    slug: str | None = Field(None, max_length=100)

class CategoryResponse(BaseModel):
    """Schema for Category responses."""
    id: UUID
    name: str
    slug: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
