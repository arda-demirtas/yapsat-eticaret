from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.schemas.cart import CartItemCreate, CartItemUpdate, CartItemResponse
from app.services.cart import CartService
from app.models.user import User
from uuid import UUID
from typing import List, Any
from pydantic import BaseModel, Field

router = APIRouter()

class GuestCartItem(BaseModel):
    """Schema representing a single item in guest localStorage cart."""
    product_id: UUID
    quantity: int = Field(..., ge=1)

@router.get("/")
def get_user_cart(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """Lists all items in the authenticated user's cart (prices refreshed from DB)."""
    cart_items = CartService(db).get_cart(current_user.id)
    return {
        "success": True,
        "data": [CartItemResponse.model_validate(item) for item in cart_items]
    }

@router.post("/add")
def add_item_to_cart(
    item_in: CartItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """Adds a product to the user's cart, verifying stock availability."""
    try:
        cart_item = CartService(db).add_to_cart(
            user_id=current_user.id,
            product_id=item_in.product_id,
            quantity=item_in.quantity
        )
        return {
            "success": True,
            "data": CartItemResponse.model_validate(cart_item)
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/items/{cart_item_id}")
def update_item_quantity(
    cart_item_id: UUID,
    item_in: CartItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """Updates quantity of a product in the cart, checking stock."""
    try:
        cart_item = CartService(db).update_cart_item(
            user_id=current_user.id,
            cart_item_id=cart_item_id,
            quantity=item_in.quantity
        )
        return {
            "success": True,
            "data": CartItemResponse.model_validate(cart_item)
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/items/{cart_item_id}")
def remove_item(
    cart_item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """Removes an item from the cart."""
    try:
        CartService(db).remove_from_cart(current_user.id, cart_item_id)
        return {
            "success": True,
            "data": {"message": "Item removed from cart"}
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/merge")
def merge_guest_cart(
    guest_items: List[GuestCartItem],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """Merges guest localStorage cart items into database cart on user login."""
    try:
        # Convert Pydantic schemas list to list of dicts for service
        items_dict = [{"product_id": x.product_id, "quantity": x.quantity} for x in guest_items]
        merged_cart = CartService(db).merge_carts(current_user.id, items_dict)
        return {
            "success": True,
            "data": [CartItemResponse.model_validate(item) for item in merged_cart]
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
