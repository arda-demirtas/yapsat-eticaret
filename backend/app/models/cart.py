import uuid
from sqlalchemy import Integer, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class CartItem(Base):
    """
    SQLAlchemy model representing an item in a user's shopping cart.
    Enforces a unique constraint on (user_id, product_id) so products are not duplicated.
    """
    __tablename__ = "cart_items"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User")
    product: Mapped["Product"] = relationship("Product")

    # Table arguments for uniqueness
    __table_args__ = (
        UniqueConstraint("user_id", "product_id", name="uq_cart_user_product"),
    )
