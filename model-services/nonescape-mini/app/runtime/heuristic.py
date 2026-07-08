from app.runtime.base import RuntimeHealth, RuntimePrediction
from app.scoring import score_image


class HeuristicRuntime:
    runtime_name = "heuristic"
    model_version = "heuristic-v0"
    device = "cpu"
    preprocess_version = "image-statistics-v0"

    def health(self) -> RuntimeHealth:
        return RuntimeHealth(
            runtime=self.runtime_name,
            requested_runtime=self.runtime_name,
            model_loaded=True,
            model_version=self.model_version,
            device=self.device,
            preprocess_version=self.preprocess_version,
        )

    def predict(self, image_path: str, threshold: float) -> RuntimePrediction:
        normalized_score, raw_response = score_image(image_path)
        label = "SYNTHETIC" if normalized_score >= threshold else "AUTHENTIC"
        raw_response.update(
            {
                "runtime": self.runtime_name,
                "modelLoaded": True,
                "preprocessVersion": self.preprocess_version,
            }
        )
        return RuntimePrediction(
            model_version=self.model_version,
            raw_score=normalized_score,
            normalized_score=normalized_score,
            label=label,
            raw_response=raw_response,
        )
