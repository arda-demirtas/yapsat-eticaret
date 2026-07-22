from fastapi.testclient import TestClient
from app.core.config import settings

def test_register_user(client: TestClient) -> None:
    """Verifies that a customer user can register successfully."""
    data = {
        "email": "testuser@example.com",
        "password": "password123",
        "first_name": "Test",
        "last_name": "User"
    }
    response = client.post(f"{settings.API_V1_STR}/auth/register", json=data)
    assert response.status_code == 200
    content = response.json()
    assert content["success"] is True
    assert content["data"]["email"] == "testuser@example.com"
    assert "id" in content["data"]
    assert "hashed_password" not in content["data"]  # Ensure sensitive details are not leaked

def test_register_duplicate_email(client: TestClient) -> None:
    """Verifies that registration with a duplicate email fails with 400."""
    data = {
        "email": "testuser@example.com",
        "password": "password456",
        "first_name": "Another",
        "last_name": "User"
    }
    response = client.post(f"{settings.API_V1_STR}/auth/register", json=data)
    assert response.status_code == 400
    content = response.json()
    assert content["success"] is False
    assert "Email already registered" in content["message"]

def test_login_success(client: TestClient) -> None:
    """Verifies that logging in with valid credentials yields a valid JWT token."""
    data = {
        "email": "testuser@example.com",
        "password": "password123"
    }
    response = client.post(f"{settings.API_V1_STR}/auth/login", json=data)
    assert response.status_code == 200
    content = response.json()
    assert content["success"] is True
    assert "access_token" in content["data"]
    assert content["data"]["token_type"] == "bearer"
    assert content["data"]["user"]["email"] == "testuser@example.com"

def test_login_invalid_credentials(client: TestClient) -> None:
    """Verifies that logging in with invalid password returns a 400 error."""
    data = {
        "email": "testuser@example.com",
        "password": "wrongpassword"
    }
    response = client.post(f"{settings.API_V1_STR}/auth/login", json=data)
    assert response.status_code == 400
    content = response.json()
    assert content["success"] is False
    assert "Incorrect email or password" in content["message"]

def test_get_profile_authenticated(client: TestClient) -> None:
    """Verifies that an authenticated request to /me succeeds and returns user details."""
    # First login to retrieve token
    login_data = {
        "email": "testuser@example.com",
        "password": "password123"
    }
    login_response = client.post(f"{settings.API_V1_STR}/auth/login", json=login_data)
    token = login_response.json()["data"]["access_token"]

    # Request profile
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get(f"{settings.API_V1_STR}/auth/me", headers=headers)
    assert response.status_code == 200
    content = response.json()
    assert content["success"] is True
    assert content["data"]["email"] == "testuser@example.com"

def test_get_profile_unauthenticated(client: TestClient) -> None:
    """Verifies that requesting /me without a valid authorization header returns 401."""
    response = client.get(f"{settings.API_V1_STR}/auth/me")
    assert response.status_code == 401
    content = response.json()
    assert content["success"] is False
