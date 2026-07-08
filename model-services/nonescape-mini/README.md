# Nonescape Mini Model Service

This service is the first deployable model-side contract for the AIGC forensics
platform. It exposes the HTTP interface expected by the Java backend:

- `GET /health`
- `POST /api/v1/predict`

The current implementation uses a deterministic image-statistics heuristic. It
is not a production detector. Its purpose is to validate the backend-service
integration, deployment shape, request/response contract, and test workflow
before replacing the scorer with a real lightweight vision model.

## Run Locally

```powershell
python -m venv ..\..\.venv-model-service
..\..\.venv-model-service\Scripts\python -m pip install -r requirements.txt
..\..\.venv-model-service\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 5010
```

## Request Contract

```json
{
  "taskId": "task-001",
  "assetId": "asset-001",
  "imagePath": "D:/workspace/develop/storage/images/example.png",
  "threshold": 0.5
}
```

## Response Contract

```json
{
  "modelVersion": "heuristic-v0",
  "rawScore": 0.42,
  "normalizedScore": 0.42,
  "label": "AUTHENTIC",
  "latencyMs": 3,
  "rawResponse": {
    "heuristic": "image_statistics_v0",
    "width": 1024,
    "height": 768
  }
}
```

## Test

```powershell
..\..\.venv-model-service\Scripts\python -m pytest
```

## Next Model Upgrade

The next branch should replace `app.scoring.score_image` behind the same
service contract. Candidate implementation options:

- Load a lightweight local vision classifier/checkpoint for GPU inference.
- Keep the HTTP response contract stable for the Java backend.
- Add model warmup, device selection, and explicit model metadata in
  `rawResponse`.
