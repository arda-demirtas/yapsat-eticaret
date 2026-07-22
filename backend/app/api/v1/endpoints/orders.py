from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.schemas.order import OrderCreate, OrderResponse
from app.services.order import OrderService
from app.models.user import User
from uuid import UUID
from typing import List

router = APIRouter()

@router.post("/create")
def create_order(
    order_in: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """Creates a PENDING order using items in user's cart, locking stock reservations."""
    try:
        order = OrderService(db).create_order_from_cart(
            user_id=current_user.id,
            shipping_address_id=order_in.shipping_address_id,
            coupon_code=order_in.coupon_code
        )
        return {
            "success": True,
            "data": OrderResponse.model_validate(order)
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/")
def list_my_orders(
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """Lists order history of the authenticated user supporting offset/limit pagination."""
    orders = OrderService(db).get_orders(current_user.id, skip=skip, limit=limit)
    return {
        "success": True,
        "data": [OrderResponse.model_validate(o) for o in orders]
    }

@router.get("/{order_id}")
def read_order_detail(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """Retrieves detailed order information by ID."""
    try:
        order = OrderService(db).get_order_by_id(current_user.id, order_id)
        return {
            "success": True,
            "data": OrderResponse.model_validate(order)
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.post("/{order_id}/cancel")
def cancel_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """Cancels a PENDING order, freeing reserved stock."""
    try:
        order = OrderService(db).cancel_pending_order(current_user.id, order_id)
        return {
            "success": True,
            "data": OrderResponse.model_validate(order)
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
