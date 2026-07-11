# Architecture Decision Records

This directory stores short, durable records for cross-cutting architecture
decisions. Product and feature requirements remain in `docs/superpowers/specs/`.

## Lifecycle

- `Proposed`: under review and not yet binding.
- `Accepted`: current decision.
- `Superseded`: replaced by a later ADR named in the record.

Accepted ADR content is not rewritten when preferences change. Add a new ADR
so readers can follow the project's evolution.

## Template

```markdown
# ADR-NNNN: Decision Title

- Status: Proposed | Accepted | Superseded
- Date: YYYY-MM-DD
- Owners: Project maintainers
- Superseded by: ADR-NNNN (only when applicable)

## Context
## Decision
## Consequences
## Alternatives Considered
## Verification
```

## Index

| ADR | Status | Decision |
| --- | --- | --- |
| [ADR-0001](0001-record-architecture-decisions.md) | Accepted | Record durable cross-cutting decisions as ADRs. |
