from __future__ import annotations

import argparse
import json
import mimetypes
import uuid
from pathlib import Path
from typing import Any
from urllib import error, request


class SmokeTestFailure(RuntimeError):
    pass


class SmokeTestRunner:
    def __init__(
        self,
        backend_url: str,
        model_url: str,
        image_path: Path,
        client: ApiClient | None = None,
    ):
        self.backend_url = backend_url.rstrip("/")
        self.model_url = model_url.rstrip("/")
        self.image_path = image_path
        self.client = client or ApiClient()

    def run(self) -> dict[str, Any]:
        self._validate_image()
        self._check_health(f"{self.backend_url}/api/health", "backend")
        self._check_health(f"{self.model_url}/health", "model service")

        create_response = self.client.post_multipart_file(
            f"{self.backend_url}/api/detections/images",
            "file",
            self.image_path,
        )
        task_id = self._required(create_response, "taskId", "create detection response")

        detail = self.client.post_json(f"{self.backend_url}/api/detections/{task_id}/run")
        if detail.get("status") != "COMPLETED":
            failure_reason = detail.get("failureReason") or "unknown reason"
            raise SmokeTestFailure(f"Detection did not complete: {failure_reason}")

        report = detail.get("report")
        if not report:
            raise SmokeTestFailure("Detection completed without a report")

        predictions = detail.get("predictions") or []
        if not predictions:
            raise SmokeTestFailure("Detection completed without model predictions")

        return {
            "taskId": task_id,
            "status": detail["status"],
            "verdict": report.get("verdict"),
            "confidence": report.get("confidence"),
            "predictionCount": len(predictions),
        }

    def _validate_image(self) -> None:
        if not self.image_path.exists():
            raise SmokeTestFailure(f"Image file does not exist: {self.image_path}")
        if not self.image_path.is_file():
            raise SmokeTestFailure(f"Image path is not a file: {self.image_path}")

    def _check_health(self, url: str, service_name: str) -> None:
        payload = self.client.get_json(url)
        if payload.get("status") != "ok":
            raise SmokeTestFailure(f"{service_name} health check failed: {payload}")

    def _required(self, payload: dict[str, Any], field_name: str, context: str) -> Any:
        value = payload.get(field_name)
        if value is None or value == "":
            raise SmokeTestFailure(f"Missing {field_name} in {context}: {payload}")
        return value


class ApiClient:
    def __init__(self, timeout_seconds: float = 30):
        self.timeout_seconds = timeout_seconds

    def get_json(self, url: str) -> dict[str, Any]:
        http_request = request.Request(url, method="GET")
        return self._send_json_request(http_request)

    def post_json(self, url: str) -> dict[str, Any]:
        http_request = request.Request(url, data=b"", method="POST")
        return self._send_json_request(http_request)

    def post_multipart_file(self, url: str, field_name: str, file_path: Path) -> dict[str, Any]:
        boundary = f"----aigc-forensics-{uuid.uuid4().hex}"
        body = self._multipart_body(boundary, field_name, file_path)
        headers = {
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Content-Length": str(len(body)),
        }
        http_request = request.Request(url, data=body, headers=headers, method="POST")
        return self._send_json_request(http_request)

    def _send_json_request(self, http_request: request.Request) -> dict[str, Any]:
        try:
            with request.urlopen(http_request, timeout=self.timeout_seconds) as response:
                return json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            message = exc.read().decode("utf-8", errors="replace")
            raise SmokeTestFailure(f"HTTP {exc.code} for {http_request.full_url}: {message}") from exc
        except error.URLError as exc:
            raise SmokeTestFailure(f"Request failed for {http_request.full_url}: {exc.reason}") from exc
        except json.JSONDecodeError as exc:
            raise SmokeTestFailure(f"Response was not valid JSON for {http_request.full_url}") from exc

    def _multipart_body(self, boundary: str, field_name: str, file_path: Path) -> bytes:
        filename = file_path.name
        content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
        header = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'
            f"Content-Type: {content_type}\r\n\r\n"
        ).encode("utf-8")
        footer = f"\r\n--{boundary}--\r\n".encode("utf-8")
        return header + file_path.read_bytes() + footer


def main() -> int:
    args = parse_args()
    runner = SmokeTestRunner(
        backend_url=args.backend_url,
        model_url=args.model_url,
        image_path=args.image,
        client=ApiClient(timeout_seconds=args.timeout),
    )

    try:
        summary = runner.run()
    except SmokeTestFailure as exc:
        print(json.dumps({"status": "FAILED", "message": str(exc)}, indent=2))
        return 1

    print(json.dumps(summary, indent=2))
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the image detection smoke workflow.")
    parser.add_argument("--backend-url", default="http://localhost:8080")
    parser.add_argument("--model-url", default="http://localhost:5010")
    parser.add_argument("--image", type=Path, default=Path("public/samples/01.jpg"))
    parser.add_argument("--timeout", type=float, default=30)
    return parser.parse_args()


if __name__ == "__main__":
    raise SystemExit(main())
