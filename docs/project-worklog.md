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

### 2026-07-09: Frontend Workbench Redesign

Branch:

```text
feature/evaluation-frontend-workbench
```

What changed:

- Reframed the admin area as a usable workbench instead of concept pages.
- Preserved the existing visual style: calm canvas, fine borders, serif
  headings, mono data labels, compact cards, and restrained status colors.
- Replaced primary admin navigation with operational destinations:
  Overview, Detections, Evaluations, Models, and Review.
- Added evaluation frontend API bindings.
- Added an evaluation page for creating manifest-based evaluations, running or
  retrying them, inspecting metrics, and reviewing wrong samples.
- Added detection history, model registry, and review queue pages backed by the
  existing APIs.
- Reworked the overview page to summarize detection history, evaluation runs,
  model health, and review workload.

Why:

- The backend now has real evaluation execution, so the frontend needs to show
  measurable model behavior rather than only demo-style concepts.
- Job-search reviewers should quickly understand the system boundaries:
  detection workflow, evaluation workflow, model registry, and human review.
- The redesign intentionally improves usability and information architecture
  without changing the recognizable visual identity of the project.

Verification:

```powershell
npm run lint
npm run build
npx playwright screenshot --browser=chromium http://127.0.0.1:5174/admin/evaluations artifacts-admin-evaluations.png
```

Deferred:

- Full charting and confusion matrix visualization.
- Pagination and server-side filtering for large datasets.
- Rich image preview for evaluation samples after dataset upload support exists.

### 2026-07-08: Evaluation Batch Execution Framework

Branch:

```text
feature/evaluation-batch-execution
```

What changed:

- Added `attemptCount` and `maxAttempts` to evaluation runs.
- Added an evaluation-specific model boundary:
  `EvaluationModelClient`, `EvaluationModelRequest`, and `EvaluationModelResult`.
- Added a deterministic placeholder model client for local execution without
  model weights, GPU, or image files.
- Added `EvaluationExecutionService` to run queued evaluations sample by
  sample.
- Added failure handling that marks the run `FAILED`, records the failing sample
  reason, and persists partial progress.
- Added retry behavior that skips already completed samples and continues
  remaining samples while attempts remain.
- Added `POST /api/evaluations/{evaluationId}/run`.
- Added `POST /api/evaluations/{evaluationId}/retry`.
- Added focused tests for persistence, model boundary, execution success,
  execution failure, retry, and HTTP execution.

Why:

- The previous evaluation slice could store records and calculate metrics only
  when predictions were already present in the manifest.
- This branch turns evaluation into a real backend workflow while still
  respecting the current environment constraint: no model weights are downloaded
  and no GPU runtime is required.
- The deterministic client is intentionally a boundary adapter, not a claimed
  detector. It lets the Java orchestration, retry semantics, metrics, and
  database writes become testable now, while leaving the real model adapter for
  the later GPU-server branch.

Verification:

```powershell
cd backend-java
mvn -Dtest=EvaluationRepositoryTest test
mvn -Dtest=DeterministicEvaluationModelClientTest test
mvn -Dtest=EvaluationExecutionServiceTest test
mvn -Dtest=EvaluationControllerTest test
```

Deferred:

- Downloading or loading `nonescape-mini-v0.onnx`.
- Resolving evaluation manifest filenames to uploaded dataset files.
- Asynchronous Redis-backed evaluation execution.
- Frontend evaluation dashboard and confusion matrix visualization.
- Replacing the deterministic local adapter with a Python model-service adapter.

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

### 2026-07-09: Full-Stack Evaluation Demo Polish

Branch:

```text
feature/fullstack-evaluation-demo-smoke
```

Commit:

```text
See the PR commit history after merge.
```

What changed:

- Added a small frontend test boundary for API error formatting.
- Converted raw gateway failures into a clear backend availability message.
- Documented the admin evaluation demo path from frontend to Java backend.

Why:

- The evaluation workflow already existed, but the demo story needed a cleaner
  operator experience when the backend is offline.
- Interviewers should be able to distinguish implemented evaluation execution
  from deferred GPU model-weight work.

Verification:

- `npm run test`
- `npm run lint`
- `npm run build`
- `mvn -B test`

Deferred:

- Full interactive Docker demo remains pending until Docker is available.
- Real model weights remain deferred until a GPU server is prepared.

### 2026-07-09: Evaluation Result Insights

Branch:

```text
feature/evaluation-result-insights
```

Commit:

```text
See the PR commit history after merge.
```

What changed:

- Added tested frontend insight calculation for evaluation samples.
- Added a confusion matrix, label distribution, and sample-outcome summary to
  `/admin/evaluations`.
- Improved the wrong-sample empty state for completed matching predictions.

Why:

- The evaluation page needed to explain model behavior, not only list runs and
  aggregate metrics.
- The change keeps insight logic in a pure utility so future backend aggregation
  can be compared against frontend expectations.

Verification:

- `npm run test`
- `npm run lint`
- `npm run build`
- `mvn -B test`

Deferred:

- No backend aggregation API was added in this branch.
- Real model weights remain deferred until a GPU server is prepared.
- Local headless screenshot verification was attempted with a mocked API, but
  the temporary Vite process exited before Chrome could capture the page.

### 2026-07-11: Production Foundation And Project Boundary Design

Branch:

```text
feature/production-foundation-spec
```

What changed:

- Audited the current frontend, Java backend, PostgreSQL, Redis, storage,
  model-service, evaluation, testing, CI, and repository-governance boundaries.
- Compared the design with Spring Modulith, Debezium outbox guidance, Redis
  Streams, Testcontainers, OpenTelemetry, Resilience4j, OWASP upload guidance,
  and maintained AI-image detection benchmarks.
- Defined measurable reliability, security, observability, reproducibility,
  testing, API, data-governance, and repository standards.
- Split future work into focused branches from reliable dispatch through GPU
  server integration.

Why:

- The project needs interview-visible engineering depth that solves real
  failure modes instead of adding unrelated pages or infrastructure names.
- Database-to-Redis consistency, long-running database transactions, upload
  trust, and fake evaluation execution are concrete current risks.
- Model weights remain deferred, so the local stage must make the surrounding
  system reliable and verifiable first.

Verification baseline:

- `npm run test`: 8 passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `mvn -B test`: 47 passed.
- Python model-service tests: 6 passed.

Recorded risk:

- `npm audit` reported one high and one low vulnerability. The Vite finding is
  isolated to the next `fix/frontend-dependency-security` branch.

Next branch:

```text
feature/reliable-job-dispatch
```

The branch will implement a PostgreSQL transactional outbox and idempotent
Redis publication before evaluation is connected to real inference.

---

### 2026-07-11: Reliable Detection Job Dispatch

Branch:

```text
feature/reliable-job-dispatch
```

What changed:

- Added Flyway migration V5 and a durable PostgreSQL outbox state machine.
- Changed asynchronous submission from a direct Redis write to transactional
  outbox scheduling while locking the detection task against concurrent
  submission.
- Added a versioned Redis event envelope, stable event-id deduplication, stale
  claim recovery, bounded retry with jitter, and permanent failure state.
- Added bounded operations APIs for inspection and explicit terminal-event
  replay without exposing raw payload JSON.
- Added a detailed reliability and recovery runbook.

Why:

- The previous request-to-Redis call was a database/queue dual write.
- Real systems must survive Redis outages and process crashes without losing
  accepted business work.
- The same outbox foundation can later dispatch evaluation work without model
  weights or additional infrastructure products.

Verification:

- TDD RED/GREEN cycles covered the domain state machine, transaction service,
  Redis envelope, dispatcher, operations API, concurrent submission lock, and
  indeterminate Redis responses.
- Java suite increased from 47 baseline tests to 79 passing tests.
- Frontend tests (8), lint, and production build passed.
- Model-service tests (6) and full-stack smoke tests (3) passed without model
  weights.

Deferred:

- Real PostgreSQL/Redis restart and concurrency tests remain assigned to
  `test/postgres-redis-testcontainers` when Docker is available.
- The model HTTP call still runs inside its database transaction and is the
  next production-boundary change.
- Operations endpoints remain trusted-network only until authentication is in
  scope.

---

### 2026-07-11: Short-Lived Detection Execution Transactions

```text
feature/short-lived-execution-transactions
```

What changed:

- Added Flyway V6 execution token, lease expiry, and attempt count fields.
- Split task claim, external model invocation, and result persistence into
  separate transaction boundaries.
- Added fencing-token checks so stale success or failure callbacks cannot
  overwrite a newer attempt.
- Kept partial multi-model results in memory and committed predictions and the
  report atomically only after every model succeeded.
- Changed the Redis worker to leave `BUSY` messages pending for safe redelivery.

Why:

- Network inference must not hold database connections or row locks.
- A crashed worker needs bounded recovery without accepting late stale writes.
- The guarantee is useful with a heuristic adapter now and remains valid when
  GPU-backed model latency is introduced later.

Verification:

- Domain tests cover live lease rejection, expiry recovery, and token fencing.
- Service tests cover detached plans, stale writes, multi-model partial
  failure, and acknowledgement decisions.
- Spring integration tests assert the model client runs without an active
  transaction and validate Flyway V6 against JPA.
- Java suite reached 97 passing tests before final cross-project verification.

Deferred:

- Lease heartbeat until representative real-model latency is available.
- Docker-backed process crash and PostgreSQL/Redis restart tests.
- Applying the same execution boundary to batch evaluation.

---

### 2026-07-11: Upload Trust Boundary

```text
feature/upload-trust-boundary
```

What changed:

- Added layered JPEG, PNG, and WebP inspection using signatures, ImageIO reader
  agreement, dimensions, decoded pixel limits, and a full decode.
- Added the TwelveMonkeys WebP reader and verified it with an upstream fixture.
- Replaced browser MIME trust with canonical content-derived metadata.
- Replaced user-controlled storage names with generated asset paths and atomic
  accepted-file writes.
- Added transport and application byte limits plus a stable `413` response.
- Documented why forensic evidence is retained without re-encoding and which
  deployment controls compensate for that choice.

Why:

- Uploads are the platform's primary untrusted input and feed the future model
  runtime directly.
- MIME and extension checks alone are spoofable, while unbounded decode can
  exhaust memory even for a modest encoded file.
- Validating before accepted storage prevents corrupt input from becoming
  durable application state.

Verification:

- Java suite reached 116 passing tests before final cross-project verification.
- Tests cover spoofed MIME, real WebP decode, corrupt content, byte/dimension/
  pixel limits, display filename traversal, generated paths, and `413` mapping.

Deferred:

- Authentication, user quotas, and rate limiting.
- Antivirus/sandbox integration and object-storage quarantine.
- Docker-backed disk, restart, and temporary-file lifecycle tests.

---

### 2026-07-11: Frontend Dependency Security

```text
fix/frontend-dependency-security
```

What changed:

- Refreshed the lockfile within existing package ranges.
- Upgraded Vite from 8.0.14 to 8.1.4 to resolve the Windows path-deny bypass
  and UNC-path credential disclosure advisories.
- Upgraded transitive Babel packages from 7.29.0 to 7.29.7 to resolve the
  source-map local file-read advisory.
- Kept `package.json` ranges and application source unchanged.

Why:

- A known high-severity development-server vulnerability is still relevant on
  the project's primary Windows development environment.
- A lockfile-only compatible update is lower risk than carrying known findings
  or mixing a framework migration with security remediation.

Verification:

- A clean `npm ci` completed successfully.
- `npm audit --audit-level=low` reports zero vulnerabilities.
- Frontend tests (8), lint, and production build pass with Vite 8.1.4.
- Screenshots were not repeated because no frontend source, CSS, asset, or
  runtime behavior changed.

---

## Next Recommended Work

Add interview-visible operational observability:

```text
feature/observability-correlation
```

Scope:

- Propagate a correlation id across HTTP requests, outbox events, Redis jobs,
  model calls, and persisted execution records.
- Add Micrometer counters and timers for dispatch, retries, queue outcomes,
  inference latency, and upload rejection reasons.
- Define structured logging fields without logging image bytes or model raw
  payloads.
- Document local metrics endpoints and production exposure boundaries.

Reason:

The project now handles failure and recovery, but operators cannot yet answer
which request produced a task, where latency accumulated, or how often retries
and security rejections occur. Correlated traces and bounded metrics turn the
reliability features into an operable system.
