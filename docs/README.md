# Project Documentation

This directory contains durable project documentation for Visual Authenticity
Workbench.

## Start Here

- [Project README](../README.md): product summary, scope, architecture, and run
  commands.
- [Documentation Standards](documentation-standards.md): how this repository
  writes and maintains technical documentation.
- [Architecture Decision Records](adr/README.md): durable cross-cutting
  decisions, alternatives, and consequences.
- [Project Worklog](project-worklog.md): what has been built, why it was built,
  how it was verified, and what is deferred.
- [Product Capability Matrix](capability-matrix.md): implemented, server-pending,
  showcase, and non-goal capabilities with verification evidence.
- [Historical Improvement Roadmap](project-improvement-roadmap.md): superseded
  early gap analysis retained for development history; use the active long-term
  roadmap below for current decisions.

## Runbooks

Use these when setting up or operating the project.

- [Local Development Environment](local-development.md): Windows, WSL, and SSH
  server setup guidance.
- [Smoke Test Workflow](smoke-test-workflow.md): end-to-end verification after
  services are running.
- [Full-Stack Evaluation Demo](fullstack-evaluation-demo.md): admin UI to Java
  backend evaluation workflow without model weights.
- [Reliable Job Dispatch](reliable-job-dispatch.md): transactional outbox,
  Redis delivery, failure semantics, inspection, and replay.
- [Detection Execution Leases](detection-execution-leases.md): short
  transactions, fencing tokens, lease recovery, and queue acknowledgement.
- [Upload Security Boundary](upload-security.md): content-derived image types,
  decode limits, generated storage paths, and deployment controls.

## Architecture And Contracts

Use these to understand system boundaries.

- [Production Foundation And Project Boundary Design](superpowers/specs/2026-07-11-production-foundation-design.md):
  production boundaries, reliability requirements, engineering standards, and
  phased branch delivery plan.
- [AI Application Product Boundary And Long-Term Roadmap](superpowers/specs/2026-07-11-ai-application-product-roadmap-design.md):
  authoritative product scope, review workflow, long-term phases, and portfolio
  acceptance criteria.
- [Real Evaluation Execution Boundary](superpowers/specs/2026-07-11-evaluation-real-execution-design.md):
  asset-backed datasets, durable batch execution, fenced recovery, result
  provenance, and Phase 2 acceptance criteria.
- [Model Integration Framework](model-integration-framework.md): Java-to-Python
  model-service contract, model runtime configuration, and weight handling.
- [Async Detection Jobs](async-detection-jobs.md): Redis-backed asynchronous
  detection workflow and reliability behavior.

## Planning Artifacts

These documents are useful for understanding how the project evolved.

- [AIGC Forensics Platform Plan](superpowers/plans/2026-07-07-aigc-forensics-platform.md)
- [Frontend API Integration Plan](superpowers/plans/2026-07-07-frontend-api-integration.md)
- [Real Nonescape Runtime Plan](superpowers/plans/2026-07-08-real-nonescape-runtime.md)
- [Real Evaluation Execution Plan](superpowers/plans/2026-07-11-evaluation-real-execution.md)
- [Platform Design Spec](superpowers/specs/2026-07-07-image-authenticity-platform-design.md)
- [Production Foundation Design](superpowers/specs/2026-07-11-production-foundation-design.md)

## Reading Order For Interview Review

1. Read the [Project README](../README.md).
2. Read the [Project Worklog](project-worklog.md).
3. Read the [Production Foundation Design](superpowers/specs/2026-07-11-production-foundation-design.md).
4. Read the [Improvement Roadmap](project-improvement-roadmap.md) for earlier
   gap analysis and completed phases.
5. If discussing architecture, read
   [Model Integration Framework](model-integration-framework.md) and
   [Async Detection Jobs](async-detection-jobs.md).
6. If demonstrating the project, run through
   [Full-Stack Evaluation Demo](fullstack-evaluation-demo.md).
