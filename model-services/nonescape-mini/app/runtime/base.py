from dataclasses import dataclass
from typing import Any, Protocol


@dataclass(frozen=True)
class RuntimeHealth:
    runtime: str
    requested_runtime: str
    model_loaded: bool
    model_version: str
    device: str
    preprocess_version: str
    message: str | None = None

    def to_response(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "runtime": self.runtime,
            "requestedRuntime": self.requested_runtime,
            "modelLoaded": self.model_loaded,
            "modelVersion": self.model_version,
            "device": self.device,
            "preprocessVersion": self.preprocess_version,
        }
        if self.message is not None:
            payload["message"] = self.message
        return payload


@dataclass(frozen=True)
class RuntimePrediction:
    model_version: str
    raw_score: float
    normalized_score: float
    label: str
    raw_response: dict[str, Any]


class ModelRuntime(Protocol):
    def health(self) -> RuntimeHealth:
        """Return runtime state suitable for the service health endpoint."""

    def predict(self, image_path: str, threshold: float) -> RuntimePrediction:
        """Run inference and return backend-compatible model output."""
