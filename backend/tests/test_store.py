import uuid
from fastapi.testclient import TestClient
from app.core.config import settings
from app.models.user import User, UserRole
from app.models.store import Store
from app.models.product import Product
from app.models.category import Category

def test_store_and_vendor_flow(client: TestClient, db) -> None:
    """Tests store application, admin approvals role elevation, vendor dashboard stats, and scoped product CRUD."""
    # 1. Register and login Customer B
    cust_data = {
        "email": "customer_b@example.com",
        "password": "customerpassword",
        "first_name": "Bob",
        "last_name": "Vendor"
    }
    client.post(f"{settings.API_V1_STR}/auth/register", json=cust_data)
    
    login_response = client.post(f"{settings.API_V1_STR}/auth/login", json={
        "email": "customer_b@example.com",
        "password": "customerpassword"
    })
    token = login_response.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Register and login Admin
    admin_data = {
        "email": "admin_store_test@example.com",
        "password": "adminpassword",
        "first_name": "Admin",
        "last_name": "Store"
    }
    client.post(f"{settings.API_V1_STR}/auth/register", json=admin_data)
    admin_user = db.query(User).filter(User.email == "admin_store_test@example.com").first()
    admin_user.role = UserRole.ADMIN
    db.commit()

    admin_login = client.post(f"{settings.API_V1_STR}/auth/login", json={
        "email": "admin_store_test@example.com",
        "password": "adminpassword"
    })
    admin_token = admin_login.json()["data"]["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 3. Apply for Store (returns active=False)
    response_apply = client.post(f"{settings.API_V1_STR}/stores/apply", json={
        "name": "Bob Gadgets",
        "description": "Premium tech accessories"
    }, headers=headers)
    assert response_apply.status_code == 200
    store = response_apply.json()["data"]
    assert store["is_active"] is False
    assert store["slug"] == "bob-gadgets"

    # 4. Try applying again (should fail)
    response_apply_fail = client.post(f"{settings.API_V1_STR}/stores/apply", json={
        "name": "Bob Gadgets Second",
        "description": "Tech stuff"
    }, headers=headers)
    assert response_apply_fail.status_code == 400
    assert "başvurunuz veya aktif" in response_apply_fail.json()["message"]

    # 5. Approve Store by Admin (active becomes True)
    response_approve = client.put(
        f"{settings.API_V1_STR}/stores/admin/{store['id']}/approve",
        json={"is_active": True},
        headers=admin_headers
    )
    assert response_approve.status_code == 200
    assert response_approve.json()["data"]["is_active"] is True

    # 6. Verify role was upgraded to VENDOR in DB
    user_db = db.query(User).filter(User.email == "customer_b@example.com").first()
    assert user_db.role == UserRole.VENDOR

    # Login again to refresh JWT payload role claims
    login_response_new = client.post(f"{settings.API_V1_STR}/auth/login", json={
        "email": "customer_b@example.com",
        "password": "customerpassword"
    })
    token_new = login_response_new.json()["data"]["access_token"]
    vendor_headers = {"Authorization": f"Bearer {token_new}"}

    # 7. Add Product to store as Vendor
    category = Category(name="Muzik Aletleri", slug="muzik-aletleri")
    db.add(category)
    db.commit()

    product_data = {
        "category_id": str(category.id),
        "name": "Bob Ukulele",
        "sku": "UKU-999",
        "price": 150.0,
        "stock": 5
    }
    response_add = client.post(f"{settings.API_V1_STR}/vendor/products", json=product_data, headers=vendor_headers)
    assert response_add.status_code == 200
    product = response_add.json()["data"]
    assert product["store_id"] == store["id"]

    # 8. Retrieve Vendor Stats
    response_stats = client.get(f"{settings.API_V1_STR}/vendor/stats", headers=vendor_headers)
    assert response_stats.status_code == 200
    stats = response_stats.json()["data"]
    assert stats["total_products"] == 1
    assert stats["total_sales"] == 0.0

    # 9. Register and login Vendor C (unauthorized to edit Vendor B's product)
    vendor_c_data = {
        "email": "vendor_c@example.com",
        "password": "customerpassword",
        "first_name": "Charlie",
        "last_name": "Store"
    }
    client.post(f"{settings.API_V1_STR}/auth/register", json=vendor_c_data)
    
    # Apply and approve vendor C
    client_c_login = client.post(f"{settings.API_V1_STR}/auth/login", json={
        "email": "vendor_c@example.com",
        "password": "customerpassword"
    })
    token_c = client_c_login.json()["data"]["access_token"]
    headers_c = {"Authorization": f"Bearer {token_c}"}

    response_apply_c = client.post(f"{settings.API_V1_STR}/stores/apply", json={
        "name": "Charlie Shop",
        "description": "Tech stuff"
    }, headers=headers_c)
    store_c = response_apply_c.json()["data"]

    client.put(
        f"{settings.API_V1_STR}/stores/admin/{store_c['id']}/approve",
        json={"is_active": True},
        headers=admin_headers
    )

    login_response_c_new = client.post(f"{settings.API_V1_STR}/auth/login", json={
        "email": "vendor_c@example.com",
        "password": "customerpassword"
    })
    token_c_new = login_response_c_new.json()["data"]["access_token"]
    vendor_c_headers = {"Authorization": f"Bearer {token_c_new}"}

    # Charlie tries to edit Bob's product (should fail 403)
    response_edit_fail = client.put(
        f"{settings.API_V1_STR}/vendor/products/{product['id']}",
        json={"price": 200.0},
        headers=vendor_c_headers
    )
    assert response_edit_fail.status_code == 403
