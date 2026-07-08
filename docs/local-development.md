# Local Development Environment

This project has four runtime pieces:

- React/Vite frontend on `5173`
- Spring Boot backend on `8080`
- FastAPI model service on `5010`
- PostgreSQL `5432` and Redis `6379`

## Current Windows Diagnosis

Checked on 2026-07-08:

- Installed: Git, GitHub CLI, Node.js, npm, Java, Maven, Python virtual environment
- Missing: Docker, Docker Compose, PostgreSQL CLI, Redis CLI
- Free ports: `5432`, `6379`, `8080`, `5010`, `5173`
- Java note: Maven currently sees Java 25, while the backend targets Java 21. Prefer JDK 21 LTS for reproducible builds.

The main blocker is infrastructure startup, not frontend/backend source code.

## Recommended Path

Use Docker Compose through Docker Desktop with the WSL2 backend on Windows, or use Docker directly on a Linux/SSH server.

Windows install command if you choose to install Docker Desktop yourself:

```powershell
winget install Docker.DockerDesktop
```

After installation, restart the terminal and verify:

```powershell
docker --version
docker compose version
```

Then start the full stack:

```powershell
docker compose -f infra/docker-compose.yml up --build
```

## Preflight Check

Run this before starting the stack:

```powershell
powershell -ExecutionPolicy Bypass -File tools/check-local-env.ps1
```

For CI-like failure behavior:

```powershell
powershell -ExecutionPolicy Bypass -File tools/check-local-env.ps1 -Strict
```

## Windows Native Startup

Docker is preferred. If Docker is unavailable, start native PostgreSQL and Redis first:

- PostgreSQL: database `aigc_forensics`, user `aigc`, password `aigc`
- Redis: `localhost:6379`

Then run:

```powershell
powershell -ExecutionPolicy Bypass -File tools/start-local-stack.ps1
```

Useful dry run:

```powershell
powershell -ExecutionPolicy Bypass -File tools/start-local-stack.ps1 -CheckOnly
```

The script writes logs under `.dev/logs`.

## Manual Startup

Model service:

```powershell
cd model-services\nonescape-mini
..\..\.venv-model-service\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 5010
```

Backend:

```powershell
cd backend-java
mvn spring-boot:run
```

Frontend:

```powershell
npm run dev -- --host 127.0.0.1
```

Open:

- Frontend: http://127.0.0.1:5173/
- Swagger UI: http://127.0.0.1:8080/swagger-ui/index.html
- Model health: http://127.0.0.1:5010/health

## WSL Or SSH Server

For WSL or an SSH Linux server, prefer cloning the repository into the Linux filesystem instead of running it from `/mnt/d`, because Node.js and Maven file watching are faster there.

Recommended commands:

```bash
git clone git@github.com:fengting124/develop.git
cd develop
npm install
python3 -m venv .venv-model-service
. .venv-model-service/bin/activate
pip install -r model-services/nonescape-mini/requirements.txt
docker compose -f infra/docker-compose.yml up --build
```

For GPU model work later, keep this same service boundary and only replace the implementation behind `model-services/nonescape-mini/app/scoring.py`.

## Troubleshooting

If backend startup fails with database errors, confirm PostgreSQL is reachable at `localhost:5432` and Flyway can create tables.

If async jobs do not run, confirm Redis is reachable at `localhost:6379`.

If the frontend cannot reach the backend, confirm the Vite proxy in `vite.config.ts` points `/api` to `http://localhost:8080`.

If model registry health is unavailable, confirm `http://localhost:5010/health` returns `{"status":"ok"}` before starting the backend.
