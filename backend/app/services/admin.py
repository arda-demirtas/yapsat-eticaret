from sqlalchemy.orm import Session
from app.repositories.order import OrderRepository
from app.repositories.user import UserRepository
from app.repositories.product import ProductRepository
from app.models.order import Order, OrderStatus
from typing import List, Any

class AdminDashboardService:
    """Service class for Admin dashboard reports and system-wide order state overrides."""
    
    def __init__(self, db: Session):
        self.order_repo = OrderRepository(db)
        self.user_repo = UserRepository(db)
        self.product_repo = ProductRepository(db)
        self.db = db

    def get_dashboard_stats(self) -> dict:
        """Rolls up statistics widgets and categories ciro summaries for the admin dashboard."""
        return {
            "total_sales": self.order_repo.get_total_sales(),
            "total_orders": self.order_repo.get_orders_count(),
            "total_users": self.user_repo.get_total_users_count(),
            "total_products": self.product_repo.get_total_products_count(),
            "sales_by_category": self.order_repo.get_sales_by_category()
        }

    def list_orders(self, status: OrderStatus | None = None, skip: int = 0, limit: int = 100) -> List[Order]:
        """Lists system-wide orders with status filter support and offset/limit pagination."""
        return self.order_repo.get_all_orders_paginated(status, skip, limit)

    def update_order_status(self, order_id: Any, new_status: OrderStatus) -> Order:
        """
        Updates order status system-wide.
        Handles inventory adjustments when overriding state from PENDING to PAID or PENDING to CANCELLED.
        """
        order = self.order_repo.get_by_id(order_id)
        if not order:
            raise ValueError("Sipariş bulunamadı.")

        old_status = order.status
        if old_status == new_status:
            return order

        # Transition overrides
        if old_status == OrderStatus.PENDING:
            if new_status == OrderStatus.PAID:
                # Permanent stock reduction
                for item in order.items:
                    product = item.product
                    if product.stock < item.quantity:
                        raise ValueError(f"Stok yetersiz: '{product.name}' (Mevcut stok: {product.stock})")
                    product.stock = product.stock - item.quantity
                    self.db.add(product)
                order.reserved_until = None
            elif new_status == OrderStatus.CANCELLED:
                # Release stock reservation
                order.reserved_until = None

        updated_order = self.order_repo.update_status(order, new_status)
        self.db.commit()
        return updated_order
