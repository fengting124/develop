# Product Capability Matrix

- Status: Active
- Owners: Project maintainers
- Last reviewed: 2026-07-11

This matrix is the reviewer-facing source of truth for product capability
status. It mirrors `src/config/capabilities.ts` and prevents showcase visuals
from being mistaken for implemented workflows.

## Status Definitions

| Status | Meaning |
| --- | --- |
| `Implemented` | Formal workflow backed by persisted state, code, and tests. |
| `Server Pending` | Integration boundary exists, but server hardware or runtime evidence is missing. |
| `Showcase` | Visual concept outside formal product navigation and claims. |
| `Non-goal` | Deliberately outside the product boundary. |

## Matrix

| Capability | Status | Entry point | Implementation evidence | Verification |
| --- | --- | --- | --- | --- |
| Image detection | Implemented | `/detect/image` | Secure ingestion, PostgreSQL outbox, Redis worker, execution lease, persisted report | Java tests, frontend tests, smoke workflow |
| Model evaluation | Implemented | `/admin/evaluations` | Evaluation runs, samples, metrics, retry state | Java evaluation tests and frontend insight tests |
| Model registry | Implemented | `/admin/models` | Registry table, endpoint synchronization, health API | Model registry and controller tests |
| Operational review view | Implemented | `/admin/review` | Read-only failed task, failed evaluation, and wrong-sample aggregation | Frontend build and backend APIs |
| GPU model runtime | Server Pending | None | Runtime adapter and health contract exist; weights and CUDA evidence do not | Server deployment phase |
| Video detection concept | Showcase | `/dev/showcase/video-detection` | Static interaction concept using fixture data | Frontend build only; not product evidence |
| Expert and LoRA concepts | Showcase | `/dev/showcase/image-pipeline` | Static visual concept | Frontend build only; not product evidence |
| Audio detection | Non-goal | None | None by design | Product boundary review |
| Model training | Non-goal | None | Existing open-source model integration only | Product boundary review |

The current operational review view is not yet the durable human-review
workflow. `feature/review-case-workflow` will add claim, resolution, audit, and
candidate-dataset behavior before that stronger claim is made.

## Maintenance Rule

A capability status change must update all of these in one pull request:

1. `src/config/capabilities.ts` and its tests.
2. This matrix.
3. `README.md` when the core product claim changes.
4. `docs/project-worklog.md` with implementation and verification evidence.

Showcase animation, mock data, or screenshots cannot be used as evidence for
an `Implemented` capability.
