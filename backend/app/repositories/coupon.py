from sqlalchemy.orm import Session
from app.models.coupon import Coupon
from app.schemas.coupon import CouponCreate, CouponUpdate
from typing import List, Any
from datetime import datetime

class CouponRepository:
    """Repository class for DB queries on Coupon model."""
    
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, coupon_id: Any) -> Coupon | None:
        """Retrieves an active coupon by ID."""
        return self.db.query(Coupon).filter(
            Coupon.id == coupon_id,
            Coupon.deleted_at.is_(None)
        ).first()

    def get_by_code(self, code: str) -> Coupon | None:
        """Retrieves an active, non-deleted coupon by its code (uppercase matched)."""
        return self.db.query(Coupon).filter(
            Coupon.code == code.strip().upper(),
            Coupon.deleted_at.is_(None)
        ).first()

    def get_multi(self, show_all: bool = False) -> List[Coupon]:
        """Lists active coupons. If show_all is true, lists expired/inactive coupons too (excluding soft-deleted)."""
        query = self.db.query(Coupon).filter(Coupon.deleted_at.is_(None))
        if not show_all:
            query = query.filter(
                Coupon.is_active.is_(True),
                Coupon.expiry_date >= datetime.utcnow()
            )
        return query.order_by(Coupon.created_at.desc()).all()

    def create(self, obj_in: CouponCreate) -> Coupon:
        """Creates a new coupon."""
        db_obj = Coupon(
            code=obj_in.code,
            discount_type=obj_in.discount_type,
            value=obj_in.value,
            min_purchase_amount=obj_in.min_purchase_amount,
            expiry_date=obj_in.expiry_date,
            is_active=obj_in.is_active
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update(self, db_obj: Coupon, obj_in: CouponUpdate) -> Coupon:
        """Updates coupon properties."""
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def remove(self, db_obj: Coupon) -> Coupon:
        """Soft-deletes a coupon."""
        db_obj.deleted_at = datetime.utcnow()
        self.db.add(db_obj)
        self.db.commit()
        return db_obj
