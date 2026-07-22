from sqlalchemy.orm import Session
from app.repositories.order import OrderRepository
from app.services.cart import CartService
from app.services.address import AddressService
from app.services.coupon import CouponService
from app.models.order import Order, OrderStatus
from datetime import datetime, timedelta
from typing import List, Any

class OrderService:
    """Service class encapsulating Order and OrderItem business logic."""
    
    def __init__(self, db: Session):
        self.order_repo = OrderRepository(db)
        self.cart_service = CartService(db)
        self.address_service = AddressService(db)
        self.coupon_service = CouponService(db)
        self.db = db

    def get_orders(self, user_id: Any, skip: int = 0, limit: int = 10) -> List[Order]:
        """Lists all orders for a specific user supporting offset/limit pagination."""
        return self.order_repo.get_user_orders(user_id, skip=skip, limit=limit)

    def get_order_by_id(self, user_id: Any, order_id: Any) -> Order:
        """Retrieves a single order by ID, enforcing ownership."""
        order = self.order_repo.get_by_id(order_id)
        if not order or order.user_id != user_id:
            raise ValueError("Sipariş bulunamadı.")
        return order

    def create_order_from_cart(self, user_id: Any, shipping_address_id: Any, coupon_code: str | None = None) -> Order:
        """
        Builds a PENDING order from the user's cart.
        Locks pricing details, verifies stock availability (accounting for active reservations),
        calculates net shipping thresholds, and starts the 15-minute reservation window.
        """
        from app.models.product import Product

        # 1. Fetch user's cart
        cart_items = self.cart_service.get_cart(user_id)
        if not cart_items:
            raise ValueError("Sepetiniz boş. Sipariş oluşturulamaz.")

        # 2. Verify shipping address belongs to user
        address = self.address_service.get_address_by_id(user_id, shipping_address_id)
        if not address:
            raise ValueError("Geçersiz teslimat adresi.")

        # 3. Verify stock availability accounting for active reservations with pessimistic locking
        for item in cart_items:
            # Query the product with SELECT FOR UPDATE to block concurrent updates
            product = self.db.query(Product).filter(Product.id == item.product_id).with_for_update().first()
            if not product or product.deleted_at is not None:
                raise ValueError("Ürün bulunamadı.")
            if product.is_archived:
                raise ValueError(f"'{product.name}' ürünü artık satışta değil.")
                
            reserved_qty = self.order_repo.get_reserved_quantity(product.id)
            available_stock = product.stock - reserved_qty
            
            if available_stock < item.quantity:
                raise ValueError(
                    f"'{product.name}' ürünü için yeterli stok bulunmuyor. "
                    f"Kullanılabilir stok: {max(0, available_stock)} (Diğer kullanıcılar tarafından rezerve edilmiş adetler hariç)."
                )

        # 4. Calculations (Subtotal, Discount, Shipping, Grand Total)
        subtotal = sum(item.product.price * item.quantity for item in cart_items)
        discount = 0.0
        
        # Apply coupon code if provided
        if coupon_code:
            try:
                coupon = self.coupon_service.validate_coupon(coupon_code, subtotal)
                if coupon.discount_type == "percentage":
                    discount = subtotal * (coupon.value / 100.0)
                else:
                    discount = min(coupon.value, subtotal)
            except ValueError as e:
                raise ValueError(f"Kupon uygulanamadı: {str(e)}")

        net_total = subtotal - discount
        # Free shipping threshold is 100 TL after discount
        shipping_fee = 0.0 if net_total >= 100.0 else 10.0
        grand_total = net_total + shipping_fee

        # 5. Create Order record with 15 minutes reservation (do not commit yet)
        reserved_until = datetime.utcnow() + timedelta(minutes=15)
        order = self.order_repo.create(
            user_id=user_id,
            shipping_address_id=shipping_address_id,
            subtotal=subtotal,
            discount=discount,
            shipping_fee=shipping_fee,
            grand_total=grand_total,
            coupon_code=coupon_code.upper() if coupon_code else None,
            reserved_until=reserved_until,
            commit=False
        )

        # 6. Create locked price OrderItem records (do not commit yet)
        for item in cart_items:
            self.order_repo.create_item(
                order_id=order.id,
                product_id=item.product_id,
                quantity=item.quantity,
                price=item.product.price,  # Locked price at this timestamp
                commit=False
            )

        # Commit the transaction atomically
        self.db.commit()
        self.db.refresh(order)
        return order

    def cancel_pending_order(self, user_id: Any, order_id: Any) -> Order:
        """Cancels a pending order, releasing the stock reservation window."""
        order = self.get_order_by_id(user_id, order_id)
        if order.status != OrderStatus.PENDING:
            raise ValueError("Sadece ödeme bekleyen siparişler iptal edilebilir.")

        # Set status to CANCELLED and remove reservation
        self.order_repo.update_status(order, OrderStatus.CANCELLED)
        self.order_repo.release_reservation(order)
        return order
