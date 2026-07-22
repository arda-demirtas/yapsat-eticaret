import hmac
import hashlib
import uuid
from typing import Any
from sqlalchemy.orm import Session
from app.repositories.payment import PaymentRepository
from app.repositories.order import OrderRepository
from app.services.order import OrderService
from app.services.cart import CartService
from app.models.order import OrderStatus
from app.models.payment import Payment
from app.core.config import settings
from datetime import datetime

class PaymentService:
    """Service class encapsulating mock payment gateways and inventory updates."""
    
    def __init__(self, db: Session):
        self.payment_repo = PaymentRepository(db)
        self.order_repo = OrderRepository(db)
        self.order_service = OrderService(db)
        self.cart_service = CartService(db)
        self.db = db

    def process_mock_payment(
        self,
        *,
        user_id: Any,
        order_id: Any,
        card_holder: str,
        card_number: str,
        cvc: str
    ) -> Payment:
        """
        Processes a simulated payment charging request.
        Validates order status, checks reservation window, computes HMAC verification signature,
        saves payment history, decrements actual product inventory, and empties the shopping cart.
        """
        from app.models.product import Product

        # 1. Fetch order details (enforces user ownership)
        order = self.order_service.get_order_by_id(user_id, order_id)
        
        if order.status != OrderStatus.PENDING:
            raise ValueError("Bu sipariş için ödeme yapılamaz (Sipariş durumu uygun değil).")

        # 2. Check if the 15 minutes stock reservation window has expired
        if order.reserved_until and order.reserved_until < datetime.utcnow():
            # Automatically transition to CANCELLED and free the stock reservation
            self.order_repo.update_status(order, OrderStatus.CANCELLED, commit=False)
            self.order_repo.release_reservation(order, commit=False)
            self.db.commit()
            raise ValueError("Sipariş ödeme süresi (15 dakika) doldu. Siparişiniz iptal edildi.")

        # 3. Simulate payment transaction processing
        # Rule: Card numbers starting with "4000" are successful, others fail.
        if not card_number.startswith("4000"):
            raise ValueError("Ödeme başarısız. Kart bakiyesi yetersiz veya geçersiz kart bilgileri.")

        # 4. Generate security signature using HMAC-SHA256 with server SECRET_KEY
        signature_payload = f"{order.id}:{order.grand_total}"
        signature = hmac.new(
            settings.SECRET_KEY.encode(),
            signature_payload.encode(),
            hashlib.sha256
        ).hexdigest()

        # Acquire select-for-update locks on all products in this order to block concurrent checkouts
        for item in order.items:
            self.db.query(Product).filter(Product.id == item.product_id).with_for_update().first()

        # 5. Create Payment record in DB (do not commit yet)
        txn_id = f"TXN-{uuid.uuid4().hex[:12].upper()}"
        payment = self.payment_repo.create(
            order_id=order.id,
            provider="mock_payment_gateway",
            transaction_id=txn_id,
            status="success",
            amount=order.grand_total,
            signature=signature,
            raw_payload=f"{{\"card_holder\": \"{card_holder}\", \"card_number_masked\": \"{card_number[:4]}************\"}}",
            commit=False
        )

        # 6. Decrement product stock permanently from inventory
        for item in order.items:
            product = item.product
            if product.stock < item.quantity:
                raise ValueError(
                    f"Üzgünüz, ödeme alınırken '{product.name}' ürünü için stok yetersizliği tespit edildi."
                )
            # Permanent decrement
            product.stock = product.stock - item.quantity
            self.db.add(product)

        # 7. Empty user's cart in database
        self.cart_service.clear_cart(user_id)

        # 8. Mark order as PAID and release the reservation timer (do not commit yet)
        self.order_repo.update_status(order, OrderStatus.PAID, commit=False)
        self.order_repo.release_reservation(order, commit=False)

        # Commit the entire transaction atomically
        self.db.commit()
        self.db.refresh(payment)
        return payment
