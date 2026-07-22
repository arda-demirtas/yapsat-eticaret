from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.order import Order, OrderItem, OrderStatus
from typing import List, Any
from datetime import datetime

class OrderRepository:
    """Repository class for DB queries on Order and OrderItem models."""
    
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, order_id: Any) -> Order | None:
        """Retrieves an order by its ID."""
        return self.db.query(Order).filter(Order.id == order_id).first()

    def get_user_orders(self, user_id: Any, skip: int = 0, limit: int = 10) -> List[Order]:
        """Retrieves all orders for a specific user, sorted newest first, with offset/limit pagination."""
        return self.db.query(Order).filter(
            Order.user_id == user_id
        ).order_by(Order.created_at.desc()).offset(skip).limit(limit).all()

    def create(
        self,
        *,
        user_id: Any,
        shipping_address_id: Any,
        subtotal: float,
        discount: float,
        shipping_fee: float,
        grand_total: float,
        coupon_code: str | None = None,
        reserved_until: datetime | None = None,
        commit: bool = True
    ) -> Order:
        """Creates a new Order in PENDING status."""
        db_obj = Order(
            user_id=user_id,
            status=OrderStatus.PENDING,
            shipping_address_id=shipping_address_id,
            subtotal=subtotal,
            discount=discount,
            shipping_fee=shipping_fee,
            grand_total=grand_total,
            coupon_code=coupon_code,
            reserved_until=reserved_until
        )
        self.db.add(db_obj)
        if commit:
            self.db.commit()
            self.db.refresh(db_obj)
        else:
            self.db.flush()
        return db_obj

    def create_item(self, *, order_id: Any, product_id: Any, quantity: int, price: float, commit: bool = True) -> OrderItem:
        """Attaches a locked-price OrderItem to an order."""
        db_obj = OrderItem(
            order_id=order_id,
            product_id=product_id,
            quantity=quantity,
            price=price
        )
        self.db.add(db_obj)
        if commit:
            self.db.commit()
            self.db.refresh(db_obj)
        else:
            self.db.flush()
        return db_obj

    def get_reserved_quantity(self, product_id: Any) -> int:
        """
        Calculates the sum of quantities for a product that are currently locked
        in active PENDING orders (where reservation date is still in the future).
        """
        now = datetime.utcnow()
        result = self.db.query(func.sum(OrderItem.quantity)).join(Order).filter(
            OrderItem.product_id == product_id,
            Order.status == OrderStatus.PENDING,
            Order.reserved_until > now
        ).scalar()
        return int(result) if result is not None else 0

    def update_status(self, order: Order, status: OrderStatus, commit: bool = True) -> Order:
        """Updates the status of an order."""
        order.status = status
        self.db.add(order)
        if commit:
            self.db.commit()
            self.db.refresh(order)
        else:
            self.db.flush()
        return order

    def release_reservation(self, order: Order, commit: bool = True) -> Order:
        """Saves order with reservation timer disabled/removed."""
        order.reserved_until = None
        self.db.add(order)
        if commit:
            self.db.commit()
            self.db.refresh(order)
        else:
            self.db.flush()
        return order

    def get_all_orders_paginated(self, status: OrderStatus | None = None, skip: int = 0, limit: int = 100) -> List[Order]:
        """Lists all orders in the system with status filters and offset/limit pagination."""
        query = self.db.query(Order)
        if status:
            query = query.filter(Order.status == status)
        return query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()

    def get_total_sales(self) -> float:
        """Calculates total revenue sum of paid, shipped, or completed orders."""
        result = self.db.query(func.sum(Order.grand_total)).filter(
            Order.status.in_([OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.COMPLETED])
        ).scalar()
        return float(result) if result is not None else 0.0

    def get_orders_count(self) -> int:
        """Calculates total count of orders in the system."""
        return self.db.query(Order).count()

    def get_sales_by_category(self) -> List[dict]:
        """Calculates total sales value and item quantities grouped by category name."""
        from app.models.category import Category
        from app.models.product import Product
        results = self.db.query(
            Category.name,
            func.sum(OrderItem.quantity * OrderItem.price),
            func.sum(OrderItem.quantity)
        ).select_from(OrderItem).join(Product).join(Category).join(Order).filter(
            Order.status.in_([OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.COMPLETED])
        ).group_by(Category.name).all()
        
        return [
            {
                "category_name": r[0],
                "sales_amount": float(r[1]) if r[1] is not None else 0.0,
                "quantity_sold": int(r[2]) if r[2] is not None else 0
            }
            for r in results
        ]
