import uuid
from sqlalchemy import String, Float, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class Payment(Base):
    """
    SQLAlchemy model representing a Payment transaction.
    Stores gateway provider details, unique transaction IDs, verification signature, and raw payloads.
    """
    __tablename__ = "payments"

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    transaction_id: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)  # success, failed
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    signature: Mapped[str | None] = mapped_column(String(255), nullable=True)  # Verification hash
    raw_payload: Mapped[str | None] = mapped_column(Text, nullable=True)  # Gateway JSON logs

    # Relationships
    order: Mapped["Order"] = relationship("Order")
