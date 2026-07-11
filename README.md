# Visual Authenticity Workbench

AI image authenticity analysis and model evaluation platform.

## Problem

AI-generated images are now common in content moderation, media verification, legal review, and asset management workflows. A single detector score is not enough for a real application: teams also need upload records, model versions, thresholds, latency, image hashes, history, and reports that clearly explain the limits of the result.

This project turns open-source AI image detectors into an engineering system. It does not claim to be a universal truth engine.

## Scope

MVP supports image-only detection:

- Upload one JPG, PNG, or WebP image.
- Store the file and image metadata.
- Create a detection task in a Java backend.
- Call a versioned Python model-service contract. Local development uses the
  heuristic runtime; real weights and CUDA verification are server-pending.
- Store model output, threshold, version, latency, and image hash.
- Generate a report and detection history.
- Show model health and registry information.

Out of scope for MVP:

- Video deepfake detection.
- Audio or text detection.
- Legal-grade forensic certification.
- User billing, tenants, RBAC, or complex audit workflows.
- Custom model training or stacking meta-learners.

Video and expert-ensemble visuals are development showcases, not formal
product capabilities. See the [product capability matrix](docs/capability-matrix.md)
for implementation evidence and deferred boundaries.

## Architecture

```text
React + TypeScript frontend
  -> Spring Boot Java backend
    -> PostgreSQL
    -> local file storage
    -> Python FastAPI model service
      -> Nonescape Mini image detector
```

The Java backend owns business logic. Python services own model inference.

## Tech Stack

- Frontend: React 18, TypeScript, Vite, Framer Motion
- Backend: Java, Spring Boot, Maven, Spring Data JPA, Flyway
- Database: PostgreSQL
- Model service: Python, FastAPI, PyTorch, safetensors
- Deployment: Docker Compose

## Planned Models

MVP model:

- Nonescape Mini: <https://github.com/e3ntity/nonescape>

Later comparison models:

- Nonescape Full
- ClipBased-SyntheticImageDetection: <https://github.com/grip-unina/ClipBased-SyntheticImageDetection>

## Development

Run the local environment check first:

```powershell
powershell -ExecutionPolicy Bypass -File tools/check-local-env.ps1
```

Full local stack with Docker Compose:

```powershell
docker compose -f infra/docker-compose.yml up --build
```

Frontend:

```powershell
npm install
npm run dev
npm run build
```

Java backend:

```powershell
cd backend-java
mvn test
mvn spring-boot:run
```

Model service:

```powershell
cd model-services\nonescape-mini
..\..\.venv-model-service\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 5010
```

Detailed Windows, WSL, and SSH-server setup notes are in `docs/local-development.md`.
For the evaluation workflow demo, follow `docs/fullstack-evaluation-demo.md`.

## Documentation

Start with `docs/README.md` for the documentation map, project worklog,
improvement roadmap, and writing standards.

## Reliability Note

Detection results are auxiliary signals. They should not be used as the sole basis for high-stakes decisions.
