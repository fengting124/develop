# Async Detection Jobs

The backend now supports two execution modes:

- `POST /api/detections/{taskId}/run`
- `POST /api/detections/{taskId}/run-async`

## Synchronous Run

`/run` executes the detection workflow in the request thread and returns the
final task snapshot. This remains useful for local smoke tests and simple
debugging.

## Async Run

`/run-async` submits a queued task to the backend job executor and immediately
returns `202 Accepted` with the current task snapshot. Clients should poll:

```text
GET /api/detections/{taskId}
```

until the status becomes one of:

- `COMPLETED`
- `FAILED`

The current implementation uses a bounded in-process Spring task executor. It
prevents duplicate submissions for the same queued task inside one backend
process. This is intentionally simple for the first deployable version.

## Future Upgrade Path

When the project needs multiple backend replicas or durable retry semantics,
replace the in-process executor behind `DetectionJobService` with a persistent
queue. The controller and client contract can stay the same:

- submit through `/run-async`
- poll through `GET /api/detections/{taskId}`
- keep task status transitions in the database
