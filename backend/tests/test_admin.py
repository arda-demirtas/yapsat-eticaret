import uuid
from fastapi.testclient import TestClient
from app.core.config import settings
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.category import Category
from app.models.address import Address
from app.models.order import Order, OrderStatus

def test_admin_dashboard_and_controls(client: TestClient, db) -> None:
    """Tests admin statistics widgets, category reports, order history, and manual override status updates."""
    # 1. Register and login normal Customer
    cust_data = {
        "email": "customer_admin_test@example.com",
        "password": "customerpassword",
        "first_name": "Alice",
        "last_name": "Green"
    }
    client.post(f"{settings.API_V1_STR}/auth/register", json=cust_data)
    
    login_response = client.post(f"{settings.API_V1_STR}/auth/login", json={
        "email": "customer_admin_test@example.com",
        "password": "customerpassword"
    })
    token = login_response.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Register and promote Admin user
    admin_data = {
        "email": "admin_test@example.com",
        "password": "adminpassword",
        "first_name": "Super",
        "last_name": "Admin"
    }
    client.post(f"{settings.API_V1_STR}/auth/register", json=admin_data)
    admin_user = db.query(User).filter(User.email == "admin_test@example.com").first()
    admin_user.role = UserRole.ADMIN
    db.commit()

    admin_login = client.post(f"{settings.API_V1_STR}/auth/login", json={
        "email": "admin_test@example.com",
        "password": "adminpassword"
    })
    admin_token = admin_login.json()["data"]["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 3. Verify normal customer is rejected from admin endpoints (403 Forbidden)
    response_stats_fail = client.get(f"{settings.API_V1_STR}/admin/stats", headers=headers)
    assert response_stats_fail.status_code == 403

    # 4. Verify admin can successfully access statistics (returns 200)
    response_stats_ok = client.get(f"{settings.API_V1_STR}/admin/stats", headers=admin_headers)
    assert response_stats_ok.status_code == 200
    stats = response_stats_ok.json()["data"]
    assert "total_sales" in stats
    assert "total_orders" in stats
    assert "total_users" in stats
    assert "total_products" in stats
    assert "sales_by_category" in stats

    # 5. Create a Category, Product, Address, and place a PENDING order
    user = db.query(User).filter(User.email == "customer_admin_test@example.com").first()
    
    address = Address(
        user_id=user.id,
        title="Ofis",
        full_name="Alice Green",
        street_address="Kanyon Levent",
        city="Istanbul",
        state="Besiktas",
        postal_code="34394",
        phone_number="5559876543"
    )
    db.add(address)
    db.commit()

    category = Category(name="Elektronik", slug="elektronik")
    db.add(category)
    db.commit()
    
    product = Product(
        category_id=category.id,
        name="Laptop",
        slug="laptop",
        sku="LPT-001",
        price=1000.0,
        stock=10,
        is_archived=False
    )
    db.add(product)
    db.commit()

    # Add 2 Laptops to Cart
    client.post(f"{settings.API_V1_STR}/cart/add", json={
        "product_id": str(product.id),
        "quantity": 2
    }, headers=headers)

    # Place Order (creating PENDING order with stock reservation)
    response_order = client.post(f"{settings.API_V1_STR}/orders/create", json={
        "shipping_address_id": str(address.id)
    }, headers=headers)
    order = response_order.json()["data"]
    assert order["status"] == OrderStatus.PENDING

    # 6. Admin lists system-wide orders
    response_orders_list = client.get(f"{settings.API_V1_STR}/admin/orders", headers=admin_headers)
    assert response_orders_list.status_code == 200
    assert len(response_orders_list.json()["data"]) >= 1

    # 7. Admin manually updates order status to PAID
    response_status_update = client.put(
        f"{settings.API_V1_STR}/admin/orders/{order['id']}/status",
        json={"status": "paid"},
        headers=admin_headers
    )
    assert response_status_update.status_code == 200
    updated_order = response_status_update.json()["data"]
    assert updated_order["status"] == OrderStatus.PAID

    # 8. Verify post-manual-paid inventory and reservation states
    # Stock must be permanently reduced from 10 to 8
    product_db = db.query(Product).filter(Product.id == product.id).first()
    assert product_db.stock == 8

    # Reservation date must be cleared
    order_db = db.query(Order).filter(Order.id == uuid.UUID(order["id"])).first()
    assert order_db.reserved_until is None

    # 9. Verify stats now includes the manual ciro value
    response_stats_updated = client.get(f"{settings.API_V1_STR}/admin/stats", headers=admin_headers)
    stats_updated = response_stats_updated.json()["data"]
    assert stats_updated["total_sales"] >= 2000.0  # 2 Laptops * 1000 TL = 2000 TL
