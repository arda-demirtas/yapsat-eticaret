from fastapi.testclient import TestClient
from app.core.config import settings
from app.models.user import User, UserRole

def test_catalog_and_products_flow(client: TestClient, db) -> None:
    """Tests product and category CRUD, permissions, auto-slug, duplicate SKU, validation, and search."""
    # 1. Register an admin user
    admin_register = {
        "email": "admin@example.com",
        "password": "adminpassword",
        "first_name": "Admin",
        "last_name": "User"
    }
    client.post(f"{settings.API_V1_STR}/auth/register", json=admin_register)

    # 2. Update role to ADMIN directly in test database
    admin_user = db.query(User).filter(User.email == "admin@example.com").first()
    assert admin_user is not None
    admin_user.role = UserRole.ADMIN
    db.commit()

    # 3. Login to get JWT access token
    login_response = client.post(f"{settings.API_V1_STR}/auth/login", json={
        "email": "admin@example.com",
        "password": "adminpassword"
    })
    admin_token = login_response.json()["data"]["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 4. Create Category as Admin
    cat_data = {"name": "Elektronik", "slug": "elektronik"}
    response = client.post(f"{settings.API_V1_STR}/categories/", json=cat_data, headers=admin_headers)
    assert response.status_code == 200
    category = response.json()["data"]
    assert category["name"] == "Elektronik"

    # 5. Verify Guests cannot create a category
    response = client.post(f"{settings.API_V1_STR}/categories/", json={"name": "Kitap"})
    assert response.status_code == 401

    # 6. Create Product as Admin (verify auto-slugification)
    prod_data = {
        "category_id": category["id"],
        "name": "Kablosuz Kulaklık",
        "sku": "KULAK-001",
        "description": "Premium Bluetooth Kulaklık",
        "price": 129.99,
        "brand": "SlickSound",
        "stock": 50,
        "is_archived": False,
        "seo_title": "SlickSound Bluetooth Kulaklık",
        "seo_description": "En iyi ses kalitesi burada"
    }
    response = client.post(f"{settings.API_V1_STR}/products/", json=prod_data, headers=admin_headers)
    assert response.status_code == 200
    product = response.json()["data"]
    assert product["name"] == "Kablosuz Kulaklık"
    assert product["slug"] == "kablosuz-kulaklik"  # Slug generated from name

    # 7. Try creating product with duplicate SKU (should fail with 400)
    prod_data_dup = prod_data.copy()
    prod_data_dup["name"] = "Farklı Kulaklık"
    prod_data_dup["sku"] = "KULAK-001"  # Duplicate SKU
    response = client.post(f"{settings.API_V1_STR}/products/", json=prod_data_dup, headers=admin_headers)
    assert response.status_code == 400
    assert "SKU KULAK-001 is already in use" in response.json()["message"]

    # 8. Try creating product with negative stock (should fail schema validation with 422)
    prod_data_neg = prod_data.copy()
    prod_data_neg["sku"] = "KULAK-002"
    prod_data_neg["stock"] = -5  # Negative stock
    response = client.post(f"{settings.API_V1_STR}/products/", json=prod_data_neg, headers=admin_headers)
    assert response.status_code == 422
    assert "stock" in response.json()["message"]

    # 9. List and search products (Public endpoint)
    response = client.get(f"{settings.API_V1_STR}/products/?search=Kablosuz")
    assert response.status_code == 200
    products = response.json()["data"]
    assert len(products) == 1
    assert products[0]["sku"] == "KULAK-001"

    # 10. Search with a query yielding no matches
    response = client.get(f"{settings.API_V1_STR}/products/?search=bilgisayar")
    assert len(response.json()["data"]) == 0
