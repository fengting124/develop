from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image

from app.main import app


client = TestClient(app)


def test_health_returns_service_status():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "nonescape-mini-model-service",
    }


def test_predict_returns_backend_compatible_contract_for_valid_image(tmp_path):
    image_path = _create_test_image(tmp_path / "sample.png")

    response = client.post(
        "/api/v1/predict",
        json={
            "taskId": "task-001",
            "assetId": "asset-001",
            "imagePath": str(image_path),
            "threshold": 0.5,
        },
    )

    payload = response.json()
    assert response.status_code == 200
    assert payload["modelVersion"] == "heuristic-v0"
    assert 0 <= payload["rawScore"] <= 1
    assert 0 <= payload["normalizedScore"] <= 1
    assert payload["label"] in {"AUTHENTIC", "SYNTHETIC"}
    assert payload["latencyMs"] >= 0
    assert payload["rawResponse"]["heuristic"] == "image_statistics_v0"
    assert payload["rawResponse"]["width"] == 2
    assert payload["rawResponse"]["height"] == 2


def test_predict_returns_not_found_for_missing_image():
    response = client.post(
        "/api/v1/predict",
        json={
            "taskId": "task-001",
            "assetId": "asset-001",
            "imagePath": "D:/missing/sample.png",
            "threshold": 0.5,
        },
    )

    assert response.status_code == 404
    assert "Image path does not exist" in response.json()["detail"]


def _create_test_image(path: Path) -> Path:
    image = Image.new("RGB", (2, 2), color=(120, 140, 160))
    image.save(path)
    return path
