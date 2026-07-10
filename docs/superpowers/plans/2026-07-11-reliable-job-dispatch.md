# Reliable Job Dispatch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist detection dispatch requests transactionally in PostgreSQL and publish them to Redis Streams with recoverable, idempotent at-least-once delivery.

**Architecture:** `DetectionJobService` writes a durable `JobOutboxEvent` instead of calling Redis. A scheduled dispatcher claims one event in a short transaction, publishes a versioned `DetectionJobRequest`, and records success or bounded retry state in a second transaction. PostgreSQL is authoritative; Redis remains the delivery transport, and the detection worker remains idempotent through task terminal-state checks.

**Tech Stack:** Java 21, Spring Boot 3.5, Spring Data JPA, Flyway, PostgreSQL, Redis Streams, Jackson, JUnit 5, AssertJ, Mockito.

## Global Constraints

- Keep the Java backend as a modular monolith; do not add Kafka, CDC, or a new deployable service.
- PostgreSQL owns business and outbox state; Redis owns transport state only.
- Delivery semantics are at least once, never described as exactly once.
- Do not hold a database transaction while publishing to Redis.
- Use Flyway forward migrations; do not edit merged migrations.
- Do not change frontend behavior or download model weights in this branch.
- Develop every production behavior test-first and observe the expected failure before implementation.
- Preserve existing API routes and the current `202 Accepted` response body.

---

## File Structure

New production files:

- `domain/JobOutboxEvent.java`: durable event aggregate and state transitions.
- `domain/JobOutboxStatus.java`: `PENDING`, `PUBLISHING`, `PUBLISHED`, `FAILED`.
- `domain/JobOutboxEventType.java`: initially `DETECTION_REQUESTED`.
- `repository/JobOutboxEventRepository.java`: locked claiming and operations queries.
- `config/JobOutboxProperties.java`: retry and stale-claim configuration.
- `service/OutboxBackoffPolicy.java`: capped exponential delay with deterministic jitter.
- `service/JobOutboxService.java`: scheduling, claiming, completion, failure, and replay transactions.
- `service/JobOutboxPublisher.java`: converts outbox records into queue requests.
- `service/JobOutboxDispatcher.java`: scheduled orchestration outside database transactions.
- `service/DetectionJobRequest.java`: versioned Redis event payload.
- `dto/operations/JobOutboxEventResponse.java`: bounded operations response.
- `controller/JobOutboxOperationsController.java`: inspect and replay endpoints.
- `db/migration/V5__add_job_outbox.sql`: schema, constraints, and claim indexes.
- `docs/reliable-job-dispatch.md`: behavior and recovery runbook.

Modified production files:

- `service/DetectionJobService.java`: schedule durable work instead of writing Redis.
- `service/DetectionJobQueue.java`: accept `DetectionJobRequest`.
- `service/DetectionJobMessage.java`: expose event id and version to the consumer boundary.
- `service/RedisDetectionJobQueue.java`: publish and read the versioned envelope.
- `application.yml`: outbox defaults and separate dispatcher scheduling.
- `docs/README.md` and `docs/project-worklog.md`: link and record the feature.

## Task 1: Outbox Schema And Domain State Machine

**Files:**

- Create: `backend-java/src/main/resources/db/migration/V5__add_job_outbox.sql`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/domain/JobOutboxStatus.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/domain/JobOutboxEventType.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/domain/JobOutboxEvent.java`
- Create: `backend-java/src/test/java/com/fengting/aigcforensics/domain/JobOutboxEventTest.java`

**Interfaces:**

- Produces: `JobOutboxEvent.detectionRequested(String eventId, String taskId, String payloadJson, Instant now)`.
- Produces: `claim`, `markPublished`, `markPublishFailed`, `recoverStaleClaim`, and `replay` state transitions.

- [ ] **Step 1: Write failing state-transition tests**

```java
@Test
void claimsPendingEventWhenAvailable() {
    JobOutboxEvent event = eventAt("2026-07-11T00:00:00Z");

    event.claim(Instant.parse("2026-07-11T00:00:01Z"));

    assertThat(event.getStatus()).isEqualTo(JobOutboxStatus.PUBLISHING);
    assertThat(event.getAttemptCount()).isEqualTo(1);
}

@Test
void schedulesRetryAfterPublishFailure() {
    JobOutboxEvent event = claimedEvent();
    Instant retryAt = Instant.parse("2026-07-11T00:00:10Z");

    event.markPublishFailed("redis unavailable", retryAt, 5, retryAt);

    assertThat(event.getStatus()).isEqualTo(JobOutboxStatus.PENDING);
    assertThat(event.getAvailableAt()).isEqualTo(retryAt);
}

@Test
void marksEventFailedAfterRetryBudgetIsExhausted() {
    JobOutboxEvent event = eventClaimedFiveTimes();

    event.markPublishFailed("redis unavailable", Instant.now(), 5, Instant.now());

    assertThat(event.getStatus()).isEqualTo(JobOutboxStatus.FAILED);
}
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
cd backend-java
mvn -B -Dtest=JobOutboxEventTest test
```

Expected: compilation fails because `JobOutboxEvent` does not exist.

- [ ] **Step 3: Add the migration and minimal domain implementation**

The migration creates `job_outbox` with a unique `event_id`, a unique
`(event_type, aggregate_id)` pair, status and scheduling fields, timestamps,
and `lock_version`. Add indexes on `(status, available_at, created_at)` and
`(status, updated_at)`.

State methods reject invalid transitions with `IllegalStateException`, cap
`last_error` at 2048 characters, and update `updated_at` on every transition.

- [ ] **Step 4: Verify GREEN**

Run the focused test and then:

```powershell
mvn -B test
```

Expected: all Java tests pass.

- [ ] **Step 5: Commit**

```powershell
git add backend-java/src/main/resources/db/migration/V5__add_job_outbox.sql backend-java/src/main/java/com/fengting/aigcforensics/domain backend-java/src/test/java/com/fengting/aigcforensics/domain/JobOutboxEventTest.java
git commit -m "feat: add durable job outbox state"
```

## Task 2: Repository, Backoff, And Transactional Scheduling

**Files:**

- Create: `backend-java/src/main/java/com/fengting/aigcforensics/repository/JobOutboxEventRepository.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/config/JobOutboxProperties.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/service/OutboxBackoffPolicy.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/service/JobOutboxService.java`
- Create: `backend-java/src/test/java/com/fengting/aigcforensics/service/OutboxBackoffPolicyTest.java`
- Create: `backend-java/src/test/java/com/fengting/aigcforensics/service/JobOutboxServiceTest.java`
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/service/DetectionJobService.java`
- Modify: `backend-java/src/test/java/com/fengting/aigcforensics/service/DetectionJobServiceTest.java`

**Interfaces:**

- Produces: `JobOutboxService.scheduleDetection(String taskId)`.
- Produces: `Optional<JobOutboxEvent> claimNext()`.
- Produces: `markPublished`, `markPublishFailed`, and `replay` methods using `REQUIRES_NEW` transactions.
- Consumes: `DetectionJobService.submit(String taskId)` eligibility rules.

- [ ] **Step 1: Write failing backoff tests**

```java
@Test
void doublesDelayAndCapsAtConfiguredMaximum() {
    OutboxBackoffPolicy policy = new OutboxBackoffPolicy(Duration.ofSeconds(1), Duration.ofSeconds(8));

    assertThat(policy.delay("event-1", 1)).isBetween(Duration.ofMillis(800), Duration.ofMillis(1200));
    assertThat(policy.delay("event-1", 8)).isLessThanOrEqualTo(Duration.ofMillis(9600));
}
```

- [ ] **Step 2: Verify RED, implement deterministic jitter, and verify GREEN**

Use an event-id hash to produce a stable factor between `0.8` and `1.2`; this
keeps tests deterministic while preventing all events from retrying together.

- [ ] **Step 3: Write failing scheduling and claiming tests**

Tests prove that scheduling writes one event, duplicate scheduling reuses the
same event, failed-task submission replays the existing event, claiming uses a
pessimistic lock query, and stale `PUBLISHING` records become claimable.

- [ ] **Step 4: Verify RED**

Expected: `DetectionJobServiceTest` fails because it still depends on
`DetectionJobQueue` and `JobOutboxService` is absent.

- [ ] **Step 5: Implement repository and service**

Repository signatures:

```java
Optional<JobOutboxEvent> findByEventId(String eventId);
Optional<JobOutboxEvent> findByEventTypeAndAggregateId(JobOutboxEventType eventType, String aggregateId);

@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("select event from JobOutboxEvent event where event.status = :status and event.availableAt <= :now order by event.createdAt")
List<JobOutboxEvent> findClaimable(JobOutboxStatus status, Instant now, Pageable pageable);

List<JobOutboxEvent> findByStatusOrderByCreatedAtDesc(JobOutboxStatus status, Pageable pageable);
```

`scheduleDetection` serializes `{"taskId":"..."}` through `ObjectMapper`,
creates a stable `event_` UUID for a new task, and calls `replay(now)` only when
the existing event is terminal and the detection task is eligible for retry.

- [ ] **Step 6: Change detection submission to the outbox boundary**

```java
@Transactional
public DetectionTask submit(String taskId) {
    DetectionTask task = findTask(taskId);
    if (task.getStatus() == DetectionStatus.QUEUED || task.getStatus() == DetectionStatus.FAILED) {
        jobOutboxService.scheduleDetection(taskId);
    }
    return task;
}
```

- [ ] **Step 7: Verify focused and full Java tests**

```powershell
mvn -B -Dtest=OutboxBackoffPolicyTest,JobOutboxServiceTest,DetectionJobServiceTest test
mvn -B test
```

- [ ] **Step 8: Commit**

```powershell
git add backend-java/src/main backend-java/src/test
git commit -m "feat: schedule detection jobs transactionally"
```

## Task 3: Versioned Redis Event Envelope

**Files:**

- Create: `backend-java/src/main/java/com/fengting/aigcforensics/service/DetectionJobRequest.java`
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/service/DetectionJobQueue.java`
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/service/DetectionJobMessage.java`
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/service/RedisDetectionJobQueue.java`
- Modify: `backend-java/src/test/java/com/fengting/aigcforensics/service/RedisDetectionJobQueueTest.java`
- Modify: `backend-java/src/test/java/com/fengting/aigcforensics/service/DetectionJobWorkerTest.java`

**Interfaces:**

- Produces: `DetectionJobRequest(String eventId, int eventVersion, String taskId, Instant occurredAt)`.
- Produces: Redis fields `eventId`, `eventVersion`, `taskId`, and `occurredAt`.
- Preserves: `DetectionJobWorker` executes by `taskId` and acknowledges only after persistence.

- [ ] **Step 1: Write failing Redis queue tests**

Tests capture the added stream record and assert all four fields. Add tests for
missing event id, unsupported event version, duplicate event id, and dead-letter
metadata retaining the original event id.

- [ ] **Step 2: Verify RED**

```powershell
mvn -B -Dtest=RedisDetectionJobQueueTest,DetectionJobWorkerTest test
```

Expected: compilation fails against the old `enqueue(String taskId)` contract.

- [ ] **Step 3: Implement the envelope**

Use the event id for the Redis submitted-key deduplication key. Validate
`eventVersion == 1` when reading. Invalid envelopes are acknowledged and copied
to the dead-letter stream with a stable reason rather than passed to the
worker.

- [ ] **Step 4: Verify GREEN and full Java suite**

```powershell
mvn -B -Dtest=RedisDetectionJobQueueTest,DetectionJobWorkerTest test
mvn -B test
```

- [ ] **Step 5: Commit**

```powershell
git add backend-java/src/main/java/com/fengting/aigcforensics/service backend-java/src/test/java/com/fengting/aigcforensics/service
git commit -m "feat: version detection queue events"
```

## Task 4: Dispatcher And Publish Recovery

**Files:**

- Create: `backend-java/src/main/java/com/fengting/aigcforensics/service/JobOutboxPublisher.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/service/JobOutboxDispatcher.java`
- Create: `backend-java/src/test/java/com/fengting/aigcforensics/service/JobOutboxPublisherTest.java`
- Create: `backend-java/src/test/java/com/fengting/aigcforensics/service/JobOutboxDispatcherTest.java`
- Modify: `backend-java/src/main/resources/application.yml`
- Modify: `backend-java/src/test/resources/application-test.yml`

**Interfaces:**

- `JobOutboxPublisher.publish(JobOutboxEvent event)` supports
  `DETECTION_REQUESTED` and rejects unknown event types.
- `JobOutboxDispatcher.pollOnce()` owns no transaction and coordinates the
  short transactional methods on `JobOutboxService`.

- [ ] **Step 1: Write failing publisher tests**

Tests prove payload parsing, version `1`, event metadata propagation, and
malformed payload rejection.

- [ ] **Step 2: Verify RED and implement publisher**

Parse payload with Jackson into a private `DetectionRequestedPayload` record
and call `DetectionJobQueue.enqueue(DetectionJobRequest)`.

- [ ] **Step 3: Write failing dispatcher tests**

```java
@Test
void marksClaimedEventPublishedAfterQueueAcceptsIt() {
    when(outboxService.claimNext()).thenReturn(Optional.of(event));

    dispatcher.pollOnce();

    verify(publisher).publish(event);
    verify(outboxService).markPublished(event.getEventId());
}

@Test
void recordsRetryableFailureWhenPublishThrows() {
    when(outboxService.claimNext()).thenReturn(Optional.of(event));
    doThrow(new IllegalStateException("redis unavailable")).when(publisher).publish(event);

    dispatcher.pollOnce();

    verify(outboxService).markPublishFailed(event.getEventId(), "redis unavailable");
}
```

- [ ] **Step 4: Verify RED and implement dispatcher**

Enable scheduling with `app.jobs.outbox.dispatcher-enabled`; disable it in the
test profile. Do not annotate `pollOnce` with `@Transactional`.

- [ ] **Step 5: Verify GREEN and full Java suite**

- [ ] **Step 6: Commit**

```powershell
git add backend-java/src/main/java/com/fengting/aigcforensics/service backend-java/src/main/resources/application.yml backend-java/src/test
git commit -m "feat: dispatch outbox jobs to redis"
```

## Task 5: Inspection And Explicit Replay API

**Files:**

- Create: `backend-java/src/main/java/com/fengting/aigcforensics/dto/operations/JobOutboxEventResponse.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/controller/JobOutboxOperationsController.java`
- Create: `backend-java/src/test/java/com/fengting/aigcforensics/controller/JobOutboxOperationsControllerTest.java`
- Modify: `backend-java/src/main/java/com/fengting/aigcforensics/service/JobOutboxService.java`

**Interfaces:**

- `GET /api/operations/job-outbox?status=FAILED&limit=50` returns at most 100
  newest matching records.
- `POST /api/operations/job-outbox/{eventId}/replay` returns the replayed event.

- [ ] **Step 1: Write failing MVC tests**

Test valid filtering, default limit 50, limit rejection above 100, missing event
404, valid replay, and invalid-state rejection.

- [ ] **Step 2: Verify RED**

```powershell
mvn -B -Dtest=JobOutboxOperationsControllerTest test
```

- [ ] **Step 3: Implement bounded query, DTO mapping, and replay**

The DTO exposes identifiers, type, aggregate, status, attempts, scheduling and
publication timestamps, and the last sanitized error. It never exposes raw
payload JSON.

- [ ] **Step 4: Verify GREEN and full Java suite**

- [ ] **Step 5: Commit**

```powershell
git add backend-java/src/main backend-java/src/test
git commit -m "feat: expose outbox recovery operations"
```

## Task 6: Runbook, Worklog, And Full Verification

**Files:**

- Create: `docs/reliable-job-dispatch.md`
- Modify: `docs/README.md`
- Modify: `docs/async-detection-jobs.md`
- Modify: `docs/project-worklog.md`

**Interfaces:**

- Produces: operator commands and failure semantics for local, WSL, and server
  environments.

- [ ] **Step 1: Write the runbook**

Document the submission, outbox, dispatcher, Redis, worker, and acknowledgement
sequence. Include SQL/HTTP inspection, replay, stale-claim recovery, retry
budget, dead-letter behavior, and explicit at-least-once semantics.

- [ ] **Step 2: Update durable docs**

Link the runbook, record branch purpose and verification, and replace any text
that still claims direct request-to-Redis submission.

- [ ] **Step 3: Run fresh verification**

```powershell
npm run test
npm run lint
npm run build
cd backend-java
mvn -B test
cd ..\model-services\nonescape-mini
& 'D:\workspace\develop\.venv-model-service\Scripts\python.exe' -m pytest
cd ..\..
python -m pytest tools/tests
git diff --check
```

Expected: 0 failures in every suite and no whitespace errors.

- [ ] **Step 4: Review the final diff against the design**

Check specifically for database transactions around Redis publication, raw
payload leakage, unbounded error strings, duplicate-event behavior, missing
indexes, unsupported event versions, and undocumented failure states.

- [ ] **Step 5: Commit documentation**

```powershell
git add docs
git commit -m "docs: explain reliable job dispatch"
```

- [ ] **Step 6: Push, open a ready PR, wait for CI, and merge only when all required checks succeed**

PR title:

```text
Add reliable detection job dispatch
```

The PR body must state the at-least-once guarantee, transactional boundary,
recovery behavior, test evidence, deferred Testcontainers coverage, and absence
of model-weight changes.
