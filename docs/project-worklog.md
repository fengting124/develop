# Project Worklog

This document records the important project work, the reason behind each step,
the verification evidence, and deferred items. It is written for interview
review and future development.

## Current Direction

The project is being shaped into an AI-generated image detection engineering
workbench, not a universal deepfake detector.

The current priority order is:

1. Keep the MVP image-detection workflow stable.
2. Defer model-weight work until a GPU server is available.
3. Improve documentation, engineering evidence, and project readability.
4. Build evaluation features next, because model quality must be measurable.
5. Add robustness analysis after evaluation is in place.

## Deferred Work

### Real Model Weights

Status: deferred until GPU server setup.

Reason:

- The local machine should not be forced to download or run model weights.
- The repository must not commit `.onnx` or `.safetensors` files.
- The model service already has a runtime adapter and fallback path, so server
  integration can happen later without changing Java business logic.

Expected future branch:

```text
feature/server-model-weight-integration
```

Future acceptance:

- Download `nonescape-mini-v0.onnx` to a server-local model directory.
- Set `MODEL_RUNTIME=nonescape-onnx`.
- Set `MODEL_WEIGHTS_PATH=/models/weights/nonescape-mini-v0.onnx`.
- Verify `/health` reports `modelLoaded=true`.
- Run one full detection smoke test.

## Timeline

### 2026-07-08: Evaluation Backend Foundation

Branch:

```text
feature/evaluation-backend
```

Commit:

```text
Branch head after final verification.
```

What changed:

- Added evaluation metric calculation for binary synthetic-image detection.
- Added Flyway migration `V3__add_evaluation_tables.sql`.
- Added `evaluation_run` and `evaluation_sample` JPA entities and repositories.
- Added `POST /api/evaluations`.
- Added `GET /api/evaluations`.
- Added `GET /api/evaluations/{evaluationId}`.
- Added `GET /api/evaluations/{evaluationId}/samples?correct=false`.
- Added CSV manifest parsing for the first backend slice.

Why:

- The project needs to answer "how does the model perform?" instead of only
  producing one-off detection reports.
- This first slice stores evaluation datasets and computes metrics when
  prediction columns are already present.
- Batch model execution is intentionally deferred because it requires file set
  upload, queue orchestration, and model-service calls. Those should be built in
  a separate branch after the data model and API contract are stable.

Verification:

```powershell
cd backend-java
mvn -Dtest=EvaluationMetricsCalculatorTest test
mvn -Dtest=EvaluationRepositoryTest test
mvn -Dtest=EvaluationControllerTest test
```

Deferred:

- Uploading a directory or zip of evaluation images.
- Async batch execution through Redis.
- Calling the Python model service for each sample.
- Frontend evaluation dashboard.

### 2026-07-08: Documentation Governance

Branch:

```text
feature/documentation-governance
```

What changed:

- Added `docs/documentation-standards.md`.
- Added `docs/README.md`.
- Added this worklog.
- Linked the docs index from the root `README.md`.

Why:

- The project now has several feature branches, plans, and architecture notes.
  Without a documentation map, readers must guess where to start.
- A job-search project needs evidence, not just code. The worklog records
  design intent, validation, and deferred work.
- Documentation standards reduce future drift and keep technical writing concise.

References used:

- Diataxis documentation framework: <https://diataxis.fr/>
- Google developer documentation style guide:
  <https://developers.google.com/style/highlights>
- Microsoft Writing Style Guide:
  <https://learn.microsoft.com/en-us/style-guide/welcome/>

Verification:

```powershell
git diff --check
```

Deferred:

- No runtime code changes in this branch.
- No model weights downloaded.

### 2026-07-08: Real Nonescape Runtime Framework

Branch:

```text
feature/real-nonescape-runtime
```

Commit:

```text
ea4f902 Add Nonescape runtime adapter framework
```

What changed:

- Added a Python runtime boundary for the model service:
  `ModelRuntime`, `RuntimeHealth`, and `RuntimePrediction`.
- Wrapped the existing image-statistics heuristic as `HeuristicRuntime`.
- Added a `nonescape-onnx` runtime skeleton.
- Added runtime selection through environment variables.
- Updated Docker Compose to request ONNX runtime but allow heuristic fallback.
- Updated model integration docs and model-service README.

Why:

- The model service previously looked like a heuristic demo. The adapter
  boundary makes it ready for real Nonescape Mini ONNX weights on a server.
- Java backend logic should not know whether Python uses heuristic fallback,
  ONNX Runtime, or later another detector.
- Missing weights should be visible as a degraded model state, not a confusing
  startup crash during local development.

Verification:

```powershell
cd model-services\nonescape-mini
..\..\.venv-model-service\Scripts\python -m pytest
```

Result:

```text
6 passed
```

Deferred:

- Actual ONNX weight download and server inference validation.
- GPU-specific Docker Compose override.
- Report-page display of runtime/device/weights hash.

### 2026-07-08: Improvement Roadmap

Branch:

```text
feature/project-improvement-roadmap
```

Commit:

```text
786f8fb Add project improvement roadmap
```

What changed:

- Added a strict project improvement roadmap.
- Compared the project against better AI detection and evaluation projects.
- Reframed the project as an AI-generated image detection workbench.
- Defined recommended phases:
  - real model runtime,
  - evaluation backend,
  - evaluation frontend,
  - robustness analysis,
  - CI and presentation polish.

Why:

- The project needed a sharper job-search story.
- The previous scope risked looking too broad and not deep enough.
- Evaluation and robustness are more credible than adding many shallow features.

Verification:

```powershell
git diff --cached --check
```

Deferred:

- The roadmap itself does not implement product features.
- Phase B evaluation work is the next major code direction after documentation.

### 2026-07-08: MVP Query History And Reports

Branch:

```text
feature/mvp-query-history-and-reports
```

Commit:

```text
32e1342 Complete MVP query history and reports
```

What changed:

- Added backend detection history query.
- Added report lookup by report id.
- Added model health check endpoint.
- Connected frontend admin overview, report page, and model registry page to
  the new backend APIs.
- Updated the main implementation plan to mark Phase 6 as complete for MVP
  scope.

Why:

- Phase 6 required the frontend to show real backend state instead of static
  mock data.
- Reports need to be addressable by both task id and report id.
- Model health is important because model services can be degraded or missing
  weights.

Verification:

```powershell
cd backend-java
mvn test
```

```powershell
npm run build
npm run lint
```

```powershell
cd model-services\nonescape-mini
..\..\.venv-model-service\Scripts\python -m pytest
```

Deferred:

- Docker full-stack verification was deferred until Docker is available.

### 2026-07-08: Local Development Environment Tooling

Branch:

```text
feature/local-dev-environment
```

Commit:

```text
4b95f24 Add local development environment tooling
```

What changed:

- Added local environment documentation.
- Added scripts for environment checks and local startup.
- Documented Windows, WSL, and SSH-server setup trade-offs.

Why:

- The project will eventually run in WSL or on a server.
- Local Docker was not ready, so the project needed a clear path that separates
  source-code work from infrastructure availability.

Deferred:

- Docker-based full-stack execution remains pending local Docker setup.

### Earlier Backend And Integration Milestones

Important branches and commits:

| Branch | Commit | Purpose |
| --- | --- | --- |
| `feature/redis-job-recovery` | `57555a4` | Redis pending recovery and dead-letter handling |
| `feature/redis-detection-queue` | `f0a32f2` | Redis-backed detection queue |
| `feature/async-detection-jobs` | `ffe5fda` | Async detection execution |
| `feature/e2e-smoke-workflow` | `341c93c` | End-to-end smoke workflow |
| `feature/model-integration-framework` | `f89e6b4` | Java-to-Python model service framework |
| `feature/model-service-contract` | `9754709` | Stable model service HTTP contract |
| `feature/java-image-auth-platform` | `661201a` | Java backend detection workflow |

Why these matter:

- They moved the project from a frontend-only demo toward a layered system:
  frontend, Java business backend, Python model service, PostgreSQL, Redis, and
  local storage.
- They created the foundation for later evaluation and robustness work.

## Next Recommended Work

Start Phase B from `docs/project-improvement-roadmap.md`:

```text
feature/evaluation-backend
```

Scope:

- Add evaluation database tables.
- Add manifest parsing.
- Add metrics calculation.
- Add evaluation task APIs.
- Keep frontend work for a separate branch.

Reason:

The project needs to prove model behavior with data. Evaluation is more valuable
for interviews than adding more UI pages before metrics exist.
