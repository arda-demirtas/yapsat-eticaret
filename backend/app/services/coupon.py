from sqlalchemy.orm import Session
from app.repositories.coupon import CouponRepository
from app.schemas.coupon import CouponCreate
from app.models.coupon import Coupon
from typing import List, Any
from datetime import datetime

class CouponService:
    """Service class encapsulating Coupon business logic."""
    
    def __init__(self, db: Session):
        self.coupon_repo = CouponRepository(db)

    def validate_coupon(self, code: str, cart_total: float) -> Coupon:
        """
        Validates coupon usability against active status, expiry, and minimum purchase amount.
        Returns the coupon object if valid, raises ValueError otherwise.
        """
        coupon = self.coupon_repo.get_by_code(code)
        if not coupon:
            raise ValueError("Geçersiz kupon kodu.")

        if not coupon.is_active:
            raise ValueError("Bu kupon artık aktif değil.")

        if coupon.expiry_date < datetime.utcnow():
            raise ValueError("Bu kuponun kullanım tarihi geçmiş.")

        if cart_total < coupon.min_purchase_amount:
            raise ValueError(
                f"Bu kuponu kullanabilmek için minimum sepet tutarı {coupon.min_purchase_amount} TL olmalıdır."
            )

        return coupon

    def create_coupon(self, obj_in: CouponCreate) -> Coupon:
        """Creates a coupon, verifying code uniqueness."""
        existing = self.coupon_repo.get_by_code(obj_in.code)
        if existing:
            raise ValueError(f"Kupon kodu '{obj_in.code}' zaten mevcut.")
        return self.coupon_repo.create(obj_in)

    def get_coupons(self, show_all: bool = False) -> List[Coupon]:
        """Lists active coupons (or all active/inactive coupons if show_all is true)."""
        return self.coupon_repo.get_multi(show_all=show_all)

    def delete_coupon(self, coupon_id: Any) -> Coupon:
        """Soft-deletes a coupon by ID."""
        coupon = self.coupon_repo.get_by_id(coupon_id)
        if not coupon:
            raise ValueError("Kupon bulunamadı.")
        return self.coupon_repo.remove(coupon)
