# Async Detection Jobs

The backend now supports two execution modes:

- `POST /api/detections/{taskId}/run`
- `POST /api/detections/{taskId}/run-async`

## Synchronous Run

`/run` executes the detection workflow in the request thread and returns the
final task snapshot. This remains useful for local smoke tests and simple
debugging.

## Async Run

`/run-async` writes or replays a durable PostgreSQL outbox event in the same
transaction used to validate the task, then immediately returns `202 Accepted`
with the current task snapshot. A separate dispatcher publishes eligible
outbox events to Redis. Clients should poll:

```text
GET /api/detections/{taskId}
```

until the status becomes one of:

- `COMPLETED`
- `FAILED`

The current implementation uses Redis Stream:

- stream key: `detection:jobs`
- consumer group: `detection-workers`
- submitted event prefix: `detection:jobs:submitted:`
- dead-letter stream key: `detection:jobs:dead-letter`

PostgreSQL is the source of truth for publication work. Redis keeps delivered
jobs outside the backend process, while a stable event id and short-lived Redis
key suppress immediate duplicate publication. Delivery remains at least once;
the detection task state is the final idempotency boundary.

## Reliability Behavior

The worker checks stale pending messages before reading new messages. If a
backend process crashes after claiming a job, another backend instance can claim
the message after `app.detection.jobs.redis.pending-idle-timeout`.

Messages that reach `app.detection.jobs.redis.max-delivery-attempts` are moved
to the dead-letter stream and acknowledged in the main stream. This keeps a bad
message from blocking the queue while preserving enough metadata for operations:

- `taskId`
- `eventId`
- `originalMessageId`
- `deliveryCount`
- `reason`

See [Reliable Job Dispatch](reliable-job-dispatch.md) for outbox states,
configuration, failure scenarios, inspection, and replay.

Worker-side model execution uses a database lease and fencing token. A message
for a task with a live execution lease remains pending instead of being
acknowledged. See [Detection Execution Leases](detection-execution-leases.md)
for transaction and recovery semantics.
