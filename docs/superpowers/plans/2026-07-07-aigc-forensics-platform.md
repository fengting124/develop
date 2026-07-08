# AI 图像真实性检测平台实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Java-first AI image authenticity detection and model evaluation platform with a real model service, persistent task/report records, and a React frontend.

**Architecture:** React remains the interaction layer. Spring Boot is the business backend and owns files, tasks, reports, model registry, model orchestration, and persistence. Python FastAPI model services own AI inference. PostgreSQL stores structured data; local storage stores uploaded files and thumbnails.

**Tech Stack:** React 18, TypeScript, Vite, Java 21 or 17, Spring Boot 3, Maven, Spring Data JPA, Flyway, PostgreSQL, Python FastAPI, PyTorch, safetensors, Docker Compose.

## Global Constraints

- Business backend must be Java.
- Python is allowed only for model services.
- MVP only supports image detection.
- Video detection is not part of MVP.
- Nonescape Mini is the first real model.
- Do not claim the detector is a truth engine.
- Every detection report must include model version, threshold, latency, image hash, and disclaimer.
- Every backend feature must have a test or a concrete manual verification command.
- Do not commit model weights, uploads, local database files, or generated reports.

---

## Phase 0: Documentation and Repo Orientation

### Task 0.1: Confirm Project Boundary

**Files:**

- Read: `docs/development-plan.md`
- Read: `docs/superpowers/specs/2026-07-07-image-authenticity-platform-design.md`

**Deliverable:** Developer understands this is an image-only Java business system with Python model service.

- [ ] Read both docs.
- [ ] Confirm no MVP task mentions video detection.
- [ ] Confirm no MVP task mentions FastAPI as the business backend.
- [ ] Confirm Nonescape Mini is first model.

### Task 0.2: Rewrite README

**Files:**

- Modify: `README.md`

**Deliverable:** README describes the scoped Java-first project.

Content requirements:

- Project name.
- Problem statement.
- MVP scope.
- Tech stack.
- Architecture diagram.
- What this project does not claim.
- Development commands.
- Model/license attribution placeholders.

Verification:

```powershell
Get-Content README.md
npm run build
```

Expected:

- README is readable.
- Frontend build passes.

---

## Phase 1: Java Backend Foundation

### Task 1.1: Scaffold Spring Boot Project

**Files:**

- Create: `backend-java/pom.xml`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/AigcForensicsApplication.java`
- Create: `backend-java/src/main/resources/application.yml`
- Create: `backend-java/src/test/java/com/fengting/aigcforensics/AigcForensicsApplicationTests.java`

**Deliverable:** Spring Boot app starts and tests run.

Dependencies:

- `spring-boot-starter-web`
- `spring-boot-starter-validation`
- `spring-boot-starter-data-jpa`
- `postgresql`
- `flyway-core`
- `springdoc-openapi-starter-webmvc-ui`
- `spring-boot-starter-test`

Verification:

```powershell
cd backend-java
mvn test
```

Expected:

- Build succeeds.
- Context loads.

### Task 1.2: Add Health API

**Files:**

- Create: `backend-java/src/main/java/com/fengting/aigcforensics/controller/HealthController.java`
- Create: `backend-java/src/test/java/com/fengting/aigcforensics/controller/HealthControllerTest.java`

**API:**

`GET /api/health`

Response:

```json
{
  "status": "ok",
  "service": "image-authenticity-backend"
}
```

Verification:

```powershell
cd backend-java
mvn test
```

Expected:

- Health controller test passes.

### Task 1.3: Add PostgreSQL Docker Compose

**Files:**

- Create: `infra/docker-compose.yml`
- Modify: `backend-java/src/main/resources/application.yml`

**Deliverable:** PostgreSQL starts locally.

Compose services:

- `postgres`

Verification:

```powershell
cd infra
docker compose up -d postgres
docker compose ps
```

Expected:

- PostgreSQL container is running.

---

## Phase 2: Data Model and Storage

### Task 2.1: Add Database Migrations

**Files:**

- Create: `backend-java/src/main/resources/db/migration/V1__init_core_tables.sql`

Tables:

- `media_asset`
- `detection_task`
- `model_registry`
- `model_prediction`
- `detection_report`

Verification:

```powershell
cd backend-java
mvn test
```

Expected:

- Flyway migrations apply during integration test.

### Task 2.2: Add JPA Entities and Repositories

**Files:**

- Create: `backend-java/src/main/java/com/fengting/aigcforensics/domain/MediaAsset.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/domain/DetectionTask.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/domain/ModelRegistry.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/domain/ModelPrediction.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/domain/DetectionReport.java`
- Create repositories under `repository/`.

Verification:

```powershell
cd backend-java
mvn test
```

Expected:

- Repository save/find tests pass.

### Task 2.3: Add Local Storage Service

**Files:**

- Create: `backend-java/src/main/java/com/fengting/aigcforensics/service/StorageService.java`
- Create: `backend-java/src/main/java/com/fengting/aigcforensics/service/LocalStorageService.java`
- Create: `backend-java/src/test/java/com/fengting/aigcforensics/service/LocalStorageServiceTest.java`
- Modify: `.gitignore`

Responsibilities:

- Save upload.
- Normalize filename.
- Return storage path.
- Reject empty files.

Verification:

```powershell
cd backend-java
mvn test
```

Expected:

- Storage test writes file to temporary directory.

### Task 2.4: Add Hash and Image Metadata Services

**Files:**

- Create: `HashService.java`
- Create: `ImageMetadataService.java`
- Create tests.

Responsibilities:

- SHA-256 hash.
- Width and height detection via Java ImageIO.
- Content type validation.

Verification:

```powershell
cd backend-java
mvn test
```

Expected:

- Hash and metadata tests pass.

---

## Phase 3: Model Service Protocol

### Task 3.1: Add Model Service Contract Docs

**Files:**

- Create: `docs/model-protocol.md`

Must document:

- `GET /health`
- `GET /metadata`
- `POST /predict`
- Request/response JSON.
- Error format.

Verification:

```powershell
Get-Content docs\model-protocol.md
```

Expected:

- Contract matches design spec.

### Task 3.2: Create Nonescape Model Service Skeleton

**Files:**

- Create: `model-services/nonescape-service/app.py`
- Create: `model-services/nonescape-service/detector.py`
- Create: `model-services/nonescape-service/requirements.txt`
- Create: `model-services/nonescape-service/tests/test_app.py`

Initial behavior:

- `/health` returns ok.
- `/metadata` returns model info.
- `/predict` returns deterministic fake response before weights are added.

Verification:

```powershell
cd model-services\nonescape-service
python -m pip install -r requirements.txt
pytest -q
uvicorn app:app --port 5010
```

Expected:

- Tests pass.
- Service starts.

### Task 3.3: Add Nonescape Mini Real Inference

**Files:**

- Modify: `model-services/nonescape-service/detector.py`
- Modify: `model-services/nonescape-service/app.py`
- Add: `model-services/nonescape-service/README.md`

Responsibilities:

- Load `nonescape-mini-v0.safetensors` from local `weights/`.
- Support CPU fallback.
- Return score, label, threshold, latency.
- If weights are missing, fail fast with clear error unless `MODEL_ALLOW_FAKE=false` is disabled for local development.

Verification:

```powershell
cd model-services\nonescape-service
python -m pytest -q
```

Manual:

```powershell
Invoke-RestMethod http://127.0.0.1:5010/health
```

Expected:

- Health works.
- Predict works on a local sample when weights exist.

---

## Phase 4: Java Model Registry and Model Client

### Task 4.1: Seed Nonescape Mini Model Registry

**Files:**

- Modify: `backend-java/src/main/resources/db/migration/V2__seed_model_registry.sql`

Seed:

- `model_id = nonescape-mini`
- `display_name = Nonescape Mini`
- `version = v0`
- `endpoint_url = http://localhost:5010`
- `enabled = true`
- `default_threshold = 0.5`
- `weight = 1.0`

Verification:

```powershell
cd backend-java
mvn test
```

Expected:

- Seed data exists in repository test.

### Task 4.2: Add Model APIs

**Files:**

- Create: `ModelController.java`
- Create: `ModelRegistryService.java`
- Create DTOs.
- Create tests.

APIs:

- `GET /api/models`
- `POST /api/models/{modelId}/health-check`

Verification:

```powershell
cd backend-java
mvn test
```

Expected:

- Model APIs return seeded model.

### Task 4.3: Add Model Client

**Files:**

- Create: `client/ModelServiceClient.java`
- Create: `client/dto/ModelPredictRequest.java`
- Create: `client/dto/ModelPredictResponse.java`
- Create tests with mocked HTTP server or mocked client.

Responsibilities:

- Call `/health`.
- Call `/metadata`.
- Call `/predict`.
- Convert errors into domain exceptions.

Verification:

```powershell
cd backend-java
mvn test
```

Expected:

- Client tests pass.

---

## Phase 5: Detection MVP

### Task 5.1: Add Detection DTOs

**Files:**

- Create DTOs under `backend-java/src/main/java/com/fengting/aigcforensics/dto/detection/`.

DTOs:

- `CreateDetectionResponse`
- `DetectionTaskResponse`
- `DetectionReportResponse`
- `ModelPredictionResponse`

Verification:

```powershell
cd backend-java
mvn test
```

Expected:

- DTO serialization test passes.

### Task 5.2: Add Detection Orchestrator

**Files:**

- Create: `DetectionOrchestrator.java`
- Create: `ReportService.java`
- Create tests.

Responsibilities:

- Create task.
- Save file.
- Compute hash.
- Read enabled models.
- Call Nonescape service.
- Save model prediction.
- Generate report.
- Mark task completed or failed.

Verification:

```powershell
cd backend-java
mvn test
```

Expected:

- Orchestrator test covers success and model failure.

### Task 5.3: Add Detection APIs

**Files:**

- Create: `DetectionController.java`
- Create: `ReportController.java`
- Create controller tests.

APIs:

- `POST /api/detections`
- `GET /api/detections/{taskId}`
- `GET /api/detections`
- `GET /api/reports/{reportId}`

Verification:

```powershell
cd backend-java
mvn test
```

Expected:

- API tests pass.

Manual:

```powershell
Invoke-RestMethod -Method Post -Form @{ file = Get-Item .\sample.jpg } http://localhost:8080/api/detections
```

Expected:

- Returns `taskId` and eventually `reportId`.

---

## Phase 6: Frontend Integration

Status on 2026-07-08: complete for the MVP scope. The UI is connected through
`src/api/backend.ts`, image upload uses the async detection workflow, the report
page can load by task id or report id, the admin overview shows live detection
history, and the model registry page shows backend health-check status. Full
Docker end-to-end verification remains deferred until the local Docker
environment is ready.

### Task 6.1: Add Frontend API Client

**Files:**

- Create: `src/api/backend.ts`
- Modify: `vite.config.ts`

Responsibilities:

- Call Java backend.
- Define TypeScript response types.
- Add dev proxy `/api -> http://localhost:8080`.

Verification:

```powershell
npm run build
```

Expected:

- Build passes.
- Implemented and verified.

### Task 6.2: Connect DetectImage Page

**Files:**

- Modify: `src/pages/DetectImage/index.tsx`

Responsibilities:

- Upload selected image to `/api/detections`.
- Poll or fetch task result.
- Route to report page.
- Replace fixed mock completion with API response.

Verification:

```powershell
npm run build
```

Manual:

- Start backend.
- Start model service.
- Start frontend.
- Upload image.
- See report.

### Task 6.3: Connect Report Page

**Files:**

- Modify: `src/pages/Report/index.tsx`

Responsibilities:

- Fetch `/api/reports/{reportId}`.
- Display verdict.
- Display confidence.
- Display model version, threshold, latency.
- Display image hash.
- Display disclaimer.

Verification:

```powershell
npm run build
```

Expected:

- Build passes.
- Report page renders API data.
- Implemented and verified with `/api/detections/{taskId}` and
  `/api/reports/{reportId}`.

### Task 6.4: Add Detection History

**Files:**

- Create or modify history/admin overview page.

Responsibilities:

- Fetch `GET /api/detections`.
- Show file name, verdict, confidence, created time.
- Link to report.

Verification:

```powershell
npm run build
```

Expected:

- Build passes.
- Implemented and verified in the admin overview page.

---

## Phase 7: Evaluation Feature

This phase starts only after MVP works.

### Task 7.1: Add Evaluation Tables

Tables:

- `evaluation_run`
- `evaluation_sample`

### Task 7.2: Add Evaluation API

APIs:

- `POST /api/evaluations`
- `GET /api/evaluations/{evaluationId}`
- `GET /api/evaluations`

### Task 7.3: Add Metrics Calculation

Metrics:

- Accuracy.
- Precision.
- Recall.
- F1.
- Average latency.

### Task 7.4: Add Evaluation Frontend Page

Responsibilities:

- Upload labels CSV and image zip.
- Show metrics.
- Show wrong samples.

---

## Phase 8: Multi-Model Comparison

This phase starts only after evaluation works.

### Task 8.1: Add Nonescape Full Service

### Task 8.2: Add ClipBased Service

### Task 8.3: Enable Multiple Models Per Detection

### Task 8.4: Add Model Comparison UI

### Task 8.5: Add Weighted Average

No stacking meta-learner in this phase.

---

## Backlog

Only after Phases 1-8:

- Video抽帧实验页。
- PDF 报告导出。
- JWT 登录。
- MinIO。
- RabbitMQ。
- Prometheus。
- GitHub Actions。
- Stacking meta-learner。

## Completion Rule

Do not call any phase complete unless these pass:

```powershell
npm run build
```

```powershell
cd backend-java
mvn test
```

For model service changes:

```powershell
cd model-services\nonescape-service
pytest -q
```

For Docker changes:

```powershell
cd infra
docker compose up --build
```
