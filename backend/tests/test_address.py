from fastapi.testclient import TestClient
from app.core.config import settings

def test_address_lifecycle(client: TestClient) -> None:
    """Tests address CRUD, ownership, and unique default address logic."""
    # 0. Register user first to ensure it exists in this test module database
    register_data = {
        "email": "testuser@example.com",
        "password": "password123",
        "first_name": "Test",
        "last_name": "User"
    }
    client.post(f"{settings.API_V1_STR}/auth/register", json=register_data)

    # 1. Login user to get JWT token
    login_data = {
        "email": "testuser@example.com",
        "password": "password123"
    }
    login_response = client.post(f"{settings.API_V1_STR}/auth/login", json=login_data)
    token = login_response.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Add first address (should automatically become default even if is_default=False is passed)
    addr_data_1 = {
        "title": "Home",
        "full_name": "Test User",
        "phone_number": "555-0199",
        "street_address": "123 Main St",
        "city": "Springfield",
        "state": "IL",
        "postal_code": "62701",
        "country": "USA",
        "is_default": False
    }
    response = client.post(f"{settings.API_V1_STR}/addresses/", json=addr_data_1, headers=headers)
    assert response.status_code == 200
    addr1 = response.json()["data"]
    assert addr1["title"] == "Home"
    assert addr1["is_default"] is True  # Verified default override for first item

    # 3. Add second address as non-default
    addr_data_2 = {
        "title": "Office",
        "full_name": "Test User",
        "phone_number": "555-0200",
        "street_address": "456 Corporate Blvd",
        "city": "Springfield",
        "state": "IL",
        "postal_code": "62702",
        "country": "USA",
        "is_default": False
    }
    response = client.post(f"{settings.API_V1_STR}/addresses/", json=addr_data_2, headers=headers)
    assert response.status_code == 200
    addr2 = response.json()["data"]
    assert addr2["title"] == "Office"
    assert addr2["is_default"] is False

    # 4. Make second address default via PUT update
    update_data = {"is_default": True}
    response = client.put(f"{settings.API_V1_STR}/addresses/{addr2['id']}", json=update_data, headers=headers)
    assert response.status_code == 200
    addr2_updated = response.json()["data"]
    assert addr2_updated["is_default"] is True

    # 5. Verify first address has been reset to is_default = False
    response = client.get(f"{settings.API_V1_STR}/addresses/", headers=headers)
    addresses = response.json()["data"]
    assert len(addresses) == 2
    # The list is ordered by is_default desc, so index 0 is default (addr2) and index 1 is non-default (addr1)
    assert addresses[0]["id"] == addr2["id"]
    assert addresses[0]["is_default"] is True
    assert addresses[1]["id"] == addr1["id"]
    assert addresses[1]["is_default"] is False

    # 6. Delete default address (addr2) and verify addr1 becomes default again automatically
    response = client.delete(f"{settings.API_V1_STR}/addresses/{addr2['id']}", headers=headers)
    assert response.status_code == 200
    
    response = client.get(f"{settings.API_V1_STR}/addresses/", headers=headers)
    addresses_after_delete = response.json()["data"]
    assert len(addresses_after_delete) == 1
    assert addresses_after_delete[0]["id"] == addr1["id"]
    assert addresses_after_delete[0]["is_default"] is True
