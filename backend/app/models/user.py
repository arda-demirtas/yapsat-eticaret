import enum
from typing import List
from sqlalchemy import String, Boolean, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class UserRole(str, enum.Enum):
    """Supported roles in the system."""
    GUEST = "guest"
    CUSTOMER = "customer"
    VENDOR = "vendor"
    ADMIN = "admin"

class User(Base):
    """
    SQLAlchemy model representing a User in the system.
    Inherits UUID primary key, timestamps, and soft-delete columns from Base.
    """
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    role: Mapped[UserRole] = mapped_column(
        SQLEnum(UserRole),
        default=UserRole.CUSTOMER,
        nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationship to user addresses
    addresses: Mapped[List["Address"]] = relationship(
        "Address",
        back_populates="user",
        cascade="all, delete-orphan"
    )
