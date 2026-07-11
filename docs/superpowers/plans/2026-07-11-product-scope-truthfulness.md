# Product Scope Truthfulness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure every formal frontend capability maps to implemented behavior while preserving unsupported visual concepts only as explicit development showcases.

**Architecture:** A typed capability registry becomes the frontend source for formal and showcase status. Formal routes stop importing mock-only pages, the report renders only backend state, and a durable capability matrix mirrors the registry for reviewers.

**Tech Stack:** React 18, TypeScript, React Router 7, Node test runner, CSS Modules, Markdown.

## Global Constraints

- Preserve the existing visual language and CSS Modules.
- Formal product scope is image detection, evaluation, model registry, review, and operations.
- Video and expert concepts remain available only under `/dev/showcase/*`.
- No formal page may fabricate model scores, evidence, timestamps, or task state.
- Do not add a frontend testing framework; keep policy logic testable with the existing Node runner.
- Each task ends with a focused commit and updates this checklist as work progresses.

---

### Task 0: Documentation Lifecycle And Decision Records

**Files:**
- Modify: `docs/documentation-standards.md`
- Modify: `docs/README.md`
- Create: `docs/adr/README.md`
- Create: `docs/adr/0001-record-architecture-decisions.md`

**Interfaces:**
- Produces: required document lifecycle values, supersession rules, ADR format,
  and branch documentation checklist used by every later task.

- [x] **Step 1: Define document lifecycle**

Add `Draft`, `Active`, `Superseded`, and `Historical` definitions. Require each
durable spec and explanation document to declare status, owner, last reviewed
date, and `Superseded by` when applicable. Plans and worklog entries are exempt
because their state is represented by checkboxes and chronology.

- [x] **Step 2: Define maintenance triggers**

Require the same PR to update documentation when it changes a public API,
configuration variable, capability status, state machine, operational recovery
procedure, architecture decision, or model claim. Define review failure when
code and durable documentation disagree.

- [x] **Step 3: Add the ADR index and first ADR**

Use this exact ADR shape:

```markdown
# ADR-NNNN: Decision Title

- Status: Accepted | Superseded
- Date: YYYY-MM-DD
- Owners: Project maintainers

## Context
## Decision
## Consequences
## Alternatives Considered
## Verification
```

ADR-0001 records the decision to use short, immutable decision records for
cross-cutting architecture choices while specs retain full product design.

- [x] **Step 4: Verify and commit**

Run: `git diff --check` and scan the new files for `TBD` or incomplete headings.

Commit: `docs: establish documentation lifecycle governance`

### Task 1: Typed Capability Registry

**Files:**
- Create: `src/config/capabilities.ts`
- Create: `src/config/capabilities.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `CapabilityStatus`, `ProductCapability`, `productCapabilities`, `formalCapabilityIds`, and `showcaseCapabilityIds`.
- Consumed by: route and documentation tasks.

- [x] **Step 1: Write the failing registry test**

Test exact invariants:

```ts
assert.deepEqual(formalCapabilityIds, [
  'image-detection', 'evaluation', 'model-registry', 'review-queue',
]);
assert.equal(byId('video-detection').status, 'showcase');
assert.equal(byId('real-model-runtime').status, 'server-pending');
assert.equal(productCapabilities.some((item) => item.status === 'implemented' && !item.evidence.length), false);
```

Add `src/config/capabilities.test.ts` to the existing `npm test` command.

- [x] **Step 2: Run the test and confirm RED**

Run: `npm run test`

Expected: TypeScript module resolution failure for `./capabilities.ts`.

- [x] **Step 3: Implement the registry**

Use these public types:

```ts
export type CapabilityStatus = 'implemented' | 'server-pending' | 'showcase' | 'non-goal';

export interface ProductCapability {
  id: string;
  name: string;
  status: CapabilityStatus;
  formalRoute?: string;
  showcaseRoute?: string;
  evidence: readonly string[];
}
```

Register image detection, evaluation, model registry, review queue, real model
runtime, video detection, expert LoRA concepts, audio detection, and model
training. Only implemented entries may expose `formalRoute`.

- [x] **Step 4: Verify and commit**

Run: `npm run test`

Expected: all frontend tests pass.

Commit: `test: define product capability contract`

### Task 2: Formal And Showcase Route Separation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/DetectChoice/index.tsx`
- Modify: `src/pages/DetectChoice/DetectChoice.module.css`
- Create: `src/config/routePolicy.ts`
- Create: `src/config/routePolicy.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: capability ids and route fields from Task 1.
- Produces: `formalRoutes`, `showcaseRoutes`, and `isFormalRoute(path)`.

- [x] **Step 1: Write failing route-policy tests**

```ts
assert.equal(isFormalRoute('/detect/image'), true);
assert.equal(isFormalRoute('/detect/video'), false);
assert.equal(isFormalRoute('/dev/showcase/video-detection'), false);
assert.equal(formalRoutes.some((route) => route.includes('showcase')), false);
```

- [x] **Step 2: Verify RED and implement policy**

Run: `npm run test`

Expected: missing `routePolicy.ts`.

Implement immutable formal and showcase route lists. Do not parse route intent
from display labels.

- [x] **Step 3: Update application routes**

- Remove the formal `/detect/video` component route.
- Redirect `/detect/video` to `/detect` for old bookmarks.
- Move video and image visual concepts to
  `/dev/showcase/video-detection` and `/dev/showcase/image-pipeline`.
- Remove `pipeline/showcase/*` from the nested admin route tree.
- Remove the video card and `FilmReel` import from `DetectChoice`.
- Let the image card occupy the existing constrained layout without changing
  its typography, colors, motion, or radius system.

- [x] **Step 4: Verify and commit**

Run: `npm run test && npm run lint && npm run build`

Expected: all commands pass and production output contains no formal
`/detect/video` lazy route.

Commit: `refactor: separate formal and showcase routes`

### Task 3: Evidence-Only Detection Report

**Files:**
- Modify: `src/pages/Report/index.tsx`
- Modify: `src/pages/Report/Report.module.css`
- Create: `src/pages/Report/reportPresentation.ts`
- Create: `src/pages/Report/reportPresentation.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `buildReportPresentation(detail)` returning verdict, confidence,
  evidence rows, and timeline rows derived only from `DetectionDetailResponse`.

- [x] **Step 1: Write failing presentation tests**

Cover these exact rules:

```ts
assert.equal(buildReportPresentation(null).state, 'unavailable');
assert.deepEqual(buildReportPresentation(completedWithoutPredictions).evidence, []);
assert.equal(buildReportPresentation(failedTask).verdict, 'FAILED');
assert.equal(buildReportPresentation(realCompletedTask).confidence, 0.86);
```

- [x] **Step 2: Verify RED and implement the mapper**

Run: `npm run test`

Expected: missing `reportPresentation.ts`.

The mapper must not import `src/data/mocks.ts`. Empty backend evidence remains
empty; it does not synthesize anomaly marks.

- [x] **Step 3: Refactor the report page**

- Remove `imageDemo`, static fake timeline, and synthetic evidence fallbacks.
- Require a non-demo route id and load backend data.
- Render a stable loading state before the request completes.
- Render the existing error treatment when neither task nor report resolves.
- Use the session preview only when it belongs to the current task.
- When no preview exists, render a metadata placeholder rather than a sample
  image.
- Disable PDF/archive commands or label them unavailable until a backend export
  contract exists; do not show a false success toast.

- [x] **Step 4: Verify and commit**

Run: `npm run test && npm run lint && npm run build`

Commit: `refactor: remove fabricated report evidence`

### Task 4: Capability Matrix And Documentation Governance

**Files:**
- Create: `docs/capability-matrix.md`
- Modify: `README.md`
- Modify: `docs/README.md`
- Modify: `docs/project-worklog.md`
- Modify: `docs/superpowers/plans/2026-07-11-product-scope-truthfulness.md`

**Interfaces:**
- Consumes: the capability ids and statuses from Task 1.
- Produces: the reviewer-facing source of capability truth.

- [x] **Step 1: Write the matrix**

For each registry entry, record status, user entry point, implementation
evidence, verification command, and next phase. Include a maintenance rule:
changing a status requires registry tests, this matrix, README, and worklog in
the same PR.

- [x] **Step 2: Reconcile overview claims**

- Replace “call a Python model service for real inference” with wording that
  distinguishes implemented service integration from server-pending weights.
- Link the capability matrix near the README scope.
- State that video visuals are showcases and not a product capability.
- Add the completed branch entry and exact verification evidence to worklog.

- [x] **Step 3: Complete plan checkboxes and verify docs**

Run:

```powershell
git diff --check
rg -n "TBD|TODO" docs/capability-matrix.md README.md
```

Expected: no whitespace errors or placeholders.

Commit: `docs: publish product capability matrix`

### Task 5: Final Verification And Delivery

**Files:** No new production files.

- [ ] **Step 1: Run complete local verification**

Run frontend tests, lint, build, Java tests, model-service tests, smoke tests,
`npm audit --audit-level=low`, and `git diff --check`.

- [ ] **Step 2: Review the branch as an interviewer**

Confirm formal navigation exposes no mock-only capability, formal report code
does not import mocks, and the matrix links every implemented claim to code or
tests.

- [ ] **Step 3: Push and open PR**

Push `refactor/product-scope-truthfulness`, open a ready PR referencing roadmap
PR #27, wait for all CI jobs, squash merge, and delete the remote branch.
