# Documentation Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a concise documentation system that records project decisions, work history, documentation standards, and the next execution path while deferring model weight work until GPU server setup.

**Architecture:** Keep documentation in Markdown under `docs/`. Add one index, one standards document, one worklog, and small status updates to existing roadmap/runtime documents. Use Diataxis-inspired categories to separate tutorials, how-to guides, reference, and explanations.

**Tech Stack:** Markdown, Git, existing project documentation conventions.

## Global Constraints

- Do not change runtime code in this branch.
- Do not download or commit model weights.
- Keep documents concise and scannable.
- Use English for stable technical docs unless a document is explicitly written for planning in Chinese.
- Prefer short sections, concrete examples, and exact commands.
- Preserve existing document paths where possible.

---

### Task 1: Documentation Standards

**Files:**
- Create: `docs/documentation-standards.md`

**Interfaces:**
- Produces a style and structure guide for future project docs.
- References external standards: Diataxis, Google developer documentation style guide, Microsoft Writing Style Guide.

- [x] Write the documentation standard.
- [x] Include document categories, file naming, section templates, language rules, command formatting, evidence requirements, and AI detection wording restrictions.
- [x] Include source links for documentation standards.

### Task 2: Documentation Index

**Files:**
- Create: `docs/README.md`
- Modify: `README.md`

**Interfaces:**
- Produces a single entry point for readers and interviewers.
- Links existing docs by purpose.

- [x] Create a categorized docs index.
- [x] Add a short link from root `README.md` to the docs index.

### Task 3: Project Worklog

**Files:**
- Create: `docs/project-worklog.md`
- Modify: `docs/project-improvement-roadmap.md`
- Modify: `docs/superpowers/plans/2026-07-08-real-nonescape-runtime.md`

**Interfaces:**
- Records what was done, why it was done, validation evidence, branches, and deferred work.
- Clearly states model weight download is deferred until GPU server setup.

- [x] Write the project worklog with phases and branch names.
- [x] Update roadmap/runtime plan status so the next reader knows model weight work is paused.

### Task 4: Verification And Push

**Files:**
- No production files.

- [x] Run `git diff --check`.
- [x] Run `git status --short --branch`.
- [ ] Commit with message `Add documentation governance and project worklog`.
- [ ] Push `feature/documentation-governance`.
