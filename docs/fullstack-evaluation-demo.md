# Full-Stack Evaluation Demo

This how-to shows how to demonstrate the evaluation workflow from the admin UI
through the Java backend and persistence layer. It uses the deterministic
evaluation model client, so it does not require model weights or a GPU.

## Audience

Use this document when preparing an interview demo, local verification, or a PR
review that needs to exercise evaluation creation and execution.

## Current Status

The evaluation workflow supports:

- Creating an evaluation run from a CSV manifest.
- Persisting run state and sample rows in the Java backend.
- Executing the run through the evaluation model-client boundary.
- Recording aggregate metrics: accuracy, precision, recall, and F1.
- Retrying failed runs through the same service boundary.
- Inspecting runs and wrong samples in `/admin/evaluations`.

The workflow does not download or require real model weights yet. GPU-backed
model inference remains deferred until the project runs on a prepared server.

## Prerequisites

- Node.js 24 or newer.
- Java and Maven for the Spring Boot backend.
- PostgreSQL and Redis for the default backend profile.
- Docker Compose if you want to run the full infrastructure from
  `infra/docker-compose.yml`.

If Docker is not ready on the local machine, use `mvn -B test` to verify the
evaluation service with the H2-backed test profile. Full interactive UI
execution still needs a running backend.

## Demo Steps

1. Start the backend infrastructure.

```powershell
docker compose -f infra/docker-compose.yml up --build
```

2. Start the frontend in another terminal.

```powershell
npm install
npm run dev
```

3. Open the admin evaluation page.

```text
http://localhost:5173/admin/evaluations
```

4. Use the default manifest or paste a small manifest:

```csv
filename,groundTruthLabel
real_001.jpg,AUTHENTIC
fake_001.jpg,SYNTHETIC
```

5. Click `Create Evaluation`.

6. Select the created run and click `Run`.

7. Confirm the page displays:

- `COMPLETED` status.
- Completed sample count.
- Accuracy, precision, recall, and F1.
- Wrong or failed samples when predictions do not match labels.

8. Click `Retry` only when a run failed and should be executed again.

## Backend-Only Verification

When Docker is not available, verify the Java evaluation path with tests:

```powershell
cd backend-java
mvn -B test
```

Key tests:

- `EvaluationControllerTest`
- `EvaluationExecutionServiceTest`
- `EvaluationMetricsCalculatorTest`
- `EvaluationRepositoryTest`
- `DeterministicEvaluationModelClientTest`

These tests prove the service boundary, retry behavior, metric calculation, and
database mapping without requiring model weights.

## Frontend Error Behavior

If the frontend is running but the Java backend is not available, admin pages
show:

```text
Backend API unavailable. Start the Java backend and try again.
```

This message is intentionally clearer than the raw Vite proxy `502` response.
It does not hide real backend validation errors: JSON `message`, `error`, and
`detail` fields are still surfaced directly to the user.

## Verification

Run these checks before claiming the demo workflow is ready:

```powershell
npm run test
npm run lint
npm run build
cd backend-java
mvn -B test
```

For a full interactive demo, also create and run one evaluation from
`/admin/evaluations` after the backend infrastructure is running.

## Related Docs

- `docs/documentation-standards.md`
- `docs/model-integration-framework.md`
- `docs/smoke-test-workflow.md`
- `docs/project-improvement-roadmap.md`
