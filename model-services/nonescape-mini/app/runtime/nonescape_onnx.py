from hashlib import sha256
from pathlib import Path
from time import perf_counter
from typing import Any

from PIL import Image, ImageOps, UnidentifiedImageError

from app.runtime.base import RuntimeHealth, RuntimePrediction


class NonescapeOnnxRuntime:
    runtime_name = "nonescape-onnx"
    model_version = "nonescape-mini-v0.onnx"
    preprocess_version = "nonescape-mini-preprocess-v0"

    def __init__(self, weights_path: str, device: str = "cpu"):
        self.weights_path = Path(weights_path)
        self.device = device
        self.weights_sha256 = _file_sha256(self.weights_path)
        self.session = self._load_session()
        self.input_name = self.session.get_inputs()[0].name
        self.output_name = self.session.get_outputs()[0].name

    def health(self) -> RuntimeHealth:
        return RuntimeHealth(
            runtime=self.runtime_name,
            requested_runtime=self.runtime_name,
            model_loaded=True,
            model_version=self.model_version,
            device=self.device,
            preprocess_version=self.preprocess_version,
            message=f"weightsSha256={self.weights_sha256}",
        )

    def predict(self, image_path: str, threshold: float) -> RuntimePrediction:
        started_at = perf_counter()
        tensor, image_metadata = _preprocess_image(image_path)
        outputs = self.session.run([self.output_name], {self.input_name: tensor})
        synthetic_score = float(outputs[0][0][1])
        label = "SYNTHETIC" if synthetic_score >= threshold else "AUTHENTIC"
        raw_response: dict[str, Any] = {
            "runtime": self.runtime_name,
            "modelLoaded": True,
            "preprocessVersion": self.preprocess_version,
            "device": self.device,
            "weightsSha256": self.weights_sha256,
            "inferenceRuntimeMs": int((perf_counter() - started_at) * 1000),
            **image_metadata,
        }
        return RuntimePrediction(
            model_version=self.model_version,
            raw_score=synthetic_score,
            normalized_score=synthetic_score,
            label=label,
            raw_response=raw_response,
        )

    def _load_session(self):
        try:
            import onnxruntime as ort
        except ImportError as exc:
            raise RuntimeError("onnxruntime is not installed") from exc

        providers = ["CPUExecutionProvider"]
        if self.device == "cuda":
            providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
        return ort.InferenceSession(str(self.weights_path), providers=providers)


def _preprocess_image(image_path: str):
    try:
        import numpy as np
    except ImportError as exc:
        raise RuntimeError("numpy is required for ONNX preprocessing") from exc

    path = Path(image_path)
    if not path.exists():
        raise FileNotFoundError(image_path)
    if not path.is_file():
        raise ValueError(f"Image path is not a file: {image_path}")

    try:
        with Image.open(path) as image:
            image = ImageOps.exif_transpose(image).convert("RGB")
            original_width, original_height = image.size
            image.thumbnail((256, 256))
            left = max((image.width - 224) // 2, 0)
            top = max((image.height - 224) // 2, 0)
            image = image.crop((left, top, left + 224, top + 224)).resize((224, 224))
            array = np.asarray(image).astype("float32") / 255.0
    except UnidentifiedImageError as exc:
        raise ValueError(f"Unsupported or corrupted image: {image_path}") from exc

    mean = np.asarray([0.485, 0.456, 0.406], dtype="float32")
    std = np.asarray([0.229, 0.224, 0.225], dtype="float32")
    normalized = (array - mean) / std
    tensor = normalized.transpose(2, 0, 1)[None, :, :, :].astype("float32")
    return tensor, {
        "width": original_width,
        "height": original_height,
        "inputWidth": 224,
        "inputHeight": 224,
    }


def _file_sha256(path: Path) -> str:
    digest = sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()
