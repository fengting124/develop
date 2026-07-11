# AI Application Product Boundary And Long-Term Roadmap

- Status: Active
- Owners: Project maintainers
- Last reviewed: 2026-07-11

## 1. Purpose

This specification defines the durable product boundary and delivery order for
Visual Authenticity Workbench. It targets Java backend and AI application
engineering interviews. Model deployment is required, but model research and
state-of-the-art training are not project goals.

This document supersedes roadmap decisions in
`docs/project-improvement-roadmap.md`. That file remains historical research.
Completed implementation details remain documented in `docs/project-worklog.md`.

## 2. Product Positioning

Visual Authenticity Workbench is a production-minded platform for integrating,
operating, evaluating, and reviewing an open-source AI-generated-image
detector.

The project demonstrates how a Java system turns an external model into a
reliable business capability. Its primary value is not a novel neural network.
Its value is trustworthy orchestration around a proven model:

- secure evidence ingestion;
- durable asynchronous execution;
- model-service fault isolation;
- reproducible evaluation;
- human review and audit history;
- observable deployment behavior;
- explicit uncertainty and model limitations.

Expected portfolio emphasis:

| Area | Target emphasis |
| --- | ---: |
| Java backend, persistence, and reliability | 60% |
| AI application integration and evaluation | 25% |
| Model serving and GPU deployment | 15% |

## 3. Product Claim

The system may state:

> The platform produces model-based auxiliary signals for likely synthetic or
> likely authentic images, records how those signals were produced, and routes
> uncertain or incorrect results through reproducible evaluation and human
> review.

The system must not state that it proves origin, provides legal-grade forensic
evidence, detects every generator, or replaces human judgment.

## 4. Capability Boundary

### 4.1 Formal Product Capabilities

- JPEG, PNG, and WebP upload with content and resource validation.
- Immutable asset digest and generated non-public storage path.
- Durable asynchronous image detection through PostgreSQL and Redis Streams.
- Versioned Java-to-Python inference contract.
- Detection execution lease, fencing token, retry, and recovery behavior.
- Prediction provenance, threshold, latency, model version, and report history.
- Model registry and health inspection.
- Labeled image evaluation runs with per-sample results and aggregate metrics.
- Review queue for uncertain detections, evaluation errors, and operational
  failures.
- Correlated logs, bounded metrics, and server deployment evidence.

### 4.2 Showcase-Only Capabilities

- Video timeline and segment-detection UI.
- Video pipeline editor.
- Expert ensemble and generator-specific LoRA visual concepts.
- Experimental visualizations without a backend contract.

Showcase pages may remain under a development route. They must not appear in
the formal product navigation, core README capability list, API documentation,
or interview demo path.

### 4.3 Explicit Non-Goals

- Video, audio, or text deepfake detection.
- Model training, fine-tuning, or SOTA research.
- Automatic retraining from reviewer feedback.
- Automatic synthetic or similar-sample generation.
- Legal certification or automated enforcement decisions.
- Multi-tenancy, billing, complex RBAC, or organization management.
- Kafka, Kubernetes, service mesh, or premature microservice decomposition.
- More production models before one model has reproducible benchmark evidence.

## 5. Current Baseline

As of `main` commit `108e610`:

- transactional outbox and versioned Redis delivery are implemented;
- detection execution uses short transactions, leases, and fencing tokens;
- upload inspection and generated evidence storage are implemented;
- frontend dependency audit reports zero findings;
- Java has 116 passing tests, frontend has 8, model service has 6, and smoke
  tooling has 3;
- model weights and Docker-backed infrastructure verification remain deferred;
- evaluation execution still uses a deterministic CRC client and a long
  transaction;
- formal frontend routes still expose mock video behavior;
- the legacy anomaly page is mock-only, while the newer Review page reads real
  detection and evaluation failures;
- correlation, metrics, model resilience, Problem Details, and real
  PostgreSQL/Redis integration tests are not implemented.

## 6. Target Architecture

```text
React application
  -> Spring Boot modular monolith
       -> secure image ingestion
       -> detection orchestration
       -> evaluation orchestration
       -> review-case workflow
       -> model registry and resilience boundary
       -> operational API and telemetry
       -> PostgreSQL system of record
       -> Redis Streams delivery
       -> StorageService evidence bytes
       -> Python model-service contract
            -> heuristic local runtime
            -> proven ONNX/CUDA runtime on server
```

Java owns business state, retries, concurrency, audit history, and reporting.
Python owns preprocessing, model loading, inference, and runtime health. Redis
is transport state, PostgreSQL is business truth, and storage owns evidence
bytes.

## 7. Review Queue And Anomaly Pool

The anomaly pool is a formal product capability, implemented as a filtered view
of a durable review workflow rather than a standalone mock page.

### 7.1 Entry Reasons

- detection verdict is `UNCERTAIN`;
- score is within a configured distance of the decision threshold;
- evaluation prediction is incorrect;
- detection or evaluation execution fails;
- an operator explicitly requests review;
- later, multiple model results disagree.

The first release does not require out-of-distribution scoring or multiple
models.

### 7.2 Review State

```text
OPEN -> CLAIMED -> RESOLVED
  |         |
  +---------+-> SKIPPED
```

`review_case` records source type and id, task and asset, model and version,
reason code, original label and score, threshold, assignee, resolution label,
note, timestamps, and optimistic-lock version.

One source and reason may have only one active case. Resolution appends audit
history; it does not overwrite the original model result. Reviewer labels may
enter a candidate evaluation dataset only through an explicit curation step.

## 8. Delivery Roadmap

Each item uses one focused branch, one PR, required tests, CI, and squash merge.

### Phase 1: Product Truthfulness

Branch: `refactor/product-scope-truthfulness`

- Remove video and unsupported concepts from formal navigation.
- Move retained visual concepts under `/dev/showcase`.
- Remove mock dependencies from formal report and management workflows.
- Add a capability matrix with `Implemented`, `Server Pending`, `Showcase`, and
  `Non-goal` states.
- Reconcile README, API wording, state machines, and actual configuration.

Exit evidence: every formal UI capability maps to a real API or an explicit
server-pending state; route and navigation tests prevent regression.

### Phase 2: Real Evaluation Execution Boundary

Branch: `feature/evaluation-real-execution-boundary`

- Replace the default CRC client with the formal model-service adapter.
- Keep deterministic behavior only as an explicitly selected test adapter.
- Split claim, inference, and persistence into short transactions.
- Add evaluation attempt token, lease, and stale-write fencing.
- Persist model version, threshold, runtime identity, dataset manifest digest,
  and per-sample latency.
- Dispatch evaluation work durably instead of executing the batch in an HTTP
  transaction.

Exit evidence: a heuristic FastAPI runtime can execute a real evaluation batch
without weights; partial failure, retry, crash recovery, and stale completion
are tested.

### Phase 3: Durable Review Queue

Branch: `feature/review-case-workflow`

- Add review tables, state transitions, reason codes, and uniqueness rules.
- Create cases from uncertain detections, wrong evaluation samples, and failed
  work.
- Add bounded list, claim, resolve, skip, and history APIs.
- Evolve the existing Review page into the formal review center.
- Remove the legacy mock anomaly implementation.

Exit evidence: concurrent claim is safe, duplicate active cases are prevented,
and every resolution retains model and reviewer provenance.

### Phase 4: Model Call Resilience

Branch: `feature/model-call-resilience`

- Classify connection, timeout, 429, 4xx, 5xx, invalid response, and internal
  persistence failures.
- Retry only connection failures, timeouts, 429, and 5xx with bounded backoff.
- Add per-model circuit breaker and semaphore bulkhead.
- Sanitize and truncate remote response bodies.
- Persist stable error code, attempt count, and final failure category.

Exit evidence: controlled HTTP tests prove retry inclusion and exclusion,
circuit opening and recovery, concurrency limits, and interrupt preservation.

### Phase 5: Correlation And Metrics

Branch: `feature/observability-correlation`

- Use Spring Actuator and Micrometer Observation as the base.
- Correlate HTTP, outbox, Redis, detection, evaluation, review, and model calls.
- Add low-cardinality counters and timers for queue outcomes, retries, model
  latency, evaluation throughput, and upload rejection categories.
- Keep task ids in logs, not metric tags.
- Expose only approved health and metrics endpoints.

Exit evidence: one task can be followed end to end by correlation id, and each
reliability feature has an operational signal.

### Phase 6: API Contract And Operations Safety

Branches:

- `refactor/problem-details-api`
- `feature/operations-access-control`

- Adopt RFC 9457 errors with stable error code and trace id.
- Add bounded pagination to growing collections.
- Add `Location` for accepted asynchronous work.
- Protect operations APIs with a small deployment-appropriate API key or
  operator role; do not build a general identity platform.
- Keep OpenAPI synchronized and add contract tests.

### Phase 7: Docker-Backed Infrastructure Verification

Branch: `test/postgres-redis-testcontainers`

This phase starts only when Docker is available.

- Run Flyway and repositories against PostgreSQL.
- Run Redis Stream publication, pending recovery, and dead-letter tests.
- Test concurrent outbox claims, duplicate delivery, process-like interruption,
  and lease expiry.
- Add a separate integration-test CI job when the suite is stable.

### Phase 8: Proven Model Deployment

Branches:

- `feature/real-model-deployment`
- `feature/reproducible-model-benchmark`

- Select one maintained, licensed open-source image detector with suitable
  published performance and 3090-compatible weights.
- Pin repository revision, weight digest, preprocessing version, and runtime.
- Deploy ONNX Runtime CUDA first; add TensorRT only if measured evidence
  justifies the complexity.
- Benchmark public labeled data by generator and common degradation.
- Record accuracy, precision, recall, F1, confusion matrix, throughput, P50/P95
  latency, peak VRAM, warm-up, and concurrency.
- Publish limitations and failure examples alongside aggregate metrics.

Model performance improvement is not required. Reproducible use of a strong
existing model is the acceptance criterion.

## 9. Deferred Until Server Environment

- Real weights and CUDA verification.
- Prometheus, Grafana, and OpenTelemetry Collector deployment.
- ClamAV or sandbox scanning.
- Object storage or MinIO adapter.
- Load, soak, and controlled failure experiments.
- Lease and timeout tuning from measured model latency.

Local code may define interfaces and tests for these boundaries but must not
claim runtime verification before evidence exists.

## 10. Engineering Standards

- Business code remains Java; Python contains model-runtime logic only.
- The Java backend remains a modular monolith.
- No database transaction spans external HTTP calls.
- Every asynchronous command has durable state and an idempotency boundary.
- Every state machine rejects invalid transitions explicitly.
- Every growing query is bounded.
- Errors use stable categories and never expose unbounded remote payloads.
- Telemetry excludes image bytes, raw evidence, secrets, and high-cardinality
  identifiers from metric tags.
- Feature branches update tests, durable docs, and the worklog.
- Completion requires local verification, PR CI, and merge evidence.

## 11. Portfolio Acceptance

The project is interview-ready when a reviewer can reproduce this narrative:

1. Upload a validated image and inspect its immutable digest.
2. Observe durable dispatch and recover from a simulated Redis outage.
3. Execute detection without a long database transaction.
4. Inspect model provenance and a qualified report.
5. Run a labeled evaluation batch through the same model boundary.
6. Review an uncertain or wrong sample with audit history.
7. Trace one task and inspect latency, retry, and queue metrics.
8. Start the server deployment with a pinned real model.
9. Read a benchmark report that includes both results and limitations.

The demonstration must use real persisted state. Showcase animation is not
accepted as evidence for a formal capability.

## 12. Immediate Next Step

The next implementation specification and plan cover only Phase 1:
`refactor/product-scope-truthfulness`. Later phases receive independent design
and implementation plans at their branch boundary.
