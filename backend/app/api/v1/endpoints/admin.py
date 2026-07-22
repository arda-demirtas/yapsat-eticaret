from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_admin
from app.schemas.order import OrderResponse
from app.services.admin import AdminDashboardService
from app.models.order import OrderStatus
from app.models.user import User
from uuid import UUID
from pydantic import BaseModel

router = APIRouter()

class OrderStatusUpdate(BaseModel):
    """Schema for updating the status of an order by an admin."""
    status: OrderStatus

@router.get("/stats")
def get_admin_dashboard_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
) -> dict:
    """Returns aggregated sales ciro, order count, user count, product count, and sales by categories."""
    stats = AdminDashboardService(db).get_dashboard_stats()
    return {
        "success": True,
        "data": stats
    }

@router.get("/orders")
def list_system_orders(
    status_filter: OrderStatus | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
) -> dict:
    """Lists all orders in the system, supporting status filtering and pagination."""
    orders = AdminDashboardService(db).list_orders(status_filter, skip, limit)
    return {
        "success": True,
        "data": [OrderResponse.model_validate(o) for o in orders]
    }

@router.put("/orders/{order_id}/status")
def update_system_order_status(
    order_id: UUID,
    status_in: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
) -> dict:
    """Allows administrators to manually update any order's status, triggering stock reductions on paid transition."""
    try:
        order = AdminDashboardService(db).update_order_status(order_id, status_in.status)
        return {
            "success": True,
            "data": OrderResponse.model_validate(order)
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
