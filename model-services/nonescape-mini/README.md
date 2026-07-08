# Nonescape Mini Model Service

This service is the first deployable model-side contract for the AIGC forensics
platform. It exposes the HTTP interface expected by the Java backend:

- `GET /health`
- `POST /api/v1/predict`

The service now uses a runtime adapter boundary. Local development can run with
the deterministic `heuristic` fallback, while GPU/server deployments can switch
to the real `nonescape-onnx` runtime when the Nonescape Mini ONNX weights are
available.

The heuristic runtime is not a production detector. It exists so the Java
backend, Docker shape, request/response contract, and tests remain usable before
weights are downloaded.

## Run Locally

```powershell
python -m venv ..\..\.venv-model-service
..\..\.venv-model-service\Scripts\python -m pip install -r requirements.txt
..\..\.venv-model-service\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 5010
```

## Runtime Configuration

Default local mode:

```powershell
$env:MODEL_RUNTIME = "heuristic"
```

Real Nonescape Mini ONNX mode:

```powershell
$env:MODEL_RUNTIME = "nonescape-onnx"
$env:MODEL_WEIGHTS_PATH = "D:\models\nonescape-mini-v0.onnx"
$env:MODEL_DEVICE = "cpu"
$env:MODEL_ALLOW_HEURISTIC_FALLBACK = "true"
```

Docker Compose mounts model weights at:

```text
/models/weights/nonescape-mini-v0.onnx
```

Download URLs:

- <https://nonescape.sfo2.cdn.digitaloceanspaces.com/nonescape-mini-v0.onnx>
- <https://nonescape.sfo2.cdn.digitaloceanspaces.com/nonescape-mini-v0.safetensors>

Do not commit downloaded weights. Keep them under `model-services/*/weights/`,
Docker volumes, or a server-local model directory.

## Health Contract

`GET /health` returns the selected runtime and whether the real model is loaded:

```json
{
  "status": "ok",
  "service": "nonescape-mini-model-service",
  "runtime": "heuristic",
  "requestedRuntime": "nonescape-onnx",
  "modelLoaded": false,
  "modelVersion": "heuristic-v0",
  "device": "cpu",
  "preprocessVersion": "image-statistics-v0",
  "message": "Configured ONNX weights do not exist: /models/weights/nonescape-mini-v0.onnx"
}
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
    "runtime": "heuristic",
    "modelLoaded": true,
    "preprocessVersion": "image-statistics-v0",
    "width": 1024,
    "height": 768
  }
}
```

## Test

```powershell
..\..\.venv-model-service\Scripts\python -m pytest
```

## Model Notes

The ONNX runtime skeleton uses ImageNet-style preprocessing derived from the
public Nonescape Python reference implementation: resize, center crop to
`224x224`, RGB conversion, and ImageNet normalization. The Java backend does not
depend on these details; it consumes only the stable HTTP response contract.
