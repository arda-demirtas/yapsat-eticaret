from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID
from typing import List

class ProductImageResponse(BaseModel):
    """Schema representing a product image in response payload."""
    id: UUID
    url: str
    thumbnail_url: str

    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    """Base fields shared by all Product schemas."""
    name: str = Field(..., min_length=1, max_length=255)
    slug: str | None = Field(None, max_length=255, description="URL-friendly identifier. Generated if not provided.")
    sku: str | None = Field(None, max_length=100, description="Unique stock keeping unit code.")
    description: str | None = Field(None, max_length=2000)
    price: float = Field(..., gt=0.0, description="Price must be greater than zero.")
    brand: str | None = Field(None, max_length=100)
    stock: int = Field(0, ge=0, description="Stock cannot be negative.")
    is_archived: bool = False
    
    # SEO fields
    seo_title: str | None = Field(None, max_length=255)
    seo_description: str | None = Field(None, max_length=550)

class ProductCreate(ProductBase):
    """Schema for creating a new product."""
    category_id: UUID | None = None

class ProductUpdate(BaseModel):
    """Schema for updating a product. All fields are optional."""
    category_id: UUID | None = None
    name: str | None = Field(None, min_length=1, max_length=255)
    slug: str | None = Field(None, max_length=255)
    sku: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = Field(None, max_length=2000)
    price: float | None = Field(None, gt=0.0)
    brand: str | None = Field(None, max_length=100)
    stock: int | None = Field(None, ge=0)
    is_archived: bool | None = None
    seo_title: str | None = Field(None, max_length=255)
    seo_description: str | None = Field(None, max_length=550)

class ProductResponse(ProductBase):
    """Schema for product detail and listing responses, containing image objects."""
    id: UUID
    category_id: UUID | None
    store_id: UUID | None = None
    created_at: datetime
    updated_at: datetime
    images: List[ProductImageResponse] = []

    class Config:
        from_attributes = True
