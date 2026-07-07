# Async Detection Jobs

The backend now supports two execution modes:

- `POST /api/detections/{taskId}/run`
- `POST /api/detections/{taskId}/run-async`

## Synchronous Run

`/run` executes the detection workflow in the request thread and returns the
final task snapshot. This remains useful for local smoke tests and simple
debugging.

## Async Run

`/run-async` submits a queued task to the Redis-backed worker queue and immediately
returns `202 Accepted` with the current task snapshot. Clients should poll:

```text
GET /api/detections/{taskId}
```

until the status becomes one of:

- `COMPLETED`
- `FAILED`

The current implementation uses Redis Stream:

- stream key: `detection:jobs`
- consumer group: `detection-workers`
- submitted lock prefix: `detection:jobs:submitted:`
- dead-letter stream key: `detection:jobs:dead-letter`

Redis keeps task submission outside the backend process, so the backend can be
restarted without losing queued work. Duplicate submissions are guarded with a
short-lived Redis lock per task id.

## Reliability Behavior

The worker checks stale pending messages before reading new messages. If a
backend process crashes after claiming a job, another backend instance can claim
the message after `app.detection.jobs.redis.pending-idle-timeout`.

Messages that reach `app.detection.jobs.redis.max-delivery-attempts` are moved
to the dead-letter stream and acknowledged in the main stream. This keeps a bad
message from blocking the queue while preserving enough metadata for operations:

- `taskId`
- `originalMessageId`
- `deliveryCount`
- `reason`
