import uuid
from sqlalchemy import String, Float, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List
from app.db.base import Base

class Product(Base):
    """
    SQLAlchemy model representing a Product.
    Inherits UUID primary key, timestamps, and soft-delete columns from Base.
    """
    __tablename__ = "products"

    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    store_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("stores.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    sku: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    brand: Mapped[str | None] = mapped_column(String(100), nullable=True)
    stock: Mapped[int] = mapped_column(default=0, nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # SEO fields
    seo_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    seo_description: Mapped[str | None] = mapped_column(String(550), nullable=True)

    # Relationships
    category: Mapped["Category"] = relationship("Category", back_populates="products")
    store: Mapped["Store | None"] = relationship("Store")
    images: Mapped[List["ProductImage"]] = relationship(
        "ProductImage",
        back_populates="product",
        cascade="all, delete-orphan"
    )
