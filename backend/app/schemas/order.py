from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import List
from app.models.order import OrderStatus
from app.schemas.product import ProductResponse

class OrderItemResponse(BaseModel):
    """Schema representing an item within an Order response."""
    id: UUID
    product_id: UUID
    quantity: int
    price: float
    product: ProductResponse

    class Config:
        from_attributes = True

class OrderBase(BaseModel):
    """Base fields shared by all Order schemas."""
    status: OrderStatus
    subtotal: float
    discount: float
    shipping_fee: float
    grand_total: float
    coupon_code: str | None = None
    reserved_until: datetime | None = None

class OrderCreate(BaseModel):
    """Schema for placing a new order from cart."""
    shipping_address_id: UUID
    coupon_code: str | None = None

class OrderResponse(OrderBase):
    """Response schema for order details, listing items."""
    id: UUID
    shipping_address_id: UUID
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemResponse]

    class Config:
        from_attributes = True
