from fastapi.testclient import TestClient
from app.core.config import settings
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.category import Category
from datetime import datetime, timedelta

def test_cart_and_coupon_flow(client: TestClient, db) -> None:
    """Tests cart operations, stock capping on guest merge, admin coupons creation, and validations."""
    # 1. Register and login a Customer user
    cust_data = {
        "email": "customer@example.com",
        "password": "customerpassword",
        "first_name": "John",
        "last_name": "Doe"
    }
    client.post(f"{settings.API_V1_STR}/auth/register", json=cust_data)
    
    login_response = client.post(f"{settings.API_V1_STR}/auth/login", json={
        "email": "customer@example.com",
        "password": "customerpassword"
    })
    token = login_response.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Setup category and product directly in DB for testing
    category = Category(name="Test Category", slug="test-category")
    db.add(category)
    db.commit()
    
    product = Product(
        category_id=category.id,
        name="Test Phone",
        slug="test-phone",
        sku="PHONE-001",
        price=100.0,
        stock=5,
        is_archived=False
    )
    db.add(product)
    db.commit()

    # 3. Verify Guests cannot add to cart (requires auth)
    response = client.post(f"{settings.API_V1_STR}/cart/add", json={
        "product_id": str(product.id),
        "quantity": 1
    })
    assert response.status_code == 401

    # 4. Add to cart as Customer (succeeds)
    response = client.post(f"{settings.API_V1_STR}/cart/add", json={
        "product_id": str(product.id),
        "quantity": 2
    }, headers=headers)
    assert response.status_code == 200
    cart_item = response.json()["data"]
    assert cart_item["quantity"] == 2

    # 5. Try adding more than stock (2 in cart + 4 more = 6 > 5 stock, should fail)
    response = client.post(f"{settings.API_V1_STR}/cart/add", json={
        "product_id": str(product.id),
        "quantity": 4
    }, headers=headers)
    assert response.status_code == 400
    assert "stock" in response.json()["message"]

    # 6. Merge Guest Cart (localStorage simulation)
    # Guest has 1 item, user has 2. Combines to 3.
    guest_items = [
        {"product_id": str(product.id), "quantity": 1}
    ]
    response = client.post(f"{settings.API_V1_STR}/cart/merge", json=guest_items, headers=headers)
    assert response.status_code == 200
    merged_cart = response.json()["data"]
    assert len(merged_cart) == 1
    assert merged_cart[0]["quantity"] == 3

    # 7. Merge guest items exceeding stock (3 in cart + 5 more = 8 > 5 stock, should cap at 5)
    guest_items_excess = [
        {"product_id": str(product.id), "quantity": 5}
    ]
    response = client.post(f"{settings.API_V1_STR}/cart/merge", json=guest_items_excess, headers=headers)
    assert response.status_code == 200
    merged_cart_capped = response.json()["data"]
    assert merged_cart_capped[0]["quantity"] == 5

    # 8. Register and promote an Admin user
    admin_register = {
        "email": "admin2@example.com",
        "password": "adminpassword",
        "first_name": "Admin",
        "last_name": "Two"
    }
    client.post(f"{settings.API_V1_STR}/auth/register", json=admin_register)
    admin_user = db.query(User).filter(User.email == "admin2@example.com").first()
    admin_user.role = UserRole.ADMIN
    db.commit()
    
    admin_login = client.post(f"{settings.API_V1_STR}/auth/login", json={
        "email": "admin2@example.com",
        "password": "adminpassword"
    })
    admin_token = admin_login.json()["data"]["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 9. Create Coupon as Admin
    coupon_data = {
        "code": "save20",
        "discount_type": "fixed",
        "value": 20.0,
        "min_purchase_amount": 150.0,
        "expiry_date": (datetime.utcnow() + timedelta(days=2)).isoformat(),
        "is_active": True
    }
    response = client.post(f"{settings.API_V1_STR}/coupons/", json=coupon_data, headers=admin_headers)
    assert response.status_code == 200
    coupon = response.json()["data"]
    assert coupon["code"] == "SAVE20"  # Verify uppercase field validator

    # 10. Validate coupon code
    # Insufficient total (120 TL < 150 TL min purchase requirement)
    response = client.get(f"{settings.API_V1_STR}/coupons/validate?code=SAVE20&cart_total=120.0")
    assert response.status_code == 400
    assert "minimum sepet tutarı" in response.json()["message"]

    # Sufficient total (200 TL >= 150 TL, succeeds)
    response = client.get(f"{settings.API_V1_STR}/coupons/validate?code=SAVE20&cart_total=200.0")
    assert response.status_code == 200
    assert response.json()["data"]["value"] == 20.0
