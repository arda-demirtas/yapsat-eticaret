from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID

class AddressBase(BaseModel):
    """Base fields shared by all Address schemas."""
    title: str = Field(..., max_length=50, description="Name for the address, e.g., 'Home', 'Office'")
    full_name: str = Field(..., max_length=100)
    phone_number: str = Field(..., max_length=20)
    street_address: str = Field(..., max_length=255)
    city: str = Field(..., max_length=100)
    state: str | None = Field(None, max_length=100)
    postal_code: str = Field(..., max_length=20)
    country: str = Field("United States", max_length=100)
    is_default: bool = False

class AddressCreate(AddressBase):
    """Schema for creating a new address."""
    pass

class AddressUpdate(BaseModel):
    """Schema for updating an existing address. All fields are optional."""
    title: str | None = Field(None, max_length=50)
    full_name: str | None = Field(None, max_length=100)
    phone_number: str | None = Field(None, max_length=20)
    street_address: str | None = Field(None, max_length=255)
    city: str | None = Field(None, max_length=100)
    state: str | None = Field(None, max_length=100)
    postal_code: str | None = Field(None, max_length=20)
    country: str | None = Field(None, max_length=100)
    is_default: bool | None = None

class AddressResponse(AddressBase):
    """Schema for address API responses."""
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
