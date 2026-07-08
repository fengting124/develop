# Model Integration Framework

This project keeps model weights and GPU runtime concerns outside the core
business workflow. The Java backend depends only on a stable HTTP model
contract, while the model service selects either a local development fallback or
a real Nonescape Mini ONNX runtime.

## Services

- `postgres`: stores media metadata, tasks, predictions, and reports.
- `redis`: stores asynchronous detection job messages.
- `backend`: Spring Boot service that owns upload, task execution, persistence,
  and report generation.
- `nonescape-mini`: FastAPI model service exposing `/health` and
  `/api/v1/predict`. It supports `MODEL_RUNTIME=heuristic` for local fallback
  and `MODEL_RUNTIME=nonescape-onnx` for real Nonescape Mini ONNX inference.

## Shared Storage Contract

The backend writes uploaded images under `STORAGE_ROOT`. The model service reads
the same files by path, so Docker Compose mounts one shared volume:

- backend: `/data/storage`
- model service: `/data/storage:ro`

The model service is read-only because it should not mutate uploaded evidence.

## Endpoint Configuration

The database seed keeps a local default endpoint for simple development:

```text
http://localhost:5010
```

In container or server deployments, the backend overrides this at startup with:

```text
APP_MODEL_REGISTRY_SYNCHRONIZATION_ENABLED=true
APP_MODEL_REGISTRY_NONESCAPE_MINI_ENDPOINT_URL=http://nonescape-mini:5010
```

The Java startup synchronizer updates the `model_registry.endpoint_url` value
for `nonescape-mini` if the configured endpoint differs from the seeded value.

## Model Runtime Configuration

The model service accepts these environment variables:

```text
MODEL_RUNTIME=heuristic|nonescape-onnx
MODEL_WEIGHTS_PATH=/models/weights/nonescape-mini-v0.onnx
MODEL_DEVICE=cpu|cuda
MODEL_ALLOW_HEURISTIC_FALLBACK=true|false
```

Recommended local Docker defaults:

```text
MODEL_RUNTIME=nonescape-onnx
MODEL_WEIGHTS_PATH=/models/weights/nonescape-mini-v0.onnx
MODEL_DEVICE=cpu
MODEL_ALLOW_HEURISTIC_FALLBACK=true
```

With fallback enabled, missing weights do not crash the development service.
`GET /health` will report `runtime=heuristic`, `requestedRuntime=nonescape-onnx`,
and `modelLoaded=false` so the UI and backend can show a degraded model state.

Download the ONNX weight outside Git:

```powershell
Invoke-WebRequest `
  https://nonescape.sfo2.cdn.digitaloceanspaces.com/nonescape-mini-v0.onnx `
  -OutFile D:\models\nonescape-mini-v0.onnx
```

## Local Compose Run

From the repository root:

```powershell
docker compose -f infra/docker-compose.yml up --build
```

Then check:

```powershell
Invoke-RestMethod http://localhost:8080/api/health
Invoke-RestMethod http://localhost:5010/health
```

## End-to-End Smoke Test

After services are running, verify the full workflow:

```powershell
python tools/smoke_test.py --image public/samples/01.jpg
```

See `docs/smoke-test-workflow.md` for detailed usage and failure output.

## Async Execution

The backend also exposes `POST /api/detections/{taskId}/run-async` for clients
that should not block while inference runs. See `docs/async-detection-jobs.md`
for the polling contract and upgrade path.

## GPU Server Upgrade Path

Keep the HTTP contract stable and replace only the model-service internals:

1. Mount real weights under `/models/weights`.
2. Set `MODEL_RUNTIME=nonescape-onnx`.
3. Set `MODEL_WEIGHTS_PATH=/models/weights/nonescape-mini-v0.onnx`.
4. Keep `/api/v1/predict` returning `modelVersion`, `rawScore`,
   `normalizedScore`, `label`, `latencyMs`, and `rawResponse`.
5. Add startup warmup and device selection through environment variables.
6. Add GPU-specific Docker Compose override later, for example
   `infra/docker-compose.gpu.yml`.
