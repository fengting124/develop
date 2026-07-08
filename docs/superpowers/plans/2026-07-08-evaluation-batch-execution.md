# Evaluation Batch Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn queued evaluation records into an executable backend batch framework with model-call boundaries, retry state, and persisted sample results, without downloading or loading model weights.

**Architecture:** Keep evaluation creation and metric calculation in `EvaluationService`, and add a separate `EvaluationExecutionService` for state transitions and batch orchestration. Add a small `EvaluationModelClient` boundary so the executor can later call a real model service; for this branch it uses a deterministic placeholder implementation that is stable, testable, and clearly replaceable.

**Tech Stack:** Java 21, Spring Boot, Spring MVC, Spring Data JPA, Flyway, H2 tests, JUnit 5, AssertJ, Mockito.

## Global Constraints

- Do not download model weights or require GPU/runtime model files in this branch.
- Keep the implementation backend-first; do not change the existing frontend UI.
- Preserve existing API behavior for `POST /api/evaluations`, `GET /api/evaluations`, `GET /api/evaluations/{id}`, and sample listing.
- Use Java business code and follow current package conventions under `com.fengting.aigcforensics`.
- Add database changes via Flyway migrations, not Hibernate auto-DDL.
- Use explicit tests for execution success, failed execution, and retry behavior.

---

## File Structure

- Create `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/service/EvaluationExecutionService.java`: orchestrates a single batch evaluation attempt.
- Create `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/client/EvaluationModelClient.java`: model-call interface for evaluation samples.
- Create `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/client/EvaluationModelRequest.java`: immutable request DTO for model calls.
- Create `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/client/EvaluationModelResult.java`: immutable result DTO for model calls.
- Create `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/client/DeterministicEvaluationModelClient.java`: local placeholder model adapter.
- Modify `EvaluationRun`: add attempt counters and state transition methods.
- Modify `EvaluationSample`: add methods to mark predicted or failed.
- Modify `EvaluationService`: expose response mapping for execution service and include attempt fields in responses.
- Modify `EvaluationController`: add execution and retry endpoints.
- Modify DTO records: include `attemptCount` and `maxAttempts`.
- Add `backend-java/src/main/resources/db/migration/V4__add_evaluation_execution_state.sql`: persist attempt fields.
- Add `EvaluationExecutionServiceTest`: service-level orchestration tests.
- Extend `EvaluationControllerTest`: API-level execution endpoint coverage.
- Extend `EvaluationRepositoryTest`: migration/entity validation for attempt fields.
- Update `docs/project-worklog.md`: record the implementation rationale and progress.

## Task 1: Persist Retry State

**Files:**
- Create: `backend-java/src/main/resources/db/migration/V4__add_evaluation_execution_state.sql`
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/domain/EvaluationRun.java`
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/dto/EvaluationRunResponse.java`
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/dto/EvaluationDetailResponse.java`
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/service/EvaluationService.java`
- Test: `backend-java/src/test/java/com/fengting/aigcforensics/evaluation/repository/EvaluationRepositoryTest.java`

**Interfaces:**
- Produces `EvaluationRun.getAttemptCount()`, `EvaluationRun.getMaxAttempts()`, `EvaluationRun.markStarted(Instant)`, `EvaluationRun.markCompleted(...)`, `EvaluationRun.markFailed(String, Instant)`, `EvaluationRun.canRetry()`.
- Produces response fields `attemptCount` and `maxAttempts`.

- [ ] **Step 1: Write failing repository/DTO test**

Add assertions that a saved run exposes `attemptCount = 1`, `maxAttempts = 3`, and can be reloaded with those values.

- [ ] **Step 2: Verify RED**

Run: `mvn -B -Dtest=EvaluationRepositoryTest test`
Expected: compilation failure because attempt fields do not exist yet.

- [ ] **Step 3: Implement minimal persistence and response mapping**

Add Flyway columns, entity fields, constructor parameters, getters, and response record fields.

- [ ] **Step 4: Verify GREEN**

Run: `mvn -B -Dtest=EvaluationRepositoryTest test`
Expected: test passes.

## Task 2: Add Model Invocation Boundary

**Files:**
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/client/EvaluationModelClient.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/client/EvaluationModelRequest.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/client/EvaluationModelResult.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/client/DeterministicEvaluationModelClient.java`
- Test: `backend-java/src/test/java/com/fengting/aigcforensics/evaluation/client/DeterministicEvaluationModelClientTest.java`

**Interfaces:**
- Consumes `ModelLabel`.
- Produces `EvaluationModelClient.predict(EvaluationModelRequest request): EvaluationModelResult`.

- [ ] **Step 1: Write failing deterministic client test**

Assert the client returns stable labels and scores for the same filename/model pair and does not require external files.

- [ ] **Step 2: Verify RED**

Run: `mvn -B -Dtest=DeterministicEvaluationModelClientTest test`
Expected: compilation failure because the client types do not exist.

- [ ] **Step 3: Implement minimal client boundary**

Create records, interface, and deterministic implementation.

- [ ] **Step 4: Verify GREEN**

Run: `mvn -B -Dtest=DeterministicEvaluationModelClientTest test`
Expected: test passes.

## Task 3: Execute Queued Evaluations

**Files:**
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/service/EvaluationExecutionService.java`
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/domain/EvaluationSample.java`
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/service/EvaluationService.java`
- Test: `backend-java/src/test/java/com/fengting/aigcforensics/evaluation/service/EvaluationExecutionServiceTest.java`

**Interfaces:**
- Consumes `EvaluationModelClient.predict(EvaluationModelRequest)`.
- Produces `EvaluationExecutionService.runEvaluation(String evaluationId): EvaluationDetailResponse`.

- [ ] **Step 1: Write failing success test**

Create a queued evaluation with missing predictions, run it, and assert status `COMPLETED`, all samples predicted, and metrics persisted.

- [ ] **Step 2: Verify RED**

Run: `mvn -B -Dtest=EvaluationExecutionServiceTest test`
Expected: compilation failure because `EvaluationExecutionService` does not exist.

- [ ] **Step 3: Implement success path**

Load run and samples, mark started, call model client for missing predictions, save samples, calculate metrics, and mark completed.

- [ ] **Step 4: Verify GREEN**

Run: `mvn -B -Dtest=EvaluationExecutionServiceTest test`
Expected: success-path test passes.

## Task 4: Failed Attempts and Retry

**Files:**
- Modify: `EvaluationExecutionService.java`
- Modify: `EvaluationRun.java`
- Modify: `EvaluationSample.java`
- Test: `EvaluationExecutionServiceTest.java`

**Interfaces:**
- Produces failure status with `failureReason`.
- Allows rerun of `FAILED` evaluations while `attemptCount < maxAttempts`.

- [ ] **Step 1: Write failing failure/retry tests**

Assert one model exception marks the run failed with a reason, then a second execution can complete if attempts remain.

- [ ] **Step 2: Verify RED**

Run: `mvn -B -Dtest=EvaluationExecutionServiceTest test`
Expected: failure because retry behavior is missing.

- [ ] **Step 3: Implement failure and retry state transitions**

Increment attempt on every execution, clear stale failure state at start, preserve completed sample predictions, and fail fast with a clear message when attempts are exhausted.

- [ ] **Step 4: Verify GREEN**

Run: `mvn -B -Dtest=EvaluationExecutionServiceTest test`
Expected: all execution tests pass.

## Task 5: Expose HTTP Execution API

**Files:**
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/controller/EvaluationController.java`
- Modify: `backend-java/src/test/java/com/fengting/aigcforensics/evaluation/controller/EvaluationControllerTest.java`

**Interfaces:**
- Produces `POST /api/evaluations/{evaluationId}/run`.
- Produces `POST /api/evaluations/{evaluationId}/retry`.

- [ ] **Step 1: Write failing controller test**

Create a queued evaluation through HTTP, run it through HTTP, and assert the response includes completed samples, attempts, and metrics.

- [ ] **Step 2: Verify RED**

Run: `mvn -B -Dtest=EvaluationControllerTest test`
Expected: 404 for missing endpoint.

- [ ] **Step 3: Implement controller endpoints**

Delegate both endpoints to `EvaluationExecutionService.runEvaluation`.

- [ ] **Step 4: Verify GREEN**

Run: `mvn -B -Dtest=EvaluationControllerTest test`
Expected: controller tests pass.

## Task 6: Documentation and Full Verification

**Files:**
- Modify: `docs/project-worklog.md`
- Modify: `docs/project-improvement-roadmap.md`

**Interfaces:**
- Produces a readable worklog entry explaining what was built, why it was scoped this way, and what remains for real model execution.

- [ ] **Step 1: Update docs**

Record the execution framework, deterministic placeholder, retry scope, and deferred GPU/model-weight work.

- [ ] **Step 2: Run backend verification**

Run: `mvn -B test`
Expected: all backend tests pass.

- [ ] **Step 3: Commit and push**

Run:
`git add backend-java docs && git commit -m "feat: add evaluation batch execution framework" && git push -u origin feature/evaluation-batch-execution`

Expected: branch is pushed to GitHub for PR/CI.

