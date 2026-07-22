import uuid
from sqlalchemy import String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class ProductImage(Base):
    """
    SQLAlchemy model representing a Product Image.
    Inherits UUID primary key, timestamps, and soft-delete columns from Base.
    """
    __tablename__ = "product_images"

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    thumbnail_url: Mapped[str] = mapped_column(String(500), nullable=False)
    public_id: Mapped[str | None] = mapped_column(String(255), nullable=True)  # Cloudinary public ID for deletion

    # Relationship back to the product
    product: Mapped["Product"] = relationship("Product", back_populates="images")
