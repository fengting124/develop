from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from smoke_test import SmokeTestFailure, SmokeTestRunner


def test_runner_executes_detection_workflow(tmp_path):
    image_path = tmp_path / "sample.jpg"
    image_path.write_bytes(b"fake-image")
    client = FakeClient(
        backend_health={"status": "ok", "service": "image-authenticity-backend"},
        model_health={"status": "ok", "service": "nonescape-mini-model-service"},
        create_response={"taskId": "task-001", "status": "QUEUED"},
        run_response={
            "taskId": "task-001",
            "status": "COMPLETED",
            "predictions": [{"modelId": "nonescape-mini", "label": "AUTHENTIC"}],
            "report": {"verdict": "LIKELY_AUTHENTIC", "confidence": 0.73},
        },
    )

    summary = SmokeTestRunner(
        backend_url="http://backend:8080",
        model_url="http://model:5010",
        image_path=image_path,
        client=client,
    ).run()

    assert summary == {
        "taskId": "task-001",
        "status": "COMPLETED",
        "verdict": "LIKELY_AUTHENTIC",
        "confidence": 0.73,
        "predictionCount": 1,
    }
    assert client.calls == [
        ("GET", "http://backend:8080/api/health"),
        ("GET", "http://model:5010/health"),
        ("UPLOAD", "http://backend:8080/api/detections/images", image_path),
        ("POST", "http://backend:8080/api/detections/task-001/run"),
    ]


def test_runner_rejects_missing_image(tmp_path):
    missing_image = tmp_path / "missing.jpg"

    with pytest.raises(SmokeTestFailure, match="Image file does not exist"):
        SmokeTestRunner(
            backend_url="http://backend:8080",
            model_url="http://model:5010",
            image_path=missing_image,
            client=FakeClient(),
        ).run()


def test_runner_requires_completed_report(tmp_path):
    image_path = tmp_path / "sample.jpg"
    image_path.write_bytes(b"fake-image")
    client = FakeClient(
        backend_health={"status": "ok"},
        model_health={"status": "ok"},
        create_response={"taskId": "task-001", "status": "QUEUED"},
        run_response={
            "taskId": "task-001",
            "status": "FAILED",
            "failureReason": "model unavailable",
            "predictions": [],
            "report": None,
        },
    )

    with pytest.raises(SmokeTestFailure, match="Detection did not complete"):
        SmokeTestRunner(
            backend_url="http://backend:8080",
            model_url="http://model:5010",
            image_path=image_path,
            client=client,
        ).run()


class FakeClient:
    def __init__(
        self,
        backend_health=None,
        model_health=None,
        create_response=None,
        run_response=None,
    ):
        self.backend_health = backend_health or {}
        self.model_health = model_health or {}
        self.create_response = create_response or {}
        self.run_response = run_response or {}
        self.calls = []

    def get_json(self, url):
        self.calls.append(("GET", url))
        if url.endswith("/api/health"):
            return self.backend_health
        return self.model_health

    def post_json(self, url):
        self.calls.append(("POST", url))
        return self.run_response

    def post_multipart_file(self, url, field_name, file_path):
        self.calls.append(("UPLOAD", url, file_path))
        assert field_name == "file"
        return self.create_response
