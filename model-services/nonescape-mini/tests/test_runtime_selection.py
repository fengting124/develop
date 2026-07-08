import pytest

from app.runtime.config import create_runtime


def test_default_runtime_is_heuristic(monkeypatch):
    monkeypatch.delenv("MODEL_RUNTIME", raising=False)
    monkeypatch.delenv("MODEL_WEIGHTS_PATH", raising=False)

    runtime = create_runtime()

    health = runtime.health()
    assert health.runtime == "heuristic"
    assert health.requested_runtime == "heuristic"
    assert health.model_loaded is True


def test_missing_onnx_weights_falls_back_to_heuristic_when_allowed(monkeypatch, tmp_path):
    missing_weights = tmp_path / "missing.onnx"
    monkeypatch.setenv("MODEL_RUNTIME", "nonescape-onnx")
    monkeypatch.setenv("MODEL_WEIGHTS_PATH", str(missing_weights))
    monkeypatch.setenv("MODEL_ALLOW_HEURISTIC_FALLBACK", "true")

    runtime = create_runtime()

    health = runtime.health()
    assert health.runtime == "heuristic"
    assert health.requested_runtime == "nonescape-onnx"
    assert health.model_loaded is False
    assert health.message == f"Configured ONNX weights do not exist: {missing_weights}"


def test_missing_onnx_weights_raises_when_fallback_is_disabled(monkeypatch, tmp_path):
    missing_weights = tmp_path / "missing.onnx"
    monkeypatch.setenv("MODEL_RUNTIME", "nonescape-onnx")
    monkeypatch.setenv("MODEL_WEIGHTS_PATH", str(missing_weights))
    monkeypatch.setenv("MODEL_ALLOW_HEURISTIC_FALLBACK", "false")

    with pytest.raises(RuntimeError, match="Configured ONNX weights do not exist"):
        create_runtime()
