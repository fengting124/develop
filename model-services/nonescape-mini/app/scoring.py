from hashlib import sha256
from pathlib import Path
from typing import Any

from PIL import Image, ImageStat, UnidentifiedImageError


def score_image(image_path: str) -> tuple[float, dict[str, Any]]:
    path = Path(image_path)
    if not path.exists():
        raise FileNotFoundError(image_path)
    if not path.is_file():
        raise ValueError(f"Image path is not a file: {image_path}")

    try:
        with Image.open(path) as image:
            rgb_image = image.convert("RGB")
            width, height = rgb_image.size
            stat = ImageStat.Stat(rgb_image)
            brightness = sum(stat.mean) / (3 * 255)
            dynamic_range = _average_dynamic_range(rgb_image)
    except UnidentifiedImageError as exc:
        raise ValueError(f"Unsupported or corrupted image: {image_path}") from exc

    hash_signal = sha256(path.read_bytes()).digest()[0] / 255
    center_bias = abs(brightness - 0.5) * 2
    score = _clamp((0.45 * hash_signal) + (0.35 * (1 - dynamic_range)) + (0.20 * center_bias))

    raw_response = {
        "heuristic": "image_statistics_v0",
        "width": width,
        "height": height,
        "brightness": round(brightness, 6),
        "dynamicRange": round(dynamic_range, 6),
        "hashSignal": round(hash_signal, 6),
    }
    return score, raw_response


def _average_dynamic_range(image: Image.Image) -> float:
    extrema = image.getextrema()
    ranges = [(high - low) / 255 for low, high in extrema]
    return sum(ranges) / len(ranges)


def _clamp(value: float) -> float:
    return min(1.0, max(0.0, value))
