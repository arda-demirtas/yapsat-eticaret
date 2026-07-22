import enum
from sqlalchemy import String, Float, Boolean, DateTime, Enum
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from app.db.base import Base

class DiscountType(str, enum.Enum):
    """Types of discounts available on coupons."""
    PERCENTAGE = "percentage"
    FIXED = "fixed"

class Coupon(Base):
    """
    SQLAlchemy model representing a Discount Coupon.
    Supports fixed amount and percentage based discount validation.
    """
    __tablename__ = "coupons"

    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    discount_type: Mapped[DiscountType] = mapped_column(Enum(DiscountType), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    min_purchase_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    expiry_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
