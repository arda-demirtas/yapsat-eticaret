from fastapi.testclient import TestClient
from app.core.config import settings
from app.models.user import User
from app.models.product import Product
from app.models.category import Category
from app.models.address import Address
from app.models.order import Order, OrderStatus
import uuid
from datetime import datetime, timedelta

def test_order_and_payment_lifecycle(client: TestClient, db) -> None:
    """Tests order placement, stock reservation constraints, mock charge, stock deduction, and expiration."""
    # 1. Register and login customer
    cust_data = {
        "email": "customer3@example.com",
        "password": "customerpassword",
        "first_name": "Bob",
        "last_name": "Smith"
    }
    client.post(f"{settings.API_V1_STR}/auth/register", json=cust_data)
    
    login_response = client.post(f"{settings.API_V1_STR}/auth/login", json={
        "email": "customer3@example.com",
        "password": "customerpassword"
    })
    token = login_response.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Setup Address, Category, and Product directly in DB
    user = db.query(User).filter(User.email == "customer3@example.com").first()
    
    address = Address(
        user_id=user.id,
        title="Ev",
        full_name="Bob Smith",
        street_address="Moda Kadıköy",
        city="Istanbul",
        state="Kadıköy",
        postal_code="34710",
        phone_number="5551234567"
    )
    db.add(address)
    db.commit()

    category = Category(name="Müzik", slug="muzik")
    db.add(category)
    db.commit()
    
    product = Product(
        category_id=category.id,
        name="Gitar",
        slug="gitar",
        sku="GTR-001",
        price=500.0,
        stock=5,
        is_archived=False
    )
    db.add(product)
    db.commit()

    # 3. Add 3 Gitars to Cart
    client.post(f"{settings.API_V1_STR}/cart/add", json={
        "product_id": str(product.id),
        "quantity": 3
    }, headers=headers)

    # 4. Create Order (Checkout)
    response = client.post(f"{settings.API_V1_STR}/orders/create", json={
        "shipping_address_id": str(address.id)
    }, headers=headers)
    assert response.status_code == 200
    order = response.json()["data"]
    assert order["status"] == OrderStatus.PENDING
    assert order["grand_total"] == 1500.0  # Net total 1500 >= 100 limit, so free shipping!
    assert order["reserved_until"] is not None

    # 5. Stock Reservation Lock Check:
    # 3 Gitars are reserved. Available stock is 5 - 3 = 2.
    # Try adding 3 Gitars to cart again and placing order (should fail due to stock lock)
    client.post(f"{settings.API_V1_STR}/cart/add", json={
        "product_id": str(product.id),
        "quantity": 3
    }, headers=headers) # Cart now has 3
    
    # Try checking out again
    response_fail = client.post(f"{settings.API_V1_STR}/orders/create", json={
        "shipping_address_id": str(address.id)
    }, headers=headers)
    assert response_fail.status_code == 400
    assert "yeterli stok bulunmuyor" in response_fail.json()["message"]

    # 6. Clear user cart to remove failed items
    client.delete(f"{settings.API_V1_STR}/cart/items/{str(product.id)}", headers=headers)

    # 7. Mock Payment - Fail scenario (Invalid card)
    response_pay_fail = client.post(f"{settings.API_V1_STR}/payments/charge", json={
        "order_id": order["id"],
        "card_holder": "Bob Smith",
        "card_number": "5111222233334444",  # Starts with 5, fails
        "cvc": "123"
    }, headers=headers)
    assert response_pay_fail.status_code == 400
    assert "Ödeme başarısız" in response_pay_fail.json()["message"]

    # 8. Mock Payment - Success scenario (Valid card)
    response_pay_success = client.post(f"{settings.API_V1_STR}/payments/charge", json={
        "order_id": order["id"],
        "card_holder": "Bob Smith",
        "card_number": "4000111122223333",  # Starts with 4000, succeeds
        "cvc": "123"
    }, headers=headers)
    assert response_pay_success.status_code == 200
    assert response_pay_success.json()["data"]["transaction_id"] is not None

    # 9. Verify post-payment states:
    # Order status must be paid
    order_db = db.query(Order).filter(Order.id == uuid.UUID(order["id"])).first()
    assert order_db.status == OrderStatus.PAID
    assert order_db.reserved_until is None

    # Product stock must be permanently reduced: 5 - 3 = 2
    product_db = db.query(Product).filter(Product.id == product.id).first()
    assert product_db.stock == 2

    # Cart must be cleared
    cart_items = client.get(f"{settings.API_V1_STR}/cart/", headers=headers).json()["data"]
    assert len(cart_items) == 0

    # 10. Test Expiry auto-cancellation
    # Setup another product and cart
    product2 = Product(
        category_id=category.id,
        name="Keman",
        slug="keman",
        sku="KMN-001",
        price=300.0,
        stock=2,
        is_archived=False
    )
    db.add(product2)
    db.commit()

    client.post(f"{settings.API_V1_STR}/cart/add", json={
        "product_id": str(product2.id),
        "quantity": 1
    }, headers=headers)

    response_order2 = client.post(f"{settings.API_V1_STR}/orders/create", json={
        "shipping_address_id": str(address.id)
    }, headers=headers)
    order2 = response_order2.json()["data"]

    # Manually backdate reserved_until to simulate expiration
    order2_db = db.query(Order).filter(Order.id == uuid.UUID(order2["id"])).first()
    order2_db.reserved_until = datetime.utcnow() - timedelta(minutes=1)
    db.commit()

    # Try charging the expired order (should trigger auto-cancellation and fail)
    response_pay_expired = client.post(f"{settings.API_V1_STR}/payments/charge", json={
        "order_id": order2["id"],
        "card_holder": "Bob Smith",
        "card_number": "4000111122223333",
        "cvc": "123"
    }, headers=headers)
    assert response_pay_expired.status_code == 400
    assert "15 dakika" in response_pay_expired.json()["message"]

    # Verify status changed to cancelled in DB
    db.refresh(order2_db)
    assert order2_db.status == OrderStatus.CANCELLED
