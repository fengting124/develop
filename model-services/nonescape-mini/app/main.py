from time import perf_counter

from fastapi import FastAPI, HTTPException

from app.runtime import ModelRuntime
from app.runtime.config import create_runtime
from app.schemas import PredictRequest, PredictResponse

app = FastAPI(title="Nonescape Mini Model Service", version="0.1.0")
runtime: ModelRuntime = create_runtime()


@app.get("/health")
def health() -> dict[str, object]:
    return runtime.health().to_response() | {
        "status": "ok",
        "service": "nonescape-mini-model-service",
    }


@app.post("/api/v1/predict", response_model=PredictResponse)
def predict(request: PredictRequest) -> PredictResponse:
    started_at = perf_counter()

    try:
        result = runtime.predict(request.imagePath, request.threshold)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=f"Image path does not exist: {request.imagePath}",
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    latency_ms = int((perf_counter() - started_at) * 1000)

    return PredictResponse(
        modelVersion=result.model_version,
        rawScore=result.raw_score,
        normalizedScore=result.normalized_score,
        label=result.label,
        latencyMs=latency_ms,
        rawResponse=result.raw_response,
    )
