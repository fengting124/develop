# Production Foundation And Project Boundary Design

## 1. Decision Summary

Visual Authenticity Workbench will be developed as a production-minded AI
image authenticity analysis and evaluation system. Its differentiator is not
the number of pages or models. It is the ability to show a reliable path from
an uploaded image to a reproducible model result while remaining honest about
model uncertainty.

The next development stage builds the frontend, Java business backend, data
layer, task infrastructure, contracts, tests, and operational controls before
GPU deployment. Model weights and CUDA verification remain deferred to a
server-specific branch.

The first production code slice after this specification is reliable job
dispatch based on a transactional outbox and idempotent consumption. This
addresses the current database-to-Redis dual-write boundary without adding
Kafka or splitting the Java application into premature microservices.

## 2. Research Basis

The design uses ideas from maintained primary sources while keeping the scope
appropriate for a portfolio project:

- [Spring Modulith application events](https://docs.spring.io/spring-modulith/reference/events.html)
  persists event publications in the original business transaction and tracks
  publication lifecycle states. This informs the durable publication model.
- [Debezium Outbox Event Router](https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html)
  documents the transactional outbox pattern for reliable external event
  publication. The project will implement a small local outbox rather than add
  Kafka, Kafka Connect, or CDC.
- [Redis Streams](https://redis.io/docs/latest/develop/data-types/streams/)
  documents consumer groups, pending entries, acknowledgement, and recovery.
  Redis remains a delivery mechanism rather than the source of business truth.
- [Testcontainers Spring Boot Quickstart](https://github.com/testcontainers/testcontainers-java-spring-boot-quickstart)
  demonstrates testing Spring applications against real infrastructure. The
  project will add PostgreSQL and Redis integration tests when Docker is
  available.
- [OpenTelemetry Demo](https://github.com/open-telemetry/opentelemetry-demo)
  separates application behavior from telemetry collection and provides
  realistic logs, metrics, and traces. The project will adopt the signals, not
  the demo's microservice count.
- [Resilience4j](https://github.com/resilience4j/resilience4j) provides focused
  retry, circuit breaker, time limiter, and bulkhead primitives for Java. Only
  model-service calls need these controls initially.
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
  requires allowlisted types, signature validation, generated storage names,
  size limits, and storage outside the web root.
- [DeepfakeBench](https://github.com/SCLBD/DeepfakeBench),
  [GenImage](https://github.com/GenImage-Dataset/GenImage), and
  [AIGCDetectBenchmark](https://github.com/Ekko-zn/AIGCDetectBenchmark) show
  that credible detector projects need standardized datasets, per-generator
  analysis, degradation tests, and reproducible metrics rather than a single
  confidence score.

## 3. Product Boundary

### 3.1 Problem Statement

Teams integrating an open-source AI-generated-image detector need more than a
score. They need reliable task execution, traceable files, model provenance,
repeatable evaluation, inspectable failures, and a clear statement of result
limitations.

The project solves that engineering problem. It does not claim to determine
ground truth for every image.

### 3.2 Supported Product Workflows

1. Upload and validate one JPEG, PNG, or WebP image.
2. Persist immutable asset metadata and a SHA-256 digest.
3. Submit a detection task durably and process it asynchronously.
4. Invoke a registered Python model service through a stable contract.
5. Persist prediction provenance, latency, threshold, and raw model metadata.
6. Generate a qualified report and retain detection history.
7. Create labeled evaluation runs and inspect metrics and wrong samples.
8. Observe service health, queue lag, retries, failures, and model latency.

### 3.3 Explicit Non-Goals

- Video, audio, and text deepfake detection.
- Legal-grade forensic certification or automatic enforcement decisions.
- Model training, fine-tuning, or large-scale dataset hosting.
- Billing, multi-tenancy, organization management, or complex RBAC.
- Kubernetes, service mesh, Kafka, or a general workflow engine.
- More than one production model before the first model has a reproducible
  evaluation report.
- Committing model weights, uploaded media, secrets, or database files.

## 4. Architectural Decisions

### 4.1 Deployment Shape

```text
Browser
  -> React + TypeScript frontend
  -> Spring Boot modular monolith
       -> PostgreSQL: system of record
       -> Redis Streams: transient job delivery
       -> StorageService: local volume now, S3-compatible later
       -> ModelInferenceClient
            -> FastAPI model service
                 -> heuristic development runtime
                 -> Nonescape ONNX server runtime
```

The Java application remains a modular monolith. Detection, evaluation, model
registry, asset storage, reporting, and job dispatch are logical modules with
explicit interfaces, but they share one deployable process and one database.
The Python process is separate because model dependencies, GPU scheduling, and
failure modes differ from business services.

### 4.2 Source Of Truth

- PostgreSQL owns business state, task state, outbox state, model registry,
  reports, and evaluation results.
- Redis owns transport state only. Redis data may be rebuilt from durable
  PostgreSQL work that has not reached a terminal state.
- File storage owns image bytes. PostgreSQL stores the opaque storage key,
  digest, media metadata, and provenance.
- The frontend never derives authoritative task state from local storage or
  optimistic state after the backend has accepted a task.

### 4.3 Consistency Model

Creating business work and requesting queue publication must occur in one
PostgreSQL transaction. The transaction writes both the business state and a
durable outbox record. A dispatcher publishes pending records to Redis and
then marks them published.

Delivery is at least once. Exactly-once transport is not claimed. Consumers
must be idempotent using a stable `eventId` and the aggregate state machine.
A duplicate delivery must not produce duplicate predictions or reports.

No database transaction may remain open while waiting for the model HTTP
service. Execution is split into short claim, external inference, and short
result-persistence transactions.

### 4.4 Storage Boundary

`StorageService` remains the only business-facing file API. Domain services
must use opaque storage keys rather than constructing filesystem paths. The
local adapter is used for development; a later S3-compatible adapter may use
MinIO locally and object storage on the server without changing detection
business logic.

## 5. Reliability Requirements

### 5.1 Task State Machines

Detection:

```text
QUEUED -> CLAIMED -> INFERENCING -> COMPLETED
   |         |            |
   +---------+------------+-> FAILED -> QUEUED (explicit retry)
```

Evaluation:

```text
QUEUED -> RUNNING -> COMPLETED
   |         |
   +---------+-> FAILED -> QUEUED (within retry budget)
```

Invalid transitions fail with a stable conflict response. Terminal results
are immutable except for a separately versioned rerun.

### 5.2 Reliable Dispatch

The outbox record contains:

- `event_id`: globally unique public identifier.
- `event_type`: initially `DETECTION_REQUESTED`.
- `aggregate_type` and `aggregate_id`.
- `payload_json`: versioned event payload.
- `status`: `PENDING`, `PUBLISHING`, `PUBLISHED`, or `FAILED`.
- `attempt_count`, `available_at`, `last_error`.
- `created_at`, `published_at`, and optimistic-lock version.

Required behavior:

- A committed `202 Accepted` task always has durable dispatch work.
- Dispatcher crashes cannot lose the outbox row.
- Publish failures use bounded exponential backoff with jitter.
- A stale `PUBLISHING` row becomes claimable again.
- Parallel dispatchers cannot claim the same row concurrently.
- A permanently failed row remains inspectable and can be replayed explicitly.
- Stream payloads include `eventId`, `eventType`, `aggregateId`, and
  `occurredAt`; consumers reject unsupported event versions.

### 5.3 Idempotency

- Upload deduplication continues to use SHA-256 but creates a new detection
  task for each accepted request.
- Job submission uses a unique database constraint on the active event for an
  aggregate and event type.
- Model predictions have a uniqueness rule for task, model, and execution
  attempt.
- Report generation is an upsert by task id, not an unconditional insert.
- Consumer acknowledgement occurs only after durable result persistence.

### 5.4 Model Call Resilience

- Connect timeout: 3 seconds.
- Per-attempt response timeout: 30 seconds.
- Automatic retries: at most 2, only for connection failure, timeout, HTTP
  `429`, and HTTP `5xx`.
- No retry for invalid input or other HTTP `4xx` responses.
- Exponential delay with jitter prevents synchronized retry storms.
- A per-model circuit breaker and concurrency bulkhead isolate unhealthy model
  endpoints.
- The persisted failure records the stable error code and a sanitized message,
  never an unbounded remote response body.

## 6. Secure Image Ingestion

The backend enforces all limits; frontend checks are usability hints only.

- Maximum request file size: 20 MiB.
- Maximum decoded pixel count: 40 million pixels.
- Allowed formats: JPEG, PNG, and WebP only.
- Validate declared content type, extension, file signature, and successful
  image decode. None is trusted alone.
- Reject animated images for the MVP.
- Generate the physical storage filename; retain the original filename only as
  escaped metadata with a 255-character limit.
- Store files outside the frontend web root with least-privilege permissions.
- Write to a temporary key and atomically promote only after validation.
- Delete temporary content when persistence fails.
- Keep an asynchronous malware-scanning extension point, but do not claim
  malware scanning until an engine is deployed.

## 7. API And Frontend Contract

### 7.1 API Rules

- JSON uses camelCase and ISO-8601 UTC timestamps.
- Errors follow RFC 9457 Problem Details with `type`, `title`, `status`,
  `detail`, `instance`, `errorCode`, and `traceId`.
- The backend accepts or generates `X-Request-ID` and returns it on every
  response.
- Asynchronous commands return `202 Accepted` with a stable resource id and a
  `Location` header.
- Invalid state transitions return `409 Conflict`.
- Collection endpoints use bounded pagination; default size is 20 and maximum
  size is 100.
- OpenAPI is the contract source. Frontend response types must match it, with
  later generated-client adoption considered only after the contract settles.

### 7.2 Frontend Rules

- Preserve the existing visual language and CSS Modules.
- `src/api` is the only HTTP boundary.
- Server state is not copied into a global store without a demonstrated need.
- Every asynchronous view exposes loading, empty, degraded, retryable failure,
  terminal failure, and success states.
- Polling has a bounded interval, stops on terminal state, pauses when the page
  is hidden, and uses backoff after network failure.
- User-visible reports distinguish model output, system interpretation, and
  limitations.
- Component behavior and critical workflows require automated tests; pure
  calculation tests alone are insufficient.

## 8. Data Governance And Reproducibility

Every production prediction must retain:

- asset SHA-256 and immutable storage key;
- model id, model version, and model endpoint identity;
- runtime and device;
- weights SHA-256 when a real runtime is loaded;
- preprocessing version;
- threshold and raw/normalized score;
- inference latency and end-to-end task latency;
- trace id, execution attempt, and timestamps.

Every evaluation run additionally retains:

- manifest SHA-256 and manifest schema version;
- dataset name, source category, and generator category when supplied;
- model configuration snapshot rather than only a mutable model id;
- application Git commit when provided by deployment metadata;
- metrics computed from immutable sample predictions.

The first metrics extension includes ROC-AUC, average precision, confusion
matrix, per-generator metrics, p50/p95 latency, and threshold snapshots.
Robustness variants are added only after real inference is wired into the same
evaluation path.

## 9. Observability And Operations

### 9.1 Signals

Structured logs include `timestamp`, `level`, `service`, `traceId`,
`requestId`, `taskId`, `evaluationId`, `assetId`, `modelId`, `eventId`,
`attempt`, `durationMs`, `outcome`, and `errorCode` when applicable.

Initial metrics:

- HTTP request count, error count, and latency.
- Outbox pending count, oldest pending age, publish retries, and failures.
- Redis stream lag, pending count, claimed count, and dead-letter count.
- Detection/evaluation throughput, failure count, and end-to-end latency.
- Model call count, latency, timeout count, retry count, circuit state, and
  inference concurrency.

Spring Boot Actuator and Micrometer provide health and metrics. OpenTelemetry
trace export is added after trace context works across Java-to-Python HTTP.
Prometheus and Grafana are optional Compose profiles, not required for the
minimum developer stack.

### 9.2 Health Semantics

- Liveness reports whether a process can continue running.
- Readiness reports whether it can serve its responsibility.
- PostgreSQL unavailability makes the Java backend unready.
- Redis unavailability degrades asynchronous submission and dispatch but must
  not corrupt PostgreSQL state.
- Missing model weights produce a degraded model status. A heuristic fallback
  must be visibly marked and cannot be presented as a production detector.

## 10. Test And CI Standard

### 10.1 Test Pyramid

- Unit tests: state transitions, validation, metrics, retry classification,
  payload versioning, and idempotency rules.
- Repository tests: Flyway schema and database constraints against PostgreSQL.
- Infrastructure integration tests: PostgreSQL and Redis through
  Testcontainers; H2 remains only for fast tests that do not depend on
  PostgreSQL behavior.
- Contract tests: Java model client against a stub HTTP model service and
  Python request/response schema tests.
- Frontend tests: pure utilities plus component states and API error behavior.
- Smoke tests: upload, durable dispatch, inference stub, report persistence,
  evaluation creation, and restart recovery.
- Failure tests: Redis unavailable, model timeout, duplicate delivery,
  dispatcher crash after publish, stale pending claim, and malformed upload.

Docker-dependent tests use a separate Maven profile until the development and
CI environments have Docker. They become required before a release tag.

### 10.2 CI Gates

Every pull request must run:

- frontend tests, lint, build, and dependency audit;
- Java tests and package build;
- Python tests;
- smoke-tool tests;
- secret scan and dependency review when GitHub permissions support them;
- migration validation for branches that change the schema.

No branch is merged with a failed required check. Separate concerns use
separate branches and pull requests. Schema changes are forward-only Flyway
migrations; merged migrations are never edited.

## 11. Repository Governance

- Protect `main`; require PRs and all CI checks.
- Use concise feature branches such as `feature/reliable-job-dispatch`.
- Use Conventional Commit-style subjects where practical.
- Delete remote feature branches after merge.
- Add an explicit repository license before external reuse is encouraged.
- Add repository topics and one release only after the full local smoke path is
  reproducible.
- Keep README focused on problem, architecture, demonstration, measured
  results, limits, and exact run commands.
- Record material design decisions in specs and durable operational behavior
  in runbooks, not only in the worklog.

## 12. Phased Delivery Plan

Each item is an independent branch and PR.

### Stage 0: Governance Baseline

1. `feature/production-foundation-spec`: this design and roadmap.
2. `fix/frontend-dependency-security`: upgrade Vite beyond the affected
   `8.0.0-8.0.15` range and make dependency audit an explicit CI signal.
3. Repository settings: protect `main`, close stale PRs, clean merged branches,
   add topics, and choose a license.

### Stage 1: Reliable Data And Task Foundation

1. `feature/reliable-job-dispatch`: transactional outbox, dispatcher, event
   envelope, idempotent Redis publication, replay, and unit/repository tests.
2. `feature/short-lived-execution-transactions`: remove model HTTP calls from
   database transactions and persist claim/result in short transactions.
3. `feature/secure-image-ingestion`: upload limits, signature/decode checks,
   generated keys, temporary writes, cleanup, and tests.
4. `feature/production-error-contract`: Problem Details, request id propagation,
   stable error codes, and frontend mapping.

### Stage 2: Verifiable Infrastructure

1. `test/postgres-redis-testcontainers`: real PostgreSQL and Redis integration
   tests, including outbox recovery and database constraints.
2. `feature/observability-foundation`: Actuator, Micrometer, structured logs,
   correlation ids, queue metrics, and an operations runbook.
3. `feature/model-call-resilience`: classified retry, circuit breaker,
   bulkhead, timeout, and metrics around model calls.
4. `feature/reproducible-local-stack`: frontend container, reverse proxy,
   health-gated Compose startup, optional observability profile, and smoke
   verification.

### Stage 3: Real Evaluation Path

1. `feature/evaluation-inference-adapter`: evaluation uses the registered model
   service and immutable asset paths; deterministic scoring is test-only.
2. `feature/evaluation-async-dispatch`: reuse the durable job infrastructure for
   evaluation samples and retry/recovery.
3. `feature/evaluation-metrics-v2`: AUC, average precision, per-generator
   metrics, threshold snapshots, and run comparison.
4. `feature/robustness-evaluation`: JPEG, resize, and crop variants after the
   real inference path is available.

### Stage 4: GPU Server Integration

1. `feature/server-model-weight-integration`: install ONNX Runtime GPU, mount
   Nonescape Mini weights, verify CUDA Provider, and record the weight hash.
2. Run the same versioned evaluation manifest on CPU and GPU.
3. Publish measured latency, throughput, accuracy, AUC, wrong samples, and
   known limitations.
4. Consider a CLIP-based second model only after the first benchmark is
   reproducible.

## 13. First Code Slice Acceptance Criteria

`feature/reliable-job-dispatch` is complete only when:

- submitting an eligible detection creates a pending outbox row in the same
  database transaction;
- Redis failure leaves durable retryable work and does not lose the task;
- a dispatcher publishes the versioned event and records publication state;
- duplicate publication or delivery does not create duplicate predictions or
  reports;
- stale publication claims can recover after a simulated process crash;
- permanent failures are inspectable and explicitly replayable;
- unit tests cover state transitions and backoff;
- PostgreSQL repository tests cover unique constraints and concurrent claim
  behavior when Docker is available;
- existing frontend, Java, Python, and smoke tests remain green;
- the operational behavior is documented in a runbook.

## 14. Definition Of Done

A feature is not done because an endpoint exists. It is done when:

1. Its boundary and failure semantics are explicit.
2. New behavior was developed test-first where executable code changed.
3. Data changes have a forward Flyway migration and rollback guidance.
4. Logs and metrics make failure diagnosis possible.
5. Inputs and resource consumption are bounded.
6. Documentation describes operation and limitations without exaggeration.
7. Fresh local verification passes.
8. A focused PR passes required CI before merge.

## 15. Current Risks Recorded At Baseline

- Evaluation execution still uses deterministic CRC32 scoring rather than the
  model-service path.
- Model HTTP calls currently execute inside a database transaction.
- Database-to-Redis publication is not transactionally durable.
- Upload validation trusts declared content type and lacks size/pixel limits.
- H2 tests do not prove PostgreSQL or Redis integration behavior.
- Docker Compose lacks the frontend and reverse proxy.
- The model requirements install CPU `onnxruntime`; CUDA configuration is not
  yet a verified GPU runtime.
- `npm audit` on 2026-07-11 reports one high and one low vulnerability. The
  high finding affects Vite `8.0.0-8.0.15` on Windows and is assigned to the
  dedicated dependency-security branch.
- The repository has no license, topics, release, or `main` protection and has
  accumulated many historical remote branches.

These are tracked boundaries, not hidden claims. Each is mapped to a delivery
stage above.
