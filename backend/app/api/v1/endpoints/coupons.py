from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_admin
from app.schemas.coupon import CouponCreate, CouponResponse
from app.services.coupon import CouponService
from uuid import UUID
from typing import Any

router = APIRouter()

@router.get("/validate")
def validate_coupon_code(
    code: str = Query(..., description="Kupon kodu"),
    cart_total: float = Query(..., ge=0.0, description="Sepet alt toplamı"),
    db: Session = Depends(get_db)
) -> dict:
    """Validates coupon code, verifying expiry and min purchase requirement. Returns coupon info."""
    try:
        coupon = CouponService(db).validate_coupon(code, cart_total)
        return {
            "success": True,
            "data": CouponResponse.model_validate(coupon)
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/")
def create_coupon(
    coupon_in: CouponCreate,
    db: Session = Depends(get_db),
    current_admin: Any = Depends(get_current_admin)
) -> dict:
    """Creates a new coupon. Restricted to Administrators."""
    try:
        coupon = CouponService(db).create_coupon(coupon_in)
        return {
            "success": True,
            "data": CouponResponse.model_validate(coupon)
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/")
def list_coupons(
    show_all: bool = Query(False, description="Tüm kuponları göster (aktif olmayanlar dahil)"),
    db: Session = Depends(get_db),
    current_admin: Any = Depends(get_current_admin)
) -> dict:
    """Lists all coupons. Restricted to Administrators."""
    coupons = CouponService(db).get_coupons(show_all=show_all)
    return {
        "success": True,
        "data": [CouponResponse.model_validate(c) for c in coupons]
    }

@router.delete("/{coupon_id}")
def delete_coupon(
    coupon_id: UUID,
    db: Session = Depends(get_db),
    current_admin: Any = Depends(get_current_admin)
) -> dict:
    """Soft-deletes a coupon. Restricted to Administrators."""
    try:
        CouponService(db).delete_coupon(coupon_id)
        return {
            "success": True,
            "data": {"message": "Coupon deleted successfully"}
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
