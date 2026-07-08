# Frontend Workbench Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the admin frontend into a usable AI image authenticity workbench while preserving the current visual style.

**Architecture:** Keep the existing React/Vite/CSS Modules frontend. Add evaluation API bindings and pages, rename admin information architecture, and reuse the current token-driven dark UI style instead of introducing a new design system.

**Tech Stack:** React 18, React Router 7, TypeScript, Vite, CSS Modules, existing primitive components.

## Global Constraints

- Preserve the current visual style and UI atmosphere.
- Do not redesign the public home, detection upload, or report page in this branch.
- Do not download model weights or require backend changes.
- Keep API calls centralized in `src/api/backend.ts`.
- Prefer dense operational layouts over marketing-style cards.
- Verify with `npm run lint` and `npm run build`.

---

### Task 1: Evaluation API Boundary

**Files:**
- Modify: `src/api/backend.ts`

**Interfaces:**
- Produces evaluation response types and API functions for create/list/detail/run/retry/sample filtering.

- [ ] Add evaluation TypeScript types.
- [ ] Add evaluation API functions.
- [ ] Run `npm run build` and expect TypeScript success.

### Task 2: Admin Navigation

**Files:**
- Modify: `src/layouts/AdminLayout.tsx`
- Modify: `src/layouts/AdminLayout.module.css`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces routes for `/admin/detections`, `/admin/evaluations`, `/admin/models`, and `/admin/review`.

- [ ] Rename navigation items to operational workbench destinations.
- [ ] Keep the compact sidebar visual style.
- [ ] Add lazy routes for new pages.
- [ ] Run `npm run build` and expect missing page failures until Task 3 creates pages.

### Task 3: Evaluation Page

**Files:**
- Create: `src/pages/AdminEvaluations/index.tsx`
- Create: `src/pages/AdminEvaluations/AdminEvaluations.module.css`

**Interfaces:**
- Consumes evaluation API functions from `src/api/backend.ts`.

- [ ] Build evaluation list and create form.
- [ ] Add run/retry/refresh actions.
- [ ] Add selected run detail and wrong-sample table.
- [ ] Preserve current visual style.

### Task 4: Detection History Page

**Files:**
- Create: `src/pages/AdminDetections/index.tsx`
- Create: `src/pages/AdminDetections/AdminDetections.module.css`

**Interfaces:**
- Consumes `listDetections`.

- [ ] Add status filter.
- [ ] Add detection table and report links.
- [ ] Add empty/error states.

### Task 5: Models Page

**Files:**
- Create: `src/pages/AdminModels/index.tsx`
- Create: `src/pages/AdminModels/AdminModels.module.css`
- Modify or leave deprecated: `src/pages/AdminExperts/*`

**Interfaces:**
- Consumes `listModels` and `checkModelHealth`.

- [ ] Move credible model registry behavior into a clearer Models page.
- [ ] Remove mock expert-training from primary navigation.
- [ ] Keep model health display.

### Task 6: Review Page

**Files:**
- Create: `src/pages/AdminReview/index.tsx`
- Create: `src/pages/AdminReview/AdminReview.module.css`

**Interfaces:**
- Consumes detection history and evaluation sample APIs.

- [ ] Show failed detections.
- [ ] Show failed evaluations and wrong samples when available.
- [ ] Avoid claiming retraining or data generation.

### Task 7: Overview Integration

**Files:**
- Modify: `src/pages/AdminOverview/index.tsx`
- Modify: `src/pages/AdminOverview/AdminOverview.module.css`

**Interfaces:**
- Consumes detection, model, and evaluation API summaries.

- [ ] Replace conceptual overview cards with operational status panels.
- [ ] Link panels to new admin routes.
- [ ] Keep the existing typography and card language.

### Task 8: Documentation, Verification, Push

**Files:**
- Modify: `docs/project-worklog.md`

**Interfaces:**
- Records what changed and why the UI style was preserved.

- [ ] Update worklog.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Commit and push `feature/evaluation-frontend-workbench`.

