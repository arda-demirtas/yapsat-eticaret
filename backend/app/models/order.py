import uuid
import enum
from sqlalchemy import String, Float, ForeignKey, DateTime, Enum, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List
from datetime import datetime
from app.db.base import Base

class OrderStatus(str, enum.Enum):
    """Possible status states of an Order."""
    PENDING = "pending"
    PAID = "paid"
    CANCELLED = "cancelled"
    SHIPPED = "shipped"
    COMPLETED = "completed"

class Order(Base):
    """
    SQLAlchemy model representing a Customer Order.
    Tracks pricing totals, shipping address, coupon codes, and stock reservation expiry.
    """
    __tablename__ = "orders"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus),
        default=OrderStatus.PENDING,
        nullable=False,
        index=True
    )
    shipping_address_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("addresses.id", ondelete="RESTRICT"),
        nullable=False
    )
    subtotal: Mapped[float] = mapped_column(Float, nullable=False)
    discount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    shipping_fee: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    grand_total: Mapped[float] = mapped_column(Float, nullable=False)
    coupon_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    reserved_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User")
    shipping_address: Mapped["Address"] = relationship("Address")
    items: Mapped[List["OrderItem"]] = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan"
    )

class OrderItem(Base):
    """
    SQLAlchemy model representing an item in an Order.
    Locks the price of the product at the moment of purchase.
    """
    __tablename__ = "order_items"

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False)  # Locked price at checkout

    # Relationships
    order: Mapped["Order"] = relationship("Order", back_populates="items")
    product: Mapped["Product"] = relationship("Product")
