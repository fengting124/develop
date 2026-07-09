# Full-Stack Evaluation Demo Smoke Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing evaluation backend and admin evaluation page easier to demo as one full-stack workflow without downloading model weights.

**Architecture:** Keep the Java backend as the business and persistence boundary, keep model execution behind the existing evaluation client interface, and keep the React admin UI visual style unchanged. This branch only improves frontend API error messaging, adds a small frontend test boundary, and documents a repeatable demo path.

**Tech Stack:** React 18, TypeScript, Vite, Node built-in test runner, Spring Boot Java backend, Maven, existing deterministic evaluation model client.

## Global Constraints

- Do not download model weights.
- Do not replace the current frontend visual style.
- Do not fake successful backend data in the frontend.
- Keep API calls centralized in `src/api/backend.ts`.
- Keep docs concise and aligned with `docs/documentation-standards.md`.
- Verify with `npm run test`, `npm run lint`, `npm run build`, and `mvn -B test`.

---

### Task 1: Add A Frontend API Error Parsing Test

**Files:**
- Modify: `package.json`
- Create: `src/api/errorMessage.test.ts`

**Interfaces:**
- Produces: expected behavior for `formatApiErrorMessage(status: number, bodyText: string): string`
- Consumes later: `src/api/errorMessage.ts`

- [ ] Add a `test` script using Node's built-in test runner:

```json
"test": "node --test --experimental-strip-types src/api/errorMessage.test.ts"
```

- [ ] Create `src/api/errorMessage.test.ts` with assertions for backend JSON errors, Vite proxy 502 errors, plain text errors, and empty responses.

- [ ] Run `npm run test`.

Expected: FAIL because `src/api/errorMessage.ts` does not exist yet.

### Task 2: Implement Reusable API Error Formatting

**Files:**
- Create: `src/api/errorMessage.ts`
- Modify: `src/api/backend.ts`

**Interfaces:**
- Produces: `formatApiErrorMessage(status: number, bodyText: string): string`
- `src/api/backend.ts` must call the formatter after `response.text()`.

- [ ] Implement `formatApiErrorMessage`.
- [ ] Parse backend JSON bodies with `message`, `error`, or `detail` fields.
- [ ] Map `502`, `503`, and `504` to:

```text
Backend API unavailable. Start the Java backend and try again.
```

- [ ] Preserve non-empty plain text errors for other statuses.
- [ ] Use `Request failed with status ${status}` for empty bodies.
- [ ] Run `npm run test`.

Expected: PASS.

### Task 3: Document The Demo Workflow

**Files:**
- Create: `docs/fullstack-evaluation-demo.md`
- Modify: `docs/README.md`
- Modify: `README.md`
- Modify: `docs/project-worklog.md`

**Interfaces:**
- Produces a durable runbook that explains how to demo evaluation creation, execution, metrics inspection, and known local environment limits.

- [ ] Add a how-to document with audience, current status, step-by-step run commands, verification checklist, and deferred Docker/GPU work.
- [ ] Link it from `docs/README.md`.
- [ ] Add a short pointer in root `README.md`.
- [ ] Add a dated worklog entry for the branch.

### Task 4: Verify And Publish

**Files:**
- All changed files.

**Interfaces:**
- Produces a pushed branch and PR.

- [ ] Run `npm run test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run `mvn -B test` from `backend-java`.
- [ ] Run `git diff --check`.
- [ ] Commit as `feat: polish full-stack evaluation demo flow`.
- [ ] Push `feature/fullstack-evaluation-demo-smoke`.
- [ ] Open a PR and wait for CI.
