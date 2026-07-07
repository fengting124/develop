# Model Integration Framework

This project keeps model weights and GPU runtime concerns outside the core
business workflow for now. The Java backend depends only on a stable HTTP model
contract, while the model service can later replace its heuristic scorer with a
real GPU-backed implementation.

## Services

- `postgres`: stores media metadata, tasks, predictions, and reports.
- `backend`: Spring Boot service that owns upload, task execution, persistence,
  and report generation.
- `nonescape-mini`: FastAPI model service exposing `/health` and
  `/api/v1/predict`.

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

## GPU Server Upgrade Path

Keep the HTTP contract stable and replace only the model-service internals:

1. Mount real weights under `/models/weights`.
2. Add model loading in `model-services/nonescape-mini/app/scoring.py` or a new
   runtime adapter module.
3. Keep `/api/v1/predict` returning `modelVersion`, `rawScore`,
   `normalizedScore`, `label`, `latencyMs`, and `rawResponse`.
4. Add startup warmup and device selection through environment variables.
5. Add GPU-specific Docker Compose override later, for example
   `infra/docker-compose.gpu.yml`.
