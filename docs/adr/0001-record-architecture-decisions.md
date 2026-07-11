# ADR-0001: Record Cross-Cutting Architecture Decisions

- Status: Accepted
- Date: 2026-07-11
- Owners: Project maintainers

## Context

Specifications explain complete product or feature designs, while the worklog
records branch chronology. Neither gives a concise, immutable answer to why a
cross-cutting architecture choice exists or what alternatives were rejected.

## Decision

Record durable cross-cutting choices as numbered ADRs under `docs/adr/`. Keep
each ADR focused on one decision. Supersede accepted decisions with a new ADR
instead of rewriting project history.

## Consequences

- Reviewers can trace architecture from rationale to implementation commits.
- Later maintainers can distinguish constraints from accidental code shape.
- Feature specifications remain readable instead of becoming decision logs.
- Every meaningful decision adds a small documentation maintenance cost.

## Alternatives Considered

- Use commit messages only: rejected because commits describe changes but do
  not consistently preserve alternatives and long-term consequences.
- Put every decision in one architecture document: rejected because updates
  erase chronology and create a large, difficult review surface.

## Verification

`docs/documentation-standards.md` defines when an ADR is required, and
`docs/adr/README.md` provides the lifecycle, template, and index.
