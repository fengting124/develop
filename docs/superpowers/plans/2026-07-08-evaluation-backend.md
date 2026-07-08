# Evaluation Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first backend slice of the evaluation module: evaluation runs, samples, metric calculation, and query APIs.

**Architecture:** This branch adds a Java-only evaluation package under the existing Spring Boot backend. The first slice stores evaluation manifests and computes metrics when prediction columns are present. It does not download model weights and does not batch-call the Python model service yet.

**Tech Stack:** Java 21, Spring Boot 3, Spring Data JPA, Flyway, H2 tests, PostgreSQL-compatible SQL.

## Global Constraints

- Do not change frontend code in this branch.
- Do not download model weights.
- Keep batch model execution out of this first slice.
- Use TDD for metric calculation and API behavior.
- Store evaluation data in PostgreSQL through Flyway migrations.
- Keep API responses compact and easy for the later frontend to consume.

---

### Task 1: Metrics Calculator

**Files:**
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/service/EvaluationMetricsCalculator.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/service/EvaluationMetrics.java`
- Test: `backend-java/src/test/java/com/fengting/aigcforensics/evaluation/service/EvaluationMetricsCalculatorTest.java`

**Interfaces:**
- Produces: `EvaluationMetrics calculate(List<EvaluationPredictionCase> cases)`.
- Metrics: accuracy, precision, recall, f1, truePositiveCount, falsePositiveCount, trueNegativeCount, falseNegativeCount.

- [x] Write failing calculator tests for a mixed AUTHENTIC/SYNTHETIC dataset.
- [x] Run the focused test and verify it fails.
- [x] Implement the calculator.
- [x] Run the focused test and verify it passes.

### Task 2: Evaluation Persistence

**Files:**
- Create: `backend-java/src/main/resources/db/migration/V3__add_evaluation_tables.sql`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/domain/EvaluationStatus.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/domain/EvaluationRun.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/domain/EvaluationSample.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/repository/EvaluationRunRepository.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/repository/EvaluationSampleRepository.java`
- Test: `backend-java/src/test/java/com/fengting/aigcforensics/evaluation/repository/EvaluationRepositoryTest.java`

**Interfaces:**
- `evaluation_run` stores run metadata and aggregate metrics.
- `evaluation_sample` stores filename, ground truth, optional prediction, score, latency, and correctness.

- [x] Write failing repository test.
- [x] Run the focused test and verify it fails.
- [x] Add migration, entities, and repositories.
- [x] Run the focused test and verify it passes.

### Task 3: Evaluation API

**Files:**
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/controller/EvaluationController.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/service/EvaluationService.java`
- Create DTOs under `backend-java/src/main/java/com/fengting/aigcforensics/evaluation/dto/`
- Test: `backend-java/src/test/java/com/fengting/aigcforensics/evaluation/controller/EvaluationControllerTest.java`

**Interfaces:**
- `POST /api/evaluations`
- `GET /api/evaluations`
- `GET /api/evaluations/{evaluationId}`
- `GET /api/evaluations/{evaluationId}/samples?correct=false`

**Manifest format for this slice:**

```csv
filename,groundTruthLabel,predictedLabel,score,latencyMs
real_001.jpg,AUTHENTIC,AUTHENTIC,0.12,31
fake_001.jpg,SYNTHETIC,AUTHENTIC,0.44,28
```

Prediction columns are optional. If every row has `predictedLabel`, the run is `COMPLETED` and metrics are computed. Otherwise the run is `QUEUED`.

- [x] Write failing API tests for creating a completed evaluation, getting detail, listing runs, and filtering wrong samples.
- [x] Run the focused controller test and verify it fails.
- [x] Implement service, CSV parser, DTOs, and controller.
- [x] Run the focused controller test and verify it passes.

### Task 4: Documentation And Worklog

**Files:**
- Modify: `docs/project-worklog.md`
- Modify: `docs/project-improvement-roadmap.md`

- [x] Record what the evaluation backend slice does and why batch model execution is deferred.
- [x] Update roadmap status for Phase B first slice.

### Task 5: Final Verification And Push

**Files:**
- No production-only files.

- [x] Run `mvn test` in `backend-java`.
- [x] Run `git diff --check`.
- [x] Commit with message `Add evaluation backend foundation`.
- [ ] Push `feature/evaluation-backend`.
