from time import perf_counter

from fastapi import FastAPI, HTTPException

from app.schemas import PredictRequest, PredictResponse
from app.scoring import score_image

app = FastAPI(title="Nonescape Mini Model Service", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "nonescape-mini-model-service",
    }


@app.post("/api/v1/predict", response_model=PredictResponse)
def predict(request: PredictRequest) -> PredictResponse:
    started_at = perf_counter()

    try:
        normalized_score, raw_response = score_image(request.imagePath)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=f"Image path does not exist: {request.imagePath}",
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    label = "SYNTHETIC" if normalized_score >= request.threshold else "AUTHENTIC"
    latency_ms = int((perf_counter() - started_at) * 1000)

    return PredictResponse(
        modelVersion="heuristic-v0",
        rawScore=normalized_score,
        normalizedScore=normalized_score,
        label=label,
        latencyMs=latency_ms,
        rawResponse=raw_response,
    )
