# End-to-End Smoke Test Workflow

The smoke test verifies the main integration path after the backend, database,
and model service are running:

1. Check backend health.
2. Check model service health.
3. Upload one image to the backend.
4. Trigger detection execution.
5. Verify the task reaches `COMPLETED`.
6. Verify the response includes at least one prediction and one report.

It does not require real model weights. The current `nonescape-mini` service can
use its deterministic heuristic implementation, and the same workflow will keep
working after the scorer is replaced on a GPU server.

## Run

From the repository root:

```powershell
python tools/smoke_test.py --image public/samples/01.jpg
```

With explicit endpoints:

```powershell
python tools/smoke_test.py `
  --backend-url http://localhost:8080 `
  --model-url http://localhost:5010 `
  --image public/samples/01.jpg
```

On WSL or a remote Linux server:

```bash
python tools/smoke_test.py \
  --backend-url http://localhost:8080 \
  --model-url http://localhost:5010 \
  --image public/samples/01.jpg
```

## Expected Output

```json
{
  "taskId": "task-id",
  "status": "COMPLETED",
  "verdict": "LIKELY_AUTHENTIC",
  "confidence": 0.73,
  "predictionCount": 1
}
```

## Failure Output

The command exits with code `1` and prints:

```json
{
  "status": "FAILED",
  "message": "Detection did not complete: model unavailable"
}
```

## Notes

- The image path must be readable from the machine running the smoke script.
- The backend and model service must share the same storage mount when running
  inside Docker Compose.
- If backend health succeeds but detection fails, inspect backend logs first,
  then model service logs.
