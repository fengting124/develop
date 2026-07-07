from typing import Any, Literal

from pydantic import BaseModel, Field


ModelLabel = Literal["AUTHENTIC", "SYNTHETIC"]


class PredictRequest(BaseModel):
    taskId: str = Field(..., min_length=1)
    assetId: str = Field(..., min_length=1)
    imagePath: str = Field(..., min_length=1)
    threshold: float = Field(0.5, ge=0.0, le=1.0)


class PredictResponse(BaseModel):
    modelVersion: str
    rawScore: float = Field(..., ge=0.0, le=1.0)
    normalizedScore: float = Field(..., ge=0.0, le=1.0)
    label: ModelLabel
    latencyMs: int = Field(..., ge=0)
    rawResponse: dict[str, Any]
