# Real Evaluation Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace filename-derived evaluation results with durable, asset-backed, asynchronous model execution that survives duplicate delivery and worker restart.

**Architecture:** PostgreSQL remains the source of truth. Evaluation creation stores validated asset-backed samples and an outbox event atomically; Redis wakes a worker that claims a leased run, invokes the shared model HTTP client outside transactions, checkpoints each sample with a fencing token, and finalizes reproducible metrics. The frontend submits work asynchronously and polls truthful progress.

**Tech Stack:** Java 21, Spring Boot, Spring Data JPA, Flyway, PostgreSQL/H2 tests, Redis Streams, Jackson CSV, Micrometer, JUnit 5, AssertJ, Mockito, FastAPI/Pydantic, React 19, TypeScript, Node test runner.

## Global Constraints

- Executable manifests use schema version `1` and exactly `assetId,groundTruthLabel` columns.
- Ground-truth labels are only `AUTHENTIC` and `SYNTHETIC`.
- One run accepts 1 through 500 unique uploaded assets.
- Client-provided filesystem paths, predictions, scores, and latency are rejected.
- PostgreSQL is authoritative; Redis delivery is at least once.
- Model HTTP calls never run inside a database transaction.
- The run lease defaults to five minutes and all writes are fenced by an execution token.
- A completed sample is immutable within its run.
- Transient model failures receive at most three attempts with bounded backoff; permanent failures do not retry.
- Public APIs never return model endpoint URLs or storage paths.
- Heuristic execution is identified as `heuristic`; it is never described as production model quality.
- Do not download model weights or require Docker in this plan. Record Testcontainers cases for the later Docker-enabled verification phase.
- Preserve the existing frontend visual language and component conventions.

---

## File Map

### Evaluation domain and persistence

- Create `backend-java/src/main/resources/db/migration/V7__add_real_evaluation_execution.sql`: legacy-safe schema migration, asset foreign key, leases, provenance, counters, and indexes.
- Modify `evaluation/domain/EvaluationStatus.java`: add `PARTIALLY_COMPLETED`.
- Create `evaluation/domain/EvaluationSampleStatus.java`: sample terminal-state vocabulary.
- Modify `evaluation/domain/EvaluationRun.java`: immutable experiment snapshot and leased state machine.
- Modify `evaluation/domain/EvaluationSample.java`: asset identity, result provenance, attempt state, and immutable completion.
- Modify both evaluation repositories: locked run lookup, paged sample lookup, and unresolved sample selection.

### Manifest and application commands

- Create `evaluation/service/EvaluationManifestParser.java`: RFC-style CSV parsing, validation, canonicalization, and SHA-256.
- Create `evaluation/service/ParsedEvaluationManifest.java` and `EvaluationManifestRow.java`: typed parser output.
- Modify `evaluation/service/EvaluationService.java`: create and query real runs; remove client-supplied predictions.
- Modify evaluation DTOs: asynchronous command and paged query contract.

### Dispatch and execution

- Extend `domain/JobOutboxEventType.java`, `domain/JobOutboxEvent.java`, `service/JobOutboxService.java`, and `service/JobOutboxPublisher.java`: `EVALUATION_REQUESTED` support.
- Create `evaluation/job/*`: typed Redis queue request/message, Redis adapter, consumer, and worker.
- Create `evaluation/service/EvaluationExecutionTransactionService.java`: claim, renew, checkpoint, fail, and finalize short transactions.
- Rewrite `evaluation/service/EvaluationExecutionService.java`: transaction-free orchestration and shared model-client calls.
- Remove `evaluation/client/DeterministicEvaluationModelClient.java` and its private evaluation-client contract.

### Model contract, API, UI, and operations

- Modify Java `ModelInferenceResult` and HTTP client: include `runtimeId`.
- Modify Python prediction schema and endpoint: return runtime identity from health metadata.
- Modify evaluation controller and frontend API/types/workbench: `202`, polling, coverage, provenance, and partial completion.
- Add evaluation Micrometer metrics and structured logging.
- Update runbook, capability matrix, worklog, and API documentation.

---

### Task 1: Persist The Real Evaluation State Model

**Files:**
- Create: `backend-java/src/main/resources/db/migration/V7__add_real_evaluation_execution.sql`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/domain/EvaluationSampleStatus.java`
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/domain/EvaluationStatus.java`
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/domain/EvaluationRun.java`
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/domain/EvaluationSample.java`
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/repository/EvaluationRunRepository.java`
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/repository/EvaluationSampleRepository.java`
- Test: `backend-java/src/test/java/com/fengting/aigcforensics/evaluation/domain/EvaluationRunTest.java`
- Test: `backend-java/src/test/java/com/fengting/aigcforensics/evaluation/domain/EvaluationSampleTest.java`
- Test: `backend-java/src/test/java/com/fengting/aigcforensics/evaluation/repository/EvaluationRepositoryTest.java`

**Interfaces:**
- Produces: `EvaluationRun.claimExecution(String, Instant, Instant)`, `renewLease(String, Instant)`, `ownsExecution(String)`, `finalizeExecution(...)`.
- Produces: `EvaluationSample.complete(String, ModelInferenceResult, double, Instant)` and `fail(String, EvaluationFailure, Instant)`.
- Produces: `findByEvaluationIdForUpdate(String)` and paged/unresolved repository queries.

- [ ] **Step 1: Write failing state-machine tests**

```java
@Test
void expiredLeaseCanBeReclaimedAndOldTokenIsRejected() {
    EvaluationRun run = queuedRun();
    assertThat(run.claimExecution("token-1", NOW, NOW.plusSeconds(30))).isTrue();
    assertThat(run.claimExecution("token-2", NOW.plusSeconds(31), NOW.plusSeconds(61))).isTrue();
    assertThat(run.ownsExecution("token-1")).isFalse();
    assertThat(run.ownsExecution("token-2")).isTrue();
}

@Test
void completedSampleCannotBeOverwritten() {
    EvaluationSample sample = pendingSample();
    sample.complete("token-1", inference("heuristic", 0.91), 0.5, NOW);
    assertThatThrownBy(() -> sample.complete("token-2", inference("onnx", 0.20), 0.5, NOW))
            .isInstanceOf(IllegalStateException.class);
}
```

- [ ] **Step 2: Run the focused tests and confirm RED**

Run: `mvn -f backend-java/pom.xml -Dtest=EvaluationRunTest,EvaluationSampleTest test`

Expected: compilation fails because the new state methods and enum do not exist.

- [ ] **Step 3: Add V7 and implement the domain transitions**

The migration must keep legacy rows nullable while making all new writes explicit:

```sql
alter table evaluation_run add column manifest_sha256 varchar(64);
alter table evaluation_run add column manifest_schema_version integer not null default 0;
alter table evaluation_run add column model_endpoint_url varchar(1024);
alter table evaluation_run add column threshold double precision;
alter table evaluation_run add column runtime_id varchar(128);
alter table evaluation_run add column model_version varchar(128);
alter table evaluation_run add column failed_samples integer not null default 0;
alter table evaluation_run add column coverage double precision;
alter table evaluation_run add column true_positive integer;
alter table evaluation_run add column false_positive integer;
alter table evaluation_run add column true_negative integer;
alter table evaluation_run add column false_negative integer;
alter table evaluation_run add column execution_token varchar(64);
alter table evaluation_run add column lease_expires_at timestamp with time zone;
alter table evaluation_run add column version bigint not null default 0;

alter table evaluation_sample rename column filename to display_filename;
alter table evaluation_sample add column asset_id varchar(64);
alter table evaluation_sample add column status varchar(32) not null default 'PENDING';
alter table evaluation_sample add column raw_score double precision;
alter table evaluation_sample rename column score to normalized_score;
alter table evaluation_sample add column threshold double precision;
alter table evaluation_sample add column model_version varchar(128);
alter table evaluation_sample add column runtime_id varchar(128);
alter table evaluation_sample add column raw_response_json text;
alter table evaluation_sample add column attempt_count integer not null default 0;
alter table evaluation_sample add column failure_code varchar(64);
alter table evaluation_sample add column completed_at timestamp with time zone;
alter table evaluation_sample add column execution_token varchar(64);
alter table evaluation_sample add constraint fk_evaluation_sample_asset
    foreign key (asset_id) references media_asset(asset_id) on delete restrict;
create unique index uq_evaluation_sample_run_asset
    on evaluation_sample(evaluation_id, asset_id) where asset_id is not null;
create index idx_evaluation_sample_run_status
    on evaluation_sample(evaluation_id, status, created_at);
```

Implement strict transition methods; reject blank tokens and non-positive lease windows. Map old rows to schema version `0`, which later services treat as non-executable.

- [ ] **Step 4: Run domain and repository tests**

Run: `mvn -f backend-java/pom.xml -Dtest=EvaluationRunTest,EvaluationSampleTest,EvaluationRepositoryTest test`

Expected: PASS, including Flyway/JPA validation and the asset foreign-key test.

- [ ] **Step 5: Commit**

```bash
git add backend-java/src/main/resources/db/migration/V7__add_real_evaluation_execution.sql backend-java/src/main/java/com/fengting/aigcforensics/evaluation backend-java/src/test/java/com/fengting/aigcforensics/evaluation
git commit -m "feat: add durable evaluation state model"
```

### Task 2: Parse Versioned Asset Manifests

**Files:**
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/service/EvaluationManifestRow.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/service/ParsedEvaluationManifest.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/service/EvaluationManifestParser.java`
- Test: `backend-java/src/test/java/com/fengting/aigcforensics/evaluation/service/EvaluationManifestParserTest.java`
- Modify: `backend-java/pom.xml`

**Interfaces:**
- Produces: `ParsedEvaluationManifest parse(String manifest)`.
- Produces: `record EvaluationManifestRow(String assetId, ModelLabel groundTruthLabel)`.
- Produces: `record ParsedEvaluationManifest(int schemaVersion, String sha256, String canonicalCsv, List<EvaluationManifestRow> rows)`.

- [ ] **Step 1: Add failing parser tests**

```java
@Test
void canonicalizesQuotedCsvAndCalculatesStableDigest() {
    ParsedEvaluationManifest first = parser.parse("assetId,groundTruthLabel\r\nasset_a,AUTHENTIC\r\n");
    ParsedEvaluationManifest second = parser.parse("assetId,groundTruthLabel\nasset_a,AUTHENTIC\n");
    assertThat(first.schemaVersion()).isEqualTo(1);
    assertThat(first.canonicalCsv()).isEqualTo("assetId,groundTruthLabel\nasset_a,AUTHENTIC\n");
    assertThat(first.sha256()).isEqualTo(second.sha256());
}

@Test
void rejectsDuplicateAssetsAndClientPredictionColumns() {
    assertThatThrownBy(() -> parser.parse("assetId,groundTruthLabel,predictedLabel\nasset_a,AUTHENTIC,SYNTHETIC"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("exactly assetId,groundTruthLabel");
}
```

- [ ] **Step 2: Run parser tests and confirm RED**

Run: `mvn -f backend-java/pom.xml -Dtest=EvaluationManifestParserTest test`

Expected: compilation fails because the parser types do not exist.

- [ ] **Step 3: Implement with Apache Commons CSV**

Add `org.apache.commons:commons-csv:1.12.0` and parse with explicit headers, duplicate-header rejection, trimming, and bounded records. Build canonical CSV from typed values, then calculate lowercase SHA-256 with `HexFormat`.

```java
public ParsedEvaluationManifest parse(String manifest) {
    List<EvaluationManifestRow> rows = parseRows(manifest);
    requireSize(rows, 1, 500);
    requireUniqueAssets(rows);
    String canonical = canonicalize(rows);
    return new ParsedEvaluationManifest(1, sha256(canonical), canonical, List.copyOf(rows));
}
```

- [ ] **Step 4: Run parser tests**

Run: `mvn -f backend-java/pom.xml -Dtest=EvaluationManifestParserTest test`

Expected: PASS for CRLF normalization, quoted values, malformed rows, illegal labels, duplicate assets, and 500/501 boundaries.

- [ ] **Step 5: Commit**

```bash
git add backend-java/pom.xml backend-java/src/main/java/com/fengting/aigcforensics/evaluation/service backend-java/src/test/java/com/fengting/aigcforensics/evaluation/service/EvaluationManifestParserTest.java
git commit -m "feat: validate asset-backed evaluation manifests"
```

### Task 3: Create Runs And Outbox Events Atomically

**Files:**
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/service/EvaluationService.java`
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/dto/CreateEvaluationRequest.java`
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/domain/JobOutboxEventType.java`
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/domain/JobOutboxEvent.java`
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/service/JobOutboxService.java`
- Test: `backend-java/src/test/java/com/fengting/aigcforensics/evaluation/service/EvaluationServiceTest.java`
- Test: `backend-java/src/test/java/com/fengting/aigcforensics/service/JobOutboxServiceTest.java`

**Interfaces:**
- Consumes: `EvaluationManifestParser.parse(String)` from Task 2.
- Produces: `EvaluationRunResponse createEvaluation(CreateEvaluationRequest)` with a queued run.
- Produces: `JobOutboxEvent scheduleEvaluation(String evaluationId)` and `replayEvaluation(String evaluationId)`.

- [ ] **Step 1: Write atomic-creation tests**

```java
@Test
void createsAssetBackedRunWithModelSnapshotAndOutboxEvent() {
    EvaluationRunResponse response = service.createEvaluation(request("asset_a", "AUTHENTIC"));
    assertThat(response.status()).isEqualTo(EvaluationStatus.QUEUED);
    assertThat(runRepository.findByEvaluationId(response.evaluationId()).orElseThrow().getManifestSchemaVersion()).isEqualTo(1);
    assertThat(outboxRepository.findByEventTypeAndAggregateId(EVALUATION_REQUESTED, response.evaluationId())).isPresent();
}

@Test
void missingAssetRollsBackRunSamplesAndOutbox() {
    assertThatThrownBy(() -> service.createEvaluation(request("asset_missing", "SYNTHETIC")))
            .isInstanceOf(ResourceNotFoundException.class);
    assertThat(runRepository.count()).isZero();
    assertThat(outboxRepository.count()).isZero();
}
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `mvn -f backend-java/pom.xml -Dtest=EvaluationServiceTest,JobOutboxServiceTest test`

Expected: FAIL because evaluation outbox support and asset resolution are absent.

- [ ] **Step 3: Implement atomic creation and generic outbox factory**

Load the enabled model, resolve all assets in one repository query, preserve manifest order with a map, snapshot endpoint/threshold, save pending samples, and schedule the event in the same transaction.

```java
@Transactional
public EvaluationRunResponse createEvaluation(CreateEvaluationRequest request) {
    ParsedEvaluationManifest manifest = manifestParser.parse(request.manifest());
    ModelRegistry model = requireEnabledModel(request.modelId());
    Map<String, MediaAsset> assets = requireAssets(manifest.rows());
    EvaluationRun run = runRepository.save(newRun(request, manifest, model));
    sampleRepository.saveAll(toSamples(run, manifest.rows(), assets));
    outboxService.scheduleEvaluation(run.getEvaluationId());
    return mapper.toRunResponse(run);
}
```

- [ ] **Step 4: Run service and outbox tests**

Run: `mvn -f backend-java/pom.xml -Dtest=EvaluationServiceTest,JobOutboxServiceTest test`

Expected: PASS, including disabled model, missing asset, duplicate event, and transaction rollback cases.

- [ ] **Step 5: Commit**

```bash
git add backend-java/src/main/java/com/fengting/aigcforensics/evaluation backend-java/src/main/java/com/fengting/aigcforensics/domain/JobOutboxEvent* backend-java/src/main/java/com/fengting/aigcforensics/service/JobOutboxService.java backend-java/src/test/java
git commit -m "feat: queue evaluation runs transactionally"
```

### Task 4: Add Leased And Fenced Sample Execution

**Files:**
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/service/EvaluationExecutionClaimStatus.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/service/EvaluationExecutionClaim.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/service/EvaluationExecutionOutcome.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/service/EvaluationExecutionPlan.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/service/EvaluationSamplePlan.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/service/EvaluationFailure.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/service/EvaluationExecutionTransactionService.java`
- Test: `backend-java/src/test/java/com/fengting/aigcforensics/evaluation/service/EvaluationExecutionTransactionServiceTest.java`
- Modify: `backend-java/src/main/resources/application.yml`
- Modify: `backend-java/src/test/resources/application-test.yml`

**Interfaces:**
- Produces: `claim(String evaluationId)`, `renewLease(String evaluationId, String token)`, `completeSample(...)`, `failSample(...)`, and `finalizeRun(...)`.
- Produces: claim statuses `CLAIMED`, `BUSY`, `TERMINAL`, `FAILED`, and write outcome `COMPLETED`, `STALE`.
- Produces: `EvaluationExecutionOutcome` values `COMPLETED`, `PARTIALLY_COMPLETED`, `FAILED`, `BUSY`, `TERMINAL`, and `STALE`.
- Produces: `record EvaluationExecutionClaim(EvaluationExecutionClaimStatus status, EvaluationExecutionPlan plan)` with `isClaimed()` and `toOutcome()`.
- Produces: `record EvaluationFailure(String code, String safeReason, boolean retryable)`.

- [ ] **Step 1: Write failing transaction-boundary tests**

```java
@Test
void staleOwnerCannotCompleteSampleAfterLeaseTakeover() {
    EvaluationExecutionClaim first = service.claim(EVALUATION_ID);
    clock.advance(Duration.ofMinutes(6));
    EvaluationExecutionClaim second = service.claim(EVALUATION_ID);
    assertThat(service.completeSample(EVALUATION_ID, SAMPLE_ID, first.plan().executionToken(), result()))
            .isEqualTo(EvaluationExecutionOutcome.STALE);
    assertThat(service.completeSample(EVALUATION_ID, SAMPLE_ID, second.plan().executionToken(), result()))
            .isEqualTo(EvaluationExecutionOutcome.COMPLETED);
}
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `mvn -f backend-java/pom.xml -Dtest=EvaluationExecutionTransactionServiceTest test`

Expected: compilation fails because transaction service contracts do not exist.

- [ ] **Step 3: Implement short locked transactions**

Use `findByEvaluationIdForUpdate`, a configurable `app.evaluation.execution.lease-duration: 5m`, and `Clock`. A claim returns trusted `Path` values from `MediaAsset`; completion/failure re-locks the run and verifies the token before touching a sample. Finalization calculates counts and metrics from terminal rows and is idempotent.

```java
@Transactional
public EvaluationExecutionClaim claim(String evaluationId) {
    EvaluationRun run = findRunForUpdate(evaluationId);
    return claimEligibleRun(run, Instant.now(clock));
}

@Transactional
public EvaluationExecutionOutcome completeSample(
        String evaluationId,
        String sampleId,
        String executionToken,
        ModelInferenceResult result) {
    EvaluationRun run = findRunForUpdate(evaluationId);
    if (!run.ownsExecution(executionToken)) return EvaluationExecutionOutcome.STALE;
    findSample(evaluationId, sampleId).complete(executionToken, result, run.getThreshold(), Instant.now(clock));
    return EvaluationExecutionOutcome.COMPLETED;
}

@Transactional
public EvaluationExecutionOutcome failSample(
        String evaluationId,
        String sampleId,
        String executionToken,
        EvaluationFailure failure) {
    EvaluationRun run = findRunForUpdate(evaluationId);
    if (!run.ownsExecution(executionToken)) return EvaluationExecutionOutcome.STALE;
    findSample(evaluationId, sampleId).fail(executionToken, failure, Instant.now(clock));
    return EvaluationExecutionOutcome.FAILED;
}
```

- [ ] **Step 4: Run transaction tests**

Run: `mvn -f backend-java/pom.xml -Dtest=EvaluationExecutionTransactionServiceTest,EvaluationMetricsCalculatorTest test`

Expected: PASS for live lease, takeover, stale write, immutable completion, partial completion, zero-success failure, and idempotent finalization.

- [ ] **Step 5: Commit**

```bash
git add backend-java/src/main/java/com/fengting/aigcforensics/evaluation backend-java/src/main/resources/application.yml backend-java/src/test
git commit -m "feat: fence evaluation execution with leases"
```

### Task 5: Invoke The Shared Model Contract With Bounded Retry

**Files:**
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/client/ModelInferenceResult.java`
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/client/HttpModelInferenceClient.java`
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/client/ModelInferenceException.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/service/EvaluationFailureClassifier.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/service/EvaluationRetryPolicy.java`
- Rewrite: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/service/EvaluationExecutionService.java`
- Delete: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/client/*`
- Modify: `model-services/nonescape-mini/app/schemas.py`
- Modify: `model-services/nonescape-mini/app/main.py`
- Test: `backend-java/src/test/java/com/fengting/aigcforensics/evaluation/service/EvaluationExecutionServiceTest.java`
- Test: `backend-java/src/test/java/com/fengting/aigcforensics/client/HttpModelInferenceClientTest.java`
- Test: `model-services/nonescape-mini/tests/test_api.py`

**Interfaces:**
- Produces: `ModelInferenceResult(String runtimeId, String modelVersion, double rawScore, double normalizedScore, ModelLabel label, int latencyMs, String rawResponseJson)`.
- Produces: `EvaluationFailure classify(RuntimeException)` with code, safe reason, and retryable flag.

- [ ] **Step 1: Write failing orchestration and contract tests**

```java
@Test
void retriesTransientFailureThenCheckpointsSuccessfulResult() {
    when(client.predict(anyString(), any())).thenThrow(new ModelInferenceException("timeout", 504)).thenReturn(result());
    assertThat(service.runEvaluation(EVALUATION_ID)).isEqualTo(EvaluationExecutionOutcome.COMPLETED);
    verify(client, times(2)).predict(anyString(), any());
    verify(transactionService).completeSample(eq(EVALUATION_ID), eq(SAMPLE_ID), anyString(), eq(result()));
}

@Test
void permanentClientFailureDoesNotRetry() {
    when(client.predict(anyString(), any())).thenThrow(new ModelInferenceException("unsupported image", 400));
    service.runEvaluation(EVALUATION_ID);
    verify(client).predict(anyString(), any());
}
```

Python response assertion:

```python
assert response.json()["runtimeId"] == "heuristic"
```

- [ ] **Step 2: Run focused Java and Python tests and confirm RED**

Run: `mvn -f backend-java/pom.xml -Dtest=EvaluationExecutionServiceTest,HttpModelInferenceClientTest test`

Run: `python -m pytest model-services/nonescape-mini/tests/test_api.py -q`

Expected: Java compilation fails and Python assertion fails because `runtimeId` and status-aware failures are absent.

- [ ] **Step 3: Implement orchestration outside transactions**

`EvaluationExecutionService` must have no `@Transactional` annotation. It claims once, invokes the client using each trusted plan, renews leases between samples, stops on `STALE`, and finalizes after all sample plans reach a terminal state.

```java
public EvaluationExecutionOutcome runEvaluation(String evaluationId) {
    EvaluationExecutionClaim claim = transactions.claim(evaluationId);
    if (!claim.isClaimed()) return claim.toOutcome();
    for (EvaluationSamplePlan sample : claim.plan().samples()) {
        EvaluationExecutionOutcome outcome = executeSample(claim.plan(), sample);
        if (outcome == EvaluationExecutionOutcome.STALE) return outcome;
        transactions.renewLease(evaluationId, claim.plan().executionToken());
    }
    return transactions.finalizeRun(evaluationId, claim.plan().executionToken());
}
```

The Python endpoint obtains `runtime.health().runtime` and returns it as `runtimeId`. Extend `ModelInferenceException` with an optional HTTP status so 429/5xx/timeouts are retryable and 4xx/contract errors are permanent.

- [ ] **Step 4: Run Java and Python tests**

Run: `mvn -f backend-java/pom.xml -Dtest=EvaluationExecutionServiceTest,HttpModelInferenceClientTest test`

Run: `python -m pytest model-services/nonescape-mini/tests -q`

Expected: PASS with explicit heuristic runtime identity and bounded retry behavior.

- [ ] **Step 5: Commit**

```bash
git add backend-java/src model-services/nonescape-mini
git commit -m "feat: execute evaluation samples through model service"
```

### Task 6: Deliver Evaluation Jobs Through Redis

**Files:**
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/config/EvaluationJobRedisProperties.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/job/EvaluationJobRequest.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/job/EvaluationJobMessage.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/job/EvaluationJobQueue.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/job/EvaluationJobConsumer.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/job/RedisEvaluationJobQueue.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/job/EvaluationJobWorker.java`
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/service/JobOutboxPublisher.java`
- Modify: `backend-java/src/main/resources/application.yml`
- Test: `backend-java/src/test/java/com/fengting/aigcforensics/evaluation/job/RedisEvaluationJobQueueTest.java`
- Test: `backend-java/src/test/java/com/fengting/aigcforensics/evaluation/job/EvaluationJobWorkerTest.java`
- Modify: `backend-java/src/test/java/com/fengting/aigcforensics/service/JobOutboxPublisherTest.java`

**Interfaces:**
- Produces: `enqueue(EvaluationJobRequest)`, `poll()`, and `acknowledge(EvaluationJobMessage)`.
- Consumes: `EvaluationExecutionService.runEvaluation(String)` from Task 5.

- [ ] **Step 1: Write failing publisher, queue, and worker tests**

```java
@Test
void acknowledgesTerminalAndCompletedOutcomesButLeavesBusyPending() {
    when(consumer.poll()).thenReturn(Optional.of(message));
    when(execution.runEvaluation(EVALUATION_ID)).thenReturn(EvaluationExecutionOutcome.BUSY);
    worker.pollOnce();
    verify(consumer, never()).acknowledge(any());
}

@Test
void duplicateEventIdIsEnqueuedOnce() {
    queue.enqueue(request);
    queue.enqueue(request);
    assertThat(streamEntries()).hasSize(1);
}
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `mvn -f backend-java/pom.xml -Dtest=JobOutboxPublisherTest,RedisEvaluationJobQueueTest,EvaluationJobWorkerTest test`

Expected: compilation fails because evaluation Redis contracts do not exist.

- [ ] **Step 3: Implement the evaluation stream adapter**

Use keys `evaluation:jobs`, group `evaluation-workers`, dead letter stream `evaluation:jobs:dead-letter`, and submitted prefix `evaluation:jobs:submitted:`. Preserve event version, occurrence time, pending claim, dead-letter, and deduplication behavior from the proven detection queue. The worker acknowledges `COMPLETED`, `PARTIALLY_COMPLETED`, `FAILED`, `TERMINAL`, and `STALE`; it leaves `BUSY` pending for later claim.

```java
@Scheduled(fixedDelayString = "${app.evaluation.jobs.poll-delay-ms:1000}")
public void pollOnce() {
    consumer.poll().ifPresent(message -> {
        EvaluationExecutionOutcome outcome = executionService.runEvaluation(message.evaluationId());
        if (outcome != EvaluationExecutionOutcome.BUSY) {
            consumer.acknowledge(message);
        }
    });
}
```

```yaml
app:
  evaluation:
    jobs:
      worker-enabled: ${APP_EVALUATION_JOBS_WORKER_ENABLED:true}
      poll-delay-ms: ${APP_EVALUATION_JOBS_POLL_DELAY_MS:1000}
      redis:
        stream-key: ${APP_EVALUATION_JOBS_REDIS_STREAM_KEY:evaluation:jobs}
        group-name: ${APP_EVALUATION_JOBS_REDIS_GROUP_NAME:evaluation-workers}
        dead-letter-stream-key: ${APP_EVALUATION_JOBS_REDIS_DEAD_LETTER_STREAM_KEY:evaluation:jobs:dead-letter}
```

- [ ] **Step 4: Run queue tests and existing detection queue regression tests**

Run: `mvn -f backend-java/pom.xml -Dtest=JobOutboxPublisherTest,RedisEvaluationJobQueueTest,EvaluationJobWorkerTest,RedisDetectionJobQueueTest,DetectionJobWorkerTest test`

Expected: PASS with both job types independently routed.

- [ ] **Step 5: Commit**

```bash
git add backend-java/src/main/java/com/fengting/aigcforensics/config backend-java/src/main/java/com/fengting/aigcforensics/evaluation/job backend-java/src/main/java/com/fengting/aigcforensics/service/JobOutboxPublisher.java backend-java/src/main/resources backend-java/src/test
git commit -m "feat: dispatch evaluation jobs through redis"
```

### Task 7: Expose Asynchronous And Paged Evaluation APIs

**Files:**
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/controller/EvaluationController.java`
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/service/EvaluationService.java`
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/dto/EvaluationRunResponse.java`
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/dto/EvaluationDetailResponse.java`
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/dto/EvaluationSampleResponse.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/dto/EvaluationPageResponse.java`
- Test: `backend-java/src/test/java/com/fengting/aigcforensics/evaluation/controller/EvaluationControllerTest.java`

**Interfaces:**
- Produces: `202 Accepted` create/retry commands.
- Produces: paged list and sample resources with `page`, `size`, `totalElements`, and `totalPages`.

- [ ] **Step 1: Write failing MockMvc contract tests**

```java
mockMvc.perform(post("/api/evaluations").contentType(APPLICATION_JSON).content(validRequest))
        .andExpect(status().isAccepted())
        .andExpect(jsonPath("$.status").value("QUEUED"));

mockMvc.perform(get("/api/evaluations/{id}/samples", EVALUATION_ID)
                .param("status", "FAILED").param("page", "0").param("size", "25"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content").isArray())
        .andExpect(jsonPath("$.size").value(25));
```

- [ ] **Step 2: Run controller tests and confirm RED**

Run: `mvn -f backend-java/pom.xml -Dtest=EvaluationControllerTest test`

Expected: FAIL because create returns 201 and query endpoints return unpaged arrays.

- [ ] **Step 3: Implement bounded paging and compatibility dispatch**

Default page size is 25, maximum 100. `/run` remains for one compatibility cycle, is annotated deprecated, and delegates to the same asynchronous replay command as `/retry`; neither endpoint calls model inference in the request thread.

```java
@PostMapping
@ResponseStatus(HttpStatus.ACCEPTED)
public EvaluationRunResponse createEvaluation(@Valid @RequestBody CreateEvaluationRequest request) {
    return evaluationService.createEvaluation(request);
}

@PostMapping({"/{evaluationId}/retry", "/{evaluationId}/run"})
@ResponseStatus(HttpStatus.ACCEPTED)
public EvaluationRunResponse retryEvaluation(@PathVariable String evaluationId) {
    return evaluationService.retryEvaluation(evaluationId);
}

@GetMapping("/{evaluationId}/samples")
public EvaluationPageResponse<EvaluationSampleResponse> listSamples(
        @PathVariable String evaluationId,
        @RequestParam(required = false) EvaluationSampleStatus status,
        @RequestParam(required = false) Boolean correct,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "25") int size) {
    return evaluationService.listSamples(evaluationId, status, correct, page, Math.min(size, 100));
}
```

- [ ] **Step 4: Run controller and service tests**

Run: `mvn -f backend-java/pom.xml -Dtest=EvaluationControllerTest,EvaluationServiceTest test`

Expected: PASS for accepted commands, safe fields, paging bounds, filters, legacy-run rejection, and retry exhaustion.

- [ ] **Step 5: Commit**

```bash
git add backend-java/src/main/java/com/fengting/aigcforensics/evaluation backend-java/src/test/java/com/fengting/aigcforensics/evaluation
git commit -m "feat: expose asynchronous evaluation api"
```

### Task 8: Adapt The Evaluation Workbench

**Files:**
- Modify: `src/api/backend.ts`
- Modify: `src/pages/AdminEvaluations/index.tsx`
- Modify: `src/pages/AdminEvaluations/index.module.css`
- Modify: `src/pages/AdminEvaluations/evaluationInsights.ts`
- Modify: `src/pages/AdminEvaluations/evaluationInsights.test.ts`
- Create: `src/pages/AdminEvaluations/evaluationPolling.ts`
- Create: `src/pages/AdminEvaluations/evaluationPolling.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: asynchronous and paged API from Task 7.
- Produces: `shouldPollEvaluation(status)` and `nextEvaluationPollDelay(attempt)` pure helpers.

- [ ] **Step 1: Write failing frontend state tests**

```typescript
test('polls only non-terminal runs with a bounded delay', () => {
  assert.equal(shouldPollEvaluation('QUEUED'), true);
  assert.equal(shouldPollEvaluation('RUNNING'), true);
  assert.equal(shouldPollEvaluation('PARTIALLY_COMPLETED'), false);
  assert.equal(nextEvaluationPollDelay(20), 10_000);
});

test('does not treat partial coverage as complete benchmark evidence', () => {
  const insights = buildEvaluationInsights(samples, { totalSamples: 10, completedSamples: 8 });
  assert.equal(insights.coverage, 0.8);
  assert.equal(insights.isComplete, false);
});
```

- [ ] **Step 2: Run frontend tests and confirm RED**

Run: `npm test`

Expected: compilation fails because polling helpers and coverage input do not exist.

- [ ] **Step 3: Implement the asynchronous UI contract**

Change the default manifest to asset IDs, remove the synchronous run assumption, poll only queued/running runs, cancel timers on selection/unmount, display progress and failed count separately, paginate samples, and render a visible `Development heuristic runtime` disclosure when `runtimeId === 'heuristic'`. Keep existing typography, colors, spacing, and panel treatment.

```typescript
export function shouldPollEvaluation(status: EvaluationStatus): boolean {
  return status === 'QUEUED' || status === 'RUNNING';
}

export function nextEvaluationPollDelay(attempt: number): number {
  return Math.min(2_000 * 2 ** Math.min(attempt, 3), 10_000);
}

useEffect(() => {
  if (!detail || !shouldPollEvaluation(detail.status)) return undefined;
  const timer = window.setTimeout(
    () => void refresh(detail.evaluationId),
    nextEvaluationPollDelay(pollAttempt),
  );
  return () => window.clearTimeout(timer);
}, [detail?.evaluationId, detail?.status, pollAttempt]);
```

- [ ] **Step 4: Run frontend verification**

Run: `npm test`

Run: `npm run lint`

Run: `npm run build`

Expected: all tests pass, ESLint exits 0, and Vite production build exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/api/backend.ts src/pages/AdminEvaluations package.json
git commit -m "feat: show truthful asynchronous evaluation progress"
```

### Task 9: Add Operational Evidence And Documentation

**Files:**
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/service/EvaluationExecutionMetrics.java`
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/service/EvaluationExecutionService.java`
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/job/EvaluationJobWorker.java`
- Test: `backend-java/src/test/java/com/fengting/aigcforensics/evaluation/service/EvaluationExecutionMetricsTest.java`
- Modify: `docs/fullstack-evaluation-demo.md`
- Create: `docs/evaluation-execution.md`
- Modify: `docs/capability-matrix.md`
- Modify: `docs/project-worklog.md`
- Modify: `docs/README.md`

**Interfaces:**
- Produces Micrometer counters/timers prefixed `evaluation.execution`.
- Produces the operator runbook and verification record.

- [ ] **Step 1: Write failing metrics tests**

```java
@Test
void recordsRetryLeaseTakeoverAndStaleWriteSignals() {
    SimpleMeterRegistry registry = new SimpleMeterRegistry();
    EvaluationExecutionMetrics metrics = new EvaluationExecutionMetrics(registry);
    metrics.recordRetry("timeout");
    metrics.recordLeaseTakeover();
    metrics.recordStaleWrite();
    assertThat(registry.get("evaluation.execution.retries").tag("code", "timeout").counter().count()).isEqualTo(1);
    assertThat(registry.get("evaluation.execution.lease.takeovers").counter().count()).isEqualTo(1);
    assertThat(registry.get("evaluation.execution.stale.writes").counter().count()).isEqualTo(1);
}
```

- [ ] **Step 2: Run metrics tests and confirm RED**

Run: `mvn -f backend-java/pom.xml -Dtest=EvaluationExecutionMetricsTest test`

Expected: compilation fails because the metrics facade does not exist.

- [ ] **Step 3: Implement bounded telemetry and runbooks**

Use low-cardinality metric tags only; IDs belong in structured logs, never metric tags. Document stream keys, lease inspection, replay, stable failure codes, heuristic disclosure, legacy manifests, and future PostgreSQL/Redis Testcontainers cases. Update the capability matrix only for behavior proven by tests in this branch.

```java
public final class EvaluationExecutionMetrics {
    private final MeterRegistry registry;

    public EvaluationExecutionMetrics(MeterRegistry registry) {
        this.registry = registry;
    }

    public void recordRetry(String code) {
        registry.counter("evaluation.execution.retries", "code", code).increment();
    }

    public void recordLeaseTakeover() {
        registry.counter("evaluation.execution.lease.takeovers").increment();
    }

    public void recordStaleWrite() {
        registry.counter("evaluation.execution.stale.writes").increment();
    }
}
```

- [ ] **Step 4: Run the complete verification matrix**

Run: `mvn -f backend-java/pom.xml test`

Run: `python -m pytest model-services/nonescape-mini/tests -q`

Run: `npm test`

Run: `npm run lint`

Run: `npm run build`

Run: `git diff --check origin/main...HEAD`

Expected: Maven reports zero failures/errors, Pytest reports all passing, Node reports all passing, lint/build exit 0, and Git reports no whitespace errors.

- [ ] **Step 5: Commit**

```bash
git add backend-java/src docs
git commit -m "docs: operationalize real evaluation execution"
```

## Deferred Docker Verification

When Docker is available, create a separate `test/evaluation-testcontainers`
branch and add PostgreSQL/Redis Testcontainers coverage for:

- concurrent `SELECT FOR UPDATE` claims;
- lease expiry and stale token rejection against PostgreSQL;
- outbox recovery after Redis interruption;
- Redis pending-entry takeover and dead-letter behavior;
- Flyway migration from V6 data containing legacy filename-only evaluations.

These cases are deferred because the current environment does not provide the
agreed Docker runtime; they are not silently claimed as completed by this plan.
