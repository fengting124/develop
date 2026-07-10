# Detection Execution Leases

This runbook describes how a detection worker owns model execution without
holding a database transaction during network inference.

## Guarantee

Each attempt receives a random execution token and a time-bounded lease. The
token is a fencing value:

- only the current token may persist predictions, a report, or failure state;
- a live lease rejects another attempt as `BUSY`;
- an expired lease can be replaced after a worker crash;
- a late response from the replaced attempt is discarded;
- all predictions and the final report commit atomically.

The lease does not provide exactly-once model invocation. Two model calls can
overlap when an earlier call outlives its lease, but only the newest owner can
change durable task results.

## Transaction Boundaries

```text
claim transaction
  -> lock detection_task
  -> assign execution_token and execution_lease_until
  -> increment execution_attempt_count
  -> snapshot asset and enabled model configuration

outside a transaction
  -> invoke model endpoints
  -> collect results in memory

completion transaction
  -> lock detection_task
  -> verify execution_token
  -> save every prediction and one report
  -> mark task COMPLETED and clear ownership

failure transaction
  -> lock detection_task
  -> verify execution_token
  -> mark task FAILED and clear ownership
```

Keeping the coordinator and transactional persistence service as separate
Spring beans is intentional. It ensures Spring's transaction proxy is applied
and avoids self-invocation silently bypassing transaction annotations.

## Configuration

| Environment variable | Default | Purpose |
| --- | --- | --- |
| `APP_DETECTION_EXECUTION_LEASE_DURATION` | `5m` | Time before an unfinished attempt may be replaced |

Choose a lease longer than normal end-to-end inference latency, including all
enabled models. A short lease improves crash recovery but increases the chance
of overlapping calls. A long lease reduces overlap but delays recovery.

The current implementation has no lease heartbeat. Do not set the lease below
the measured high-percentile inference time. Heartbeats are deferred until a
real model runtime provides representative latency data.

## Queue Acknowledgement

The Redis worker acknowledges these outcomes:

- `COMPLETED`: results committed;
- `FAILED`: the current attempt recorded a failure;
- `TERMINAL`: the task was already complete;
- `STALE`: a newer execution owns or finished the task.

It does not acknowledge `BUSY`. The message remains in the consumer group's
pending list and can be claimed again after the configured Redis pending idle
timeout. Once the active attempt reaches a terminal state, redelivery becomes
safe to acknowledge.

## Failure Scenarios

### Worker exits during model inference

The task remains `INFERENCING`. After `execution_lease_until`, a redelivered
message can assign a new token and execute again. No manual database update is
required.

### Old worker returns after lease replacement

The old completion transaction sees a token mismatch and performs no writes.
The worker may acknowledge its own Redis message because the newer attempt is
now the durable owner.

### One of several models fails

Results are collected in memory. The service writes no partial predictions;
it records the task failure in a short transaction. A later explicit replay
starts a clean attempt.

### Completion transaction fails

The exception escapes the worker, so the Redis message is not acknowledged.
The task remains recoverable after its lease expires. Database errors are not
misreported as model failures.

## Verification Boundary

Automated tests cover lease state transitions, active and expired claims,
stale success and failure fencing, partial multi-model failure, queue
acknowledgement, Flyway/JPA validation, and an integration assertion that model
inference runs without an active Spring transaction.

Real process termination and PostgreSQL/Redis restart tests remain assigned to
the Docker-backed integration-test branch. Model weights are not required for
these transaction guarantees.
