# Reliable Job Dispatch

This runbook describes how detection commands move durably from PostgreSQL to
Redis Streams and how to inspect or recover failed publication.

## Guarantee

The system provides at-least-once job delivery:

- An accepted asynchronous submission has a detection task and outbox event in
  PostgreSQL.
- Redis unavailability does not remove the durable publication request.
- Failed publication is retried with bounded exponential backoff and jitter.
- A process crash while publishing leaves a stale claim that another
  dispatcher can recover.
- Duplicate publication or delivery is allowed. The detection task state is the
  final idempotency boundary.

The system does not claim exactly-once delivery. Redis and PostgreSQL do not
share a distributed transaction.

## Data Flow

```text
POST /api/detections/{taskId}/run-async
  -> lock detection_task row
  -> write/replay job_outbox event in the same PostgreSQL transaction
  -> return 202 Accepted

JobOutboxDispatcher
  -> claim one PENDING event in a short PostgreSQL transaction
  -> publish versioned event to Redis outside a database transaction
  -> mark PUBLISHED in a new short transaction
  -> or persist retry/FAILED state in a new short transaction

DetectionJobWorker
  -> read/claim Redis consumer-group message
  -> run idempotent detection workflow
  -> persist prediction/report/task state
  -> acknowledge Redis message
```

The outbox dispatcher and detection worker are intentionally separate. A
published event can wait in Redis while model execution is unavailable.

## Event Contract

Redis stream `detection:jobs` receives these fields:

| Field | Meaning |
| --- | --- |
| `eventId` | Stable outbox identifier used for transport deduplication |
| `eventVersion` | Contract version; currently `1` |
| `taskId` | Detection task identifier |
| `occurredAt` | UTC time at which the outbox event was created |

Malformed events and unsupported versions move to
`detection:jobs:dead-letter`. Dead-letter entries retain the event id, task id,
original Redis message id, delivery count when available, and reason.

## Outbox States

| State | Meaning |
| --- | --- |
| `PENDING` | Waiting until `availableAt` and eligible for claiming |
| `PUBLISHING` | Claimed by a dispatcher; Redis publication may be in progress |
| `PUBLISHED` | Redis accepted the event and returned a stream record id |
| `FAILED` | Publication retry budget is exhausted; operator action required |

`PUBLISHING` events older than `app.jobs.outbox.stale-after` return to
`PENDING`. Republishing is safe because Redis uses the stable event id as its
submitted-key and the task workflow is terminal-state idempotent.

## Configuration

| Environment variable | Default | Purpose |
| --- | --- | --- |
| `APP_JOBS_OUTBOX_DISPATCHER_ENABLED` | `true` | Enable PostgreSQL-to-Redis dispatcher |
| `APP_JOBS_OUTBOX_POLL_DELAY_MS` | `500` | Delay between dispatcher polls |
| `APP_JOBS_OUTBOX_STALE_AFTER` | `1m` | Age at which a publishing claim is recoverable |
| `APP_JOBS_OUTBOX_MAX_ATTEMPTS` | `5` | Publication attempt budget |
| `APP_JOBS_OUTBOX_BASE_RETRY_DELAY` | `1s` | Initial retry delay |
| `APP_JOBS_OUTBOX_MAX_RETRY_DELAY` | `1m` | Maximum retry delay |

Redis consumer recovery continues to use the
`APP_DETECTION_JOBS_REDIS_*` settings documented in
[Async Detection Jobs](async-detection-jobs.md).

## Inspect Events

List the newest failed publication records:

```powershell
Invoke-RestMethod `
  -Uri 'http://localhost:8080/api/operations/job-outbox?status=FAILED&limit=50'
```

Valid status filters are `PENDING`, `PUBLISHING`, `PUBLISHED`, and `FAILED`.
The limit must be between 1 and 100. Responses omit `payloadJson` so the
operations endpoint does not expose event data unnecessarily.

The endpoint currently has no authentication because authentication and RBAC
are outside the MVP boundary. Do not expose it to the public internet. Restrict
the backend to a trusted development or server network until access control is
implemented.

## Replay A Failed Event

Inspect the event and task first. Then replay a terminal outbox event:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri 'http://localhost:8080/api/operations/job-outbox/event_xxx/replay'
```

Only `PUBLISHED` and `FAILED` events can be replayed. Replaying an active event
returns `409 Conflict`. Replaying a published event is appropriate when the
associated detection task is `FAILED` and an operator has confirmed a manual
retry.

## Failure Scenarios

### Redis unavailable during publication

Expected behavior:

1. The outbox event returns to `PENDING` with `lastError` populated.
2. `attemptCount` increments.
3. `availableAt` moves forward according to capped exponential backoff.
4. The detection task remains queryable in PostgreSQL.

Restore Redis and wait for the next eligible attempt. Do not create a second
detection task merely to replace the lost publication.

### Backend crashes after Redis accepts the event

The outbox event may remain `PUBLISHING`. After the stale interval, another
dispatcher claims and republishes it. Redis suppresses the same event id while
its submitted-key exists. If the key has expired, the worker may receive a
duplicate; a completed detection task returns without creating another report.

### Worker crashes after reading Redis

The message remains in the consumer group's pending entries list. After
`app.detection.jobs.redis.pending-idle-timeout`, another consumer claims it.
Messages exceeding the Redis delivery budget move to the dead-letter stream.

### Outbox reaches FAILED

Check `lastError`, PostgreSQL health, Redis health, and configuration. Repair
the cause before calling the replay endpoint. A replay resets publication
attempt state; it does not alter the detection task result.

## Verification Boundary

This branch verifies state transitions, scheduling, event serialization,
dispatch orchestration, Redis adapter behavior, operations endpoints, and
Flyway/JPA compatibility with automated tests. Real PostgreSQL and Redis
failure/restart tests are deferred to `test/postgres-redis-testcontainers`,
because the current CI uses H2 for fast repository tests and does not provision
Docker services.

Model weights, CUDA, and evaluation inference are unrelated to this dispatch
guarantee and remain deferred.

Normal duplicate publication is suppressed by the stable event id, and a
duplicate delivered after task completion returns without repeating model
work. Concurrent ownership of a non-terminal task is protected by the
execution lease and fencing token described in
[Detection Execution Leases](detection-execution-leases.md).
