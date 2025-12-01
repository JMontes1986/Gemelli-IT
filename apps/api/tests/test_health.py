from fastapi.testclient import TestClient

from apps.api.app import main


def test_health_endpoint_returns_ok_status():
    client = TestClient(main.app)

    response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "healthy"
    assert "timestamp" in payload
