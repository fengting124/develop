# Frontend API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the existing React UI to the Spring Boot detection and model APIs without changing the established visual style.

**Architecture:** The frontend talks to the backend only through `src/api/backend.ts`. The image detection page owns upload, async job submission, and polling. The report and model pages consume existing backend response DTOs and keep demo fallbacks when the backend is unavailable.

**Tech Stack:** React 18, TypeScript, Vite, React Router, Spring Boot REST API.

## Global Constraints

- Keep the current UI style and page structure.
- Do not introduce a new frontend state library or test framework for this slice.
- Use `VITE_API_BASE_URL` for deployed API hosts and Vite `/api` proxy for local development.
- Keep video detection and complex evaluation out of this branch.

---

### Task 1: API Client Boundary

**Files:**
- Create: `src/api/backend.ts`
- Modify: `vite.config.ts`

**Interfaces:**
- Produces: `createImageDetection(file)`, `runDetectionAsync(taskId)`, `getDetection(taskId)`, `listModels()`
- Produces DTO types matching Java backend responses.

- [x] Add typed DTOs for detection and model registry responses.
- [x] Add `apiRequest` with consistent error handling.
- [x] Add Vite `/api` proxy to `http://localhost:8080`.
- [x] Verify with `npm run build`.

### Task 2: Image Detection Flow

**Files:**
- Modify: `src/pages/DetectImage/index.tsx`
- Modify: `src/pages/DetectImage/DetectImage.module.css`

**Interfaces:**
- Consumes: API client from Task 1.
- Produces: Real upload -> async run -> polling -> report link workflow.

- [x] Keep demo-image animation as fallback.
- [x] Submit selected image to `POST /api/detections/images`.
- [x] Start async detection through `POST /api/detections/{taskId}/run-async`.
- [x] Poll `GET /api/detections/{taskId}` until `COMPLETED` or `FAILED`.
- [x] Store a session preview URL for the report page.
- [x] Verify with `npm run build`.

### Task 3: Report Page API Data

**Files:**
- Modify: `src/pages/Report/index.tsx`

**Interfaces:**
- Consumes: `getDetection(taskId)`.
- Produces: Report page that can display real backend verdict, predictions, metadata, and timeline.

- [x] Load report detail from route `:id`.
- [x] Use session preview image when navigating from detection.
- [x] Render backend metadata and model prediction evidence.
- [x] Preserve demo fallback for `/detect/report/demo`.
- [x] Verify with `npm run build`.

### Task 4: Model Registry Panel

**Files:**
- Modify: `src/pages/AdminExperts/index.tsx`
- Modify: `src/pages/AdminExperts/AdminExperts.module.css`

**Interfaces:**
- Consumes: `listModels()`.
- Produces: Model registry cards above the existing expert cards.

- [x] Fetch `GET /api/models`.
- [x] Render model display name, version, type, enabled state, threshold, and weight.
- [x] Keep existing expert cards untouched.
- [x] Verify with `npm run build` and `npm run lint`.

### Task 5: Final Verification

**Files:**
- No production files.

- [x] Run `npm run build`.
- [x] Run `npm run lint`.
- [x] Run backend `mvn test`.
- [x] Start Vite dev server and provide the local URL.
- [ ] Commit and push `feature/frontend-api-integration`.
