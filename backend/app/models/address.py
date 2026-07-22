import uuid
from sqlalchemy import String, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class Address(Base):
    """
    SQLAlchemy model representing a customer shipping/billing Address.
    Inherits UUID primary key, timestamps, and soft-delete columns from Base.
    """
    __tablename__ = "addresses"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    title: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., "Home", "Office"
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone_number: Mapped[str] = mapped_column(String(20), nullable=False)
    street_address: Mapped[str] = mapped_column(String(255), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    postal_code: Mapped[str] = mapped_column(String(20), nullable=False)
    country: Mapped[str] = mapped_column(String(100), default="United States", nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationship back to the user owning the address
    user: Mapped["User"] = relationship("User", back_populates="addresses")
