# Real Evaluation Execution Boundary

- Status: Approved design
- Owners: Project maintainers
- Last reviewed: 2026-07-11
- Target branch: `feature/evaluation-real-execution-boundary`

## 1. Purpose

This specification turns the existing manifest-based evaluation demo into a
real, recoverable execution path. It defines how uploaded image assets are
assembled into an evaluation dataset, dispatched through Redis, evaluated by
the configured model service, and persisted with enough provenance to compare
results later.

The implementation deliberately does not download model weights. Development
may use the explicitly identified heuristic runtime, but it must use the same
Java orchestration, HTTP model contract, persistence, retry, and observability
boundaries that a GPU runtime will use.

This is the second delivery phase in
`docs/superpowers/specs/2026-07-11-ai-application-product-roadmap-design.md`.

## 2. Current Problem

The existing evaluation module is useful scaffolding but is not a real model
evaluation system:

- its CSV manifest identifies samples only by display filename;
- filenames are not resolved to uploaded `media_asset` records;
- `DeterministicEvaluationModelClient` derives a score from the model ID and
  filename rather than image content;
- the controller executes the complete batch inside an HTTP request;
- model calls and result writes occur inside one database transaction;
- retry skips samples with predictions, but has no lease or fencing token;
- model version, threshold, runtime identity, and dataset digest are absent;
- partial results cannot be distinguished from a complete evaluation.

The result is a deterministic demonstration, not evidence that the model
service evaluated the declared dataset.

## 3. Decisions

### 3.1 Dataset identity

An evaluation manifest references images that have already crossed the secure
upload boundary:

```csv
assetId,groundTruthLabel
asset_abc123,AUTHENTIC
asset_def456,SYNTHETIC
```

The service resolves each `assetId` through `MediaAssetRepository`. It never
accepts a client-provided filesystem path. The original filename is copied as
display metadata and is never used to build a storage path.

The canonical manifest is produced from validated rows in their submitted
order, with normalized line endings and enum labels. Its SHA-256 digest and
schema version are stored on the evaluation run. This makes dataset identity
stable without introducing a separate dataset aggregate in this phase.

Creation constraints:

- schema version is `1`;
- required columns are exactly `assetId` and `groundTruthLabel`;
- labels are `AUTHENTIC` or `SYNTHETIC`;
- every asset must exist before the run is created;
- duplicate asset IDs are rejected;
- the manifest contains between 1 and 500 sample rows;
- predictions, scores, latency, and paths are never accepted from the client.

### 3.2 Execution granularity

One durable message represents one evaluation run. A worker claims the run and
processes unresolved samples sequentially. Each sample result is persisted in
a short transaction immediately after inference.

This provides crash recovery and partial progress without introducing the
coordination cost of one queue message per sample. Sample-level parallelism is
deferred until measured GPU throughput shows that it is needed.

### 3.3 Source of truth

PostgreSQL is the source of business truth. Redis Streams transports wake-up
messages and may deliver the same message more than once. Correctness must not
depend on exactly-once Redis delivery.

### 3.4 Model boundary

Evaluation reuses the production `ModelInferenceClient` contract. The worker
resolves a validated asset storage path and a snapshot of model endpoint and
threshold, then invokes the model outside a database transaction.

The deterministic filename client is removed from the formal evaluation path.
The local heuristic model service remains permitted only when its response and
stored provenance clearly identify a development runtime.

## 4. Alternatives Considered

### 4.1 Run-level message with sample checkpoints

Selected. It has bounded infrastructure complexity, preserves progress after a
crash, and demonstrates reliable orchestration without making queue topology
the product.

### 4.2 One message per sample

Rejected for this phase. It improves horizontal parallelism but requires fan
out, completion coordination, queue backpressure, event cardinality controls,
and more complex cancellation semantics. Those costs are not justified for a
500-sample local evaluation.

### 4.3 Synchronous HTTP execution

Rejected. It couples batch duration to request timeouts, retains long database
transactions, and makes process restart recovery ambiguous.

### 4.4 Server-local dataset paths or ZIP upload

Rejected. Arbitrary paths violate the upload trust boundary. ZIP ingestion
adds archive traversal, expansion limits, cleanup, and storage lifecycle work
that is independent of reliable evaluation execution.

## 5. Architecture

```text
EvaluationController
  -> EvaluationApplicationService
       -> validate model and assets
       -> save run and samples
       -> save EVALUATION_REQUESTED outbox event

OutboxPublisher
  -> Redis Stream
       -> EvaluationJobConsumer
            -> EvaluationExecutionService
                 -> EvaluationExecutionTransactionService.claim()
                 -> ModelInferenceClient.predict() outside transaction
                 -> EvaluationExecutionTransactionService.completeSample()
                 -> renewLease() when required
                 -> finalizeRun()
```

Responsibilities are separated as follows:

- `EvaluationApplicationService`: command validation, creation, retry request,
  and read models.
- `EvaluationManifestParser`: structured parsing, schema validation,
  canonicalization, row limits, and digest calculation.
- `EvaluationExecutionService`: non-transactional orchestration and model
  invocation.
- `EvaluationExecutionTransactionService`: locked claims, leases, fenced
  sample writes, retries, and finalization in short transactions.
- `EvaluationJobConsumer`: Redis acknowledgement policy and duplicate-safe job
  handoff.
- `EvaluationMetricsCalculator`: deterministic metrics over completed sample
  results only.

No component other than the transaction service owns execution-state
transitions.

## 6. Data Model

### 6.1 `evaluation_run`

Add or formalize these fields:

| Field | Purpose |
| --- | --- |
| `manifest_sha256` | Digest of the canonical validated manifest |
| `manifest_schema_version` | Manifest contract version, initially `1` |
| `model_endpoint_url` | Endpoint snapshot used by this run |
| `threshold` | Threshold snapshot used by this run |
| `runtime_id` | Runtime identity reported by the model service |
| `model_version` | Actual model version reported during execution |
| `failed_samples` | Terminal failed sample count |
| `execution_token` | Fencing token owned by the active worker |
| `lease_expires_at` | Time after which another worker may claim the run |
| `version` | JPA optimistic-lock version |

Endpoint values are operationally sensitive and are not returned by public
read APIs. The endpoint snapshot prevents registry edits from changing a run
that is already queued.

### 6.2 `evaluation_sample`

Add or formalize these fields:

| Field | Purpose |
| --- | --- |
| `asset_id` | Existing uploaded asset used for inference |
| `display_filename` | Immutable display metadata copied from the asset |
| `status` | `PENDING`, `COMPLETED`, or `FAILED` |
| `ground_truth_label` | Validated binary reference label |
| `predicted_label` | Model label for a completed sample |
| `raw_score` | Score before client normalization |
| `normalized_score` | Comparable score in the formal client contract |
| `threshold` | Threshold used for this prediction |
| `latency_ms` | Model-service latency |
| `model_version` | Version reported for this prediction |
| `runtime_id` | Runtime reported for this prediction |
| `raw_response_json` | Bounded response provenance |
| `attempt_count` | Number of inference attempts for the sample |
| `failure_code` | Stable machine-readable failure classification |
| `failure_reason` | Bounded safe diagnostic message |
| `completed_at` | Terminal result timestamp |
| `execution_token` | Run attempt that produced the terminal write |

The database enforces uniqueness of `(evaluation_id, asset_id)` and a foreign
key from `evaluation_sample.asset_id` to `media_asset.asset_id` with deletion
restricted. Application validation still produces a stable API error before a
database constraint can fail.

### 6.3 Migration compatibility

Existing evaluation rows came from a filename-only demo and cannot prove asset
identity. The migration must preserve them for history but mark their schema as
legacy and non-executable. New execution endpoints reject legacy runs with the
stable error code `LEGACY_MANIFEST_UNRESOLVED`.

No migration invents asset IDs or silently matches assets by filename.

## 7. State Machines

### 7.1 Run state

```text
QUEUED -> RUNNING -> COMPLETED
                  -> PARTIALLY_COMPLETED
                  -> FAILED
FAILED -> QUEUED  (explicit retry while attempts remain)
PARTIALLY_COMPLETED -> QUEUED (explicit retry of retryable failed samples)
```

Definitions:

- `COMPLETED`: every sample completed successfully.
- `PARTIALLY_COMPLETED`: all samples are terminal and at least one failed, but
  at least one valid prediction exists.
- `FAILED`: the run cannot produce reliable results, or no sample completed.
- `QUEUED`: a durable execution request exists or is ready to be published.
- `RUNNING`: a worker owns a non-expired lease.

Changing dataset, model, or threshold requires a new evaluation run. Retry
never changes the identity of the original experiment.

### 7.2 Sample state

```text
PENDING -> COMPLETED
PENDING -> FAILED
FAILED  -> PENDING  (explicit retry when failure is retryable)
```

A `COMPLETED` sample is immutable within its evaluation run. Automatic retries
are internal attempts while the sample remains under active execution; an
exhausted sample becomes `FAILED`.

## 8. Execution Flow

### 8.1 Create

Within one transaction:

1. Parse and validate the manifest.
2. Load the selected enabled model.
3. Resolve all asset IDs and reject missing or duplicate assets.
4. Canonicalize the manifest and calculate its digest.
5. Snapshot model ID, endpoint, and threshold.
6. Save the queued run and pending samples.
7. Save an `EVALUATION_REQUESTED` outbox event.

The API returns `202 Accepted` after the transaction commits.

### 8.2 Claim

The worker locks the run row in a short transaction:

- terminal runs return `TERMINAL`;
- a run with a live lease returns `BUSY`;
- an eligible run receives a new unpredictable execution token and lease;
- the claim returns an immutable execution plan containing only required data.

Default lease duration is five minutes and is configurable. The worker renews
the lease before half of the remaining duration is consumed.

### 8.3 Process sample

For each unresolved sample:

1. Resolve its trusted `MediaAsset.storagePath`.
2. Call `ModelInferenceClient.predict()` outside a transaction.
3. Classify any exception as transient or permanent.
4. Retry transient failures with bounded exponential backoff and jitter.
5. Persist a completed or exhausted result in a short fenced transaction.

The fenced transaction checks that the run still owns the supplied token. A
stale worker returns `STALE` and stops processing immediately.

### 8.4 Finalize

After all samples are terminal, a locked short transaction:

- counts completed and failed samples;
- calculates metrics over completed samples;
- calculates coverage over all declared samples;
- validates that model runtime provenance is internally consistent;
- clears the execution lease and token;
- sets `COMPLETED`, `PARTIALLY_COMPLETED`, or `FAILED`.

Finalization is idempotent.

## 9. Retry And Failure Policy

### 9.1 Failure classes

| Class | Examples | Policy |
| --- | --- | --- |
| Transient model error | timeout, connection reset, HTTP 429 or 5xx | Up to 3 attempts with backoff |
| Permanent sample error | unsupported image, corrupt input, validation rejection | Fail sample without automatic retry |
| Contract error | malformed JSON, missing required model fields | Fail sample and expose stable code |
| Configuration error | model missing, disabled, or invalid endpoint snapshot | Fail run |
| Infrastructure error | database or Redis unavailable | Do not acknowledge message; recover by redelivery |
| Stale ownership | token mismatch after lease takeover | Reject write and stop old worker |

Retry delays are configurable and deterministic under tests. Production uses
jitter to avoid synchronized retry bursts.

### 9.2 Safe diagnostics

Errors persist a stable code and a message capped at 2,048 characters. Messages
must not contain stack traces, authorization headers, model endpoint secrets,
or absolute storage paths. Full exceptions remain in protected structured
logs.

## 10. Metrics

The run stores or returns:

- accuracy;
- precision;
- recall;
- F1;
- true-positive, false-positive, true-negative, and false-negative counts;
- coverage: `completedSamples / totalSamples`;
- completed and failed sample counts.

Classification metrics are calculated only from completed samples. Coverage is
always returned beside them so incomplete data cannot appear to be a complete
benchmark. A run with zero completed samples has no classification metrics.

## 11. API Contract

### 11.1 Commands

- `POST /api/evaluations`: validate, create, and queue a run; return `202` with
  the created run resource.
- `POST /api/evaluations/{evaluationId}/retry`: queue retryable failed samples;
  return `202`.

The existing synchronous `/run` endpoint remains available for one documented
compatibility cycle, delegates to asynchronous dispatch, and is marked
deprecated. It must not execute inference in the request thread.

### 11.2 Queries

- `GET /api/evaluations`: paged summary list.
- `GET /api/evaluations/{evaluationId}`: run status, progress, metrics,
  coverage, manifest digest, model provenance, and safe failure details.
- `GET /api/evaluations/{evaluationId}/samples`: paged samples with optional
  `status` and `correct` filters.

Public responses never expose model endpoint URLs or storage paths.

### 11.3 Frontend behavior

The existing visual style remains unchanged. The evaluation workbench:

- creates manifests with asset IDs rather than filenames;
- treats command responses as accepted work, not completed results;
- polls with bounded intervals while a run is queued or running;
- displays completed, failed, total, and coverage independently;
- distinguishes partial completion from success;
- identifies `development/heuristic` runtime results visibly;
- paginates samples and preserves stable error-code explanations.

No evidence, heatmap, or confidence explanation is synthesized by the UI.

## 12. Observability

Structured execution logs include:

- `evaluationId`;
- `sampleId`;
- `assetId`;
- `modelId`;
- `executionToken`;
- attempt number;
- failure code.

Micrometer metrics include:

- evaluation runs started and completed by status;
- sample inference latency;
- completed and failed sample counts;
- model retries;
- lease takeovers;
- stale write rejections;
- outbox age and Redis stream backlog.

OpenTelemetry boundaries are reserved around API command handling, outbox
publication, Redis consumption, and model HTTP calls. Actuator health details
must not reveal endpoints, paths, or exception stacks.

## 13. Verification Strategy

### 13.1 Unit tests

- manifest schema, row bounds, duplicates, canonicalization, and digest;
- run and sample state transitions;
- failure classification and bounded backoff;
- confusion matrix, classification metrics, and coverage;
- safe failure-message truncation.

### 13.2 Service tests

- missing assets and disabled models are rejected atomically;
- endpoint and threshold snapshots do not change after registry edits;
- completed samples remain immutable;
- retries select only eligible failed or pending samples;
- finalization is idempotent.

### 13.3 Concurrency and integration tests

With PostgreSQL and Redis Testcontainers when Docker is available:

- duplicate stream messages produce one active owner;
- a live lease prevents a second claim;
- an expired lease permits takeover;
- a stale token cannot persist a sample or finalize a run;
- outbox publication recovers after Redis unavailability;
- Flyway migration works from the current schema.

### 13.4 Model contract tests

WireMock covers successful inference, timeout, HTTP 429, HTTP 5xx, permanent
client error, malformed JSON, and missing provenance fields.

### 13.5 Frontend tests

Cover queued, running, completed, partially completed, and failed views;
polling cleanup; development-runtime disclosure; pagination; and API errors.

Existing Java, model-service, smoke, lint, and frontend suites remain required
regression gates.

## 14. Delivery Slices

Implementation remains on one feature branch but is committed in reviewable
slices:

1. migration and domain state machines;
2. versioned manifest parser and asset validation;
3. outbox event and asynchronous API commands;
4. leased, fenced execution transactions;
5. real model-client adapter and retry classification;
6. metrics, provenance, and paged query contract;
7. Redis consumer and recovery behavior;
8. frontend contract adaptation;
9. observability, documentation, and full verification.

Each slice adds tests before implementation and leaves the branch buildable.

## 15. Explicit Non-Goals

This phase does not:

- download or benchmark production model weights;
- claim SOTA accuracy;
- accept arbitrary paths or ZIP datasets;
- implement model training or hyperparameter search;
- implement sample-level distributed fan-out;
- add Kafka, a workflow engine, or new microservices;
- fabricate evidence, heatmaps, explanations, or benchmark conclusions;
- present heuristic-runtime output as production model performance.

## 16. Acceptance Criteria

The phase is complete when:

1. every executable sample resolves to a trusted uploaded asset;
2. run creation and dispatch are durable across Redis interruption;
3. model HTTP calls occur outside database transactions;
4. sample progress survives Java process interruption;
5. duplicate delivery and stale workers cannot overwrite valid results;
6. retry resumes only eligible work;
7. metrics include coverage and reproducible model/dataset provenance;
8. development runtime identity is visible and truthful;
9. CPU/local and future GPU deployments share the same Java contract;
10. automated tests demonstrate the success and recovery paths.
