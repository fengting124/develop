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

Redis keeps task submission outside the backend process, so the backend can be
restarted without losing queued work. Duplicate submissions are guarded with a
short-lived Redis lock per task id.

## Future Upgrade Path

When the project needs stronger retry semantics, extend the Redis worker with
pending-message recovery and a dead-letter stream. The controller and client
contract can stay the same:

- submit through `/run-async`
- poll through `GET /api/detections/{taskId}`
- keep task status transitions in the database
