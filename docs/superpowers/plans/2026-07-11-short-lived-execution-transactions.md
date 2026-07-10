# Short-Lived Detection Execution Transactions

**Branch:** `feature/short-lived-execution-transactions`

## Goal

Remove model HTTP calls from database transactions while preserving durable,
race-safe detection state. A stale model response must never overwrite a newer
execution attempt.

## Current Risk

`DetectionExecutionService.runDetection` is transactional around task reads,
all model HTTP calls, prediction writes, report creation, and the final task
update. A slow or unavailable model therefore holds a database connection and
transaction for the full network timeout. Concurrent deliveries also have no
durable execution ownership token.

## Transaction Model

```text
short transaction A
  -> lock detection_task
  -> return terminal/busy when no execution should start
  -> otherwise assign execution_token, increment attempt count,
     set execution_lease_until, and mark INFERENCING
  -> snapshot asset and enabled model configuration

no database transaction
  -> call each model endpoint
  -> collect immutable inference results in memory

short transaction B
  -> lock detection_task
  -> compare execution_token
  -> stale token: discard the complete result set
  -> matching token: persist predictions and report atomically, then COMPLETE

short failure transaction
  -> lock detection_task
  -> matching token: mark FAILED
  -> stale token: preserve the newer attempt
```

The execution lease is not an exactly-once mechanism. It permits recovery when
a process dies after claiming a task. The token comparison is the fencing
mechanism that prevents an expired attempt from committing after a replacement
attempt has started.

## Behavioral Rules

- `COMPLETED` tasks are terminal and do not execute again.
- `QUEUED` and `FAILED` tasks may start a new attempt.
- `INFERENCING` with a live lease is busy and must not be acknowledged by the
  asynchronous worker.
- `INFERENCING` with an expired lease may be reclaimed with a new token.
- Missing enabled models fail the claimed task without making a network call.
- Predictions and the report commit in one transaction.
- Partial model success is not persisted when a later model fails.
- A stale success or failure result performs no writes.
- Synchronous callers receive the current task snapshot when work is already
  active; asynchronous messages remain pending for later terminal cleanup.

## Schema

Add Flyway V6 fields to `detection_task`:

- `execution_token varchar(64)`
- `execution_lease_until timestamp with time zone`
- `execution_attempt_count integer not null default 0`

Add an index on `(status, execution_lease_until)` for recovery scans and future
operations tooling.

## Java Boundaries

- `DetectionExecutionService`: non-transactional coordinator only.
- `DetectionExecutionTransactionService`: public transactional claim,
  completion, and failure methods. Keeping it as a separate Spring bean avoids
  proxy self-invocation mistakes.
- `DetectionExecutionPlan`: immutable snapshot used outside persistence scope.
- `DetectionExecutionOutcome`: tells queue workers whether a message is safe
  to acknowledge.

## TDD Sequence

1. Add domain tests for claim, live-lease rejection, expired-lease reclaim,
   token match, and stale-token rejection.
2. Add V6 and map the new fields on `DetectionTask`.
3. Add transaction-service tests for claim snapshots and fenced completion.
4. Refactor the coordinator and prove the model client runs without an active
   Spring transaction.
5. Update the worker so busy work remains unacknowledged while terminal,
   successful, and failed attempts are acknowledged.
6. Add operator documentation and worklog evidence.

## Verification

Run before opening the PR:

```powershell
cd backend-java
mvn -B test

cd ..
npm run test
npm run lint
npm run build

cd model-services\nonescape-mini
& 'D:\workspace\develop\.venv-model-service\Scripts\python.exe' -m pytest

cd ..\..
python -m pytest tools/tests
git diff --check
```

Then push this branch, open one focused PR, wait for all CI jobs, and squash
merge only when the PR is clean and green.

## Deferred

- Model weights and GPU runtime setup.
- Lease heartbeat for model calls longer than the configured lease.
- Docker-backed crash/restart tests with PostgreSQL and Redis.
- Applying the same pattern to batch evaluation execution.
