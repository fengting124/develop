import os
from pathlib import Path

from app.runtime.base import ModelRuntime, RuntimeHealth, RuntimePrediction
from app.runtime.heuristic import HeuristicRuntime
from app.runtime.nonescape_onnx import NonescapeOnnxRuntime

DEFAULT_ONNX_WEIGHTS_PATH = "/models/weights/nonescape-mini-v0.onnx"


class DegradedFallbackRuntime:
    def __init__(self, delegate: HeuristicRuntime, requested_runtime: str, message: str):
        self.delegate = delegate
        self.requested_runtime = requested_runtime
        self.message = message

    def health(self) -> RuntimeHealth:
        delegate_health = self.delegate.health()
        return RuntimeHealth(
            runtime=delegate_health.runtime,
            requested_runtime=self.requested_runtime,
            model_loaded=False,
            model_version=delegate_health.model_version,
            device=delegate_health.device,
            preprocess_version=delegate_health.preprocess_version,
            message=self.message,
        )

    def predict(self, image_path: str, threshold: float) -> RuntimePrediction:
        prediction = self.delegate.predict(image_path, threshold)
        prediction.raw_response.update(
            {
                "requestedRuntime": self.requested_runtime,
                "modelLoaded": False,
                "runtimeMessage": self.message,
            }
        )
        return prediction


def create_runtime() -> ModelRuntime:
    requested_runtime = os.getenv("MODEL_RUNTIME", "heuristic").strip().lower()
    if requested_runtime == "heuristic":
        return HeuristicRuntime()
    if requested_runtime == "nonescape-onnx":
        return _create_onnx_runtime(requested_runtime)
    raise RuntimeError(f"Unsupported MODEL_RUNTIME: {requested_runtime}")


def _create_onnx_runtime(requested_runtime: str) -> ModelRuntime:
    weights_path = Path(os.getenv("MODEL_WEIGHTS_PATH", DEFAULT_ONNX_WEIGHTS_PATH))
    device = os.getenv("MODEL_DEVICE", "cpu").strip().lower()
    allow_fallback = _env_flag("MODEL_ALLOW_HEURISTIC_FALLBACK", default=True)

    if not weights_path.exists():
        message = f"Configured ONNX weights do not exist: {weights_path}"
        if allow_fallback:
            return DegradedFallbackRuntime(HeuristicRuntime(), requested_runtime, message)
        raise RuntimeError(message)

    try:
        return NonescapeOnnxRuntime(str(weights_path), device=device)
    except RuntimeError as exc:
        if allow_fallback:
            return DegradedFallbackRuntime(HeuristicRuntime(), requested_runtime, str(exc))
        raise


def _env_flag(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}
