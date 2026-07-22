from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List
from app.db.base import Base

class Category(Base):
    """
    SQLAlchemy model representing a Product Category.
    Inherits UUID primary key, timestamps, and soft-delete columns from Base.
    """
    __tablename__ = "categories"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)

    # Relationship to products under this category
    products: Mapped[List["Product"]] = relationship(
        "Product",
        back_populates="category",
        cascade="all, delete-orphan"
    )
