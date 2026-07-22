from pydantic import BaseModel, Field
from uuid import UUID
from app.schemas.product import ProductResponse

class CartItemBase(BaseModel):
    """Base fields shared by all CartItem schemas."""
    product_id: UUID
    quantity: int = Field(1, ge=1, description="Quantity must be at least 1.")

class CartItemCreate(CartItemBase):
    """Schema for adding a product to the cart."""
    pass

class CartItemUpdate(BaseModel):
    """Schema for updating item quantity in the cart."""
    quantity: int = Field(..., ge=1, description="Quantity must be at least 1.")

class CartItemResponse(BaseModel):
    """Detailed response schema including product details refreshed from database."""
    id: UUID
    product_id: UUID
    quantity: int
    product: ProductResponse

    class Config:
        from_attributes = True
