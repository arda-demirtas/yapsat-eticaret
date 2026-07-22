from fastapi.testclient import TestClient
from app.core.config import settings

def test_health_check(client: TestClient) -> None:
    """Verifies that the health check endpoint returns 200 and success=True."""
    response = client.get(f"{settings.API_V1_STR}/health")
    assert response.status_code == 200
    content = response.json()
    assert content["success"] is True
    assert content["data"]["status"] == "healthy"
