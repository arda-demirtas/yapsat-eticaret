from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from uuid import UUID
from app.models.coupon import DiscountType

class CouponBase(BaseModel):
    """Base fields shared by all Coupon schemas."""
    code: str = Field(..., min_length=1, max_length=50)
    discount_type: DiscountType
    value: float = Field(..., gt=0.0, description="Discount value must be greater than zero.")
    min_purchase_amount: float = Field(0.0, ge=0.0, description="Minimum purchase amount cannot be negative.")
    expiry_date: datetime
    is_active: bool = True

    @field_validator("code")
    @classmethod
    def code_uppercase(cls, v: str) -> str:
        """Forces all coupon codes to be stored/processed in uppercase."""
        return v.strip().upper()

class CouponCreate(CouponBase):
    """Schema for creating a new Coupon."""
    pass

class CouponUpdate(BaseModel):
    """Schema for updating a Coupon."""
    is_active: bool | None = None
    expiry_date: datetime | None = None

class CouponResponse(CouponBase):
    """Response schema for Coupon endpoints."""
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
