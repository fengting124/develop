# Project Documentation

This directory contains durable project documentation for Visual Authenticity
Workbench.

## Start Here

- [Project README](../README.md): product summary, scope, architecture, and run
  commands.
- [Documentation Standards](documentation-standards.md): how this repository
  writes and maintains technical documentation.
- [Project Worklog](project-worklog.md): what has been built, why it was built,
  how it was verified, and what is deferred.
- [Improvement Roadmap](project-improvement-roadmap.md): strict interviewer-style
  gap analysis and the recommended next phases.

## Runbooks

Use these when setting up or operating the project.

- [Local Development Environment](local-development.md): Windows, WSL, and SSH
  server setup guidance.
- [Smoke Test Workflow](smoke-test-workflow.md): end-to-end verification after
  services are running.
- [Full-Stack Evaluation Demo](fullstack-evaluation-demo.md): admin UI to Java
  backend evaluation workflow without model weights.

## Architecture And Contracts

Use these to understand system boundaries.

- [Model Integration Framework](model-integration-framework.md): Java-to-Python
  model-service contract, model runtime configuration, and weight handling.
- [Async Detection Jobs](async-detection-jobs.md): Redis-backed asynchronous
  detection workflow and reliability behavior.

## Planning Artifacts

These documents are useful for understanding how the project evolved.

- [AIGC Forensics Platform Plan](superpowers/plans/2026-07-07-aigc-forensics-platform.md)
- [Frontend API Integration Plan](superpowers/plans/2026-07-07-frontend-api-integration.md)
- [Real Nonescape Runtime Plan](superpowers/plans/2026-07-08-real-nonescape-runtime.md)
- [Platform Design Spec](superpowers/specs/2026-07-07-image-authenticity-platform-design.md)

## Reading Order For Interview Review

1. Read the [Project README](../README.md).
2. Read the [Project Worklog](project-worklog.md).
3. Read the [Improvement Roadmap](project-improvement-roadmap.md).
4. If discussing architecture, read
   [Model Integration Framework](model-integration-framework.md) and
   [Async Detection Jobs](async-detection-jobs.md).
5. If demonstrating the project, run through
   [Full-Stack Evaluation Demo](fullstack-evaluation-demo.md).
