# Real Nonescape Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single heuristic scorer with a runtime adapter framework that can run Nonescape Mini ONNX when weights are available and fall back explicitly to the existing heuristic runtime for local development.

**Architecture:** The FastAPI model service owns runtime selection, image preprocessing, model loading, and health metadata. The Java backend keeps the existing HTTP inference contract and only consumes richer `rawResponse` metadata. Model weights stay outside Git under `/models/weights` or a configured local path.

**Tech Stack:** Python 3.11, FastAPI, Pydantic, Pillow, optional ONNX Runtime, Java Spring Boot existing HTTP client.

## Global Constraints

- Do not commit model weights.
- Keep Java business logic separate from Python model inference.
- Keep `/api/v1/predict` response fields backward-compatible: `modelVersion`, `rawScore`, `normalizedScore`, `label`, `latencyMs`, `rawResponse`.
- `/health` must tell the truth about whether the real runtime is loaded.
- Missing weights must not crash the development service when fallback is enabled.
- Every production behavior must be introduced with a failing test first.

---

### Task 1: Runtime Contract And Heuristic Adapter

**Files:**
- Create: `model-services/nonescape-mini/app/runtime/base.py`
- Create: `model-services/nonescape-mini/app/runtime/heuristic.py`
- Create: `model-services/nonescape-mini/app/runtime/__init__.py`
- Modify: `model-services/nonescape-mini/app/scoring.py`
- Modify: `model-services/nonescape-mini/tests/test_api.py`

**Interfaces:**
- Produces: `RuntimeHealth`, `RuntimePrediction`, `ModelRuntime`.
- Produces: `HeuristicRuntime.predict(image_path: str, threshold: float) -> RuntimePrediction`.
- Produces: `HeuristicRuntime.health() -> RuntimeHealth`.

- [x] **Step 1: Write failing tests**

Add tests expecting `/health` to include runtime metadata and `/api/v1/predict` to include `runtime`, `modelLoaded`, and `preprocessVersion` in `rawResponse`.

- [x] **Step 2: Run test to verify red**

Run:

```powershell
cd model-services\nonescape-mini
..\..\.venv-model-service\Scripts\python -m pytest tests\test_api.py
```

Expected: FAIL because the current API response does not include runtime metadata.

- [x] **Step 3: Implement minimal runtime adapter**

Move the existing image-statistics scorer behind `HeuristicRuntime` and keep the score formula unchanged.

- [x] **Step 4: Run test to verify green**

Run the same pytest command. Expected: PASS.

### Task 2: Nonescape ONNX Runtime Loader

**Files:**
- Create: `model-services/nonescape-mini/app/runtime/nonescape_onnx.py`
- Modify: `model-services/nonescape-mini/app/runtime/__init__.py`
- Modify: `model-services/nonescape-mini/app/main.py`
- Modify: `model-services/nonescape-mini/requirements.txt`
- Modify: `model-services/nonescape-mini/tests/test_api.py`

**Interfaces:**
- Produces: `NonescapeOnnxRuntime(weights_path: str, device: str)`.
- Consumes: `ModelRuntime`.
- Environment variables:
  - `MODEL_RUNTIME=heuristic|nonescape-onnx`
  - `MODEL_WEIGHTS_PATH=/models/weights/nonescape-mini-v0.onnx`
  - `MODEL_DEVICE=cpu|cuda`
  - `MODEL_ALLOW_HEURISTIC_FALLBACK=true|false`

- [x] **Step 1: Write failing tests**

Add tests that set `MODEL_RUNTIME=nonescape-onnx` with a missing weight path and assert fallback health reports `runtime=heuristic`, `requestedRuntime=nonescape-onnx`, `modelLoaded=false`, and a clear message.

- [x] **Step 2: Run test to verify red**

Run pytest and confirm the runtime selector does not exist yet.

- [x] **Step 3: Implement runtime selector and ONNX skeleton**

Add a selector that imports ONNX Runtime only when the ONNX runtime is requested. If weights are missing and fallback is allowed, use `HeuristicRuntime` and report degraded health. If fallback is disabled, raise startup/runtime health failure with a clear message.

- [x] **Step 4: Run test to verify green**

Run model-service pytest.

### Task 3: Documentation And Weight Handling

**Files:**
- Modify: `model-services/nonescape-mini/README.md`
- Modify: `docs/model-integration-framework.md`
- Modify: `infra/docker-compose.yml`
- Modify: `.gitignore`

**Interfaces:**
- Documents weight download URLs:
  - `https://nonescape.sfo2.cdn.digitaloceanspaces.com/nonescape-mini-v0.onnx`
  - `https://nonescape.sfo2.cdn.digitaloceanspaces.com/nonescape-mini-v0.safetensors`
- Documents mounted location: `/models/weights/nonescape-mini-v0.onnx`.

- [x] **Step 1: Write documentation**

Explain local CPU fallback, real ONNX runtime, weight path, and why weights are not committed.

- [x] **Step 2: Verify docs and ignores**

Run:

```powershell
git diff --check
```

Expected: no whitespace errors.

### Task 4: Final Verification And Push

**Files:**
- No new production files.

- [x] Run model-service tests:

```powershell
cd model-services\nonescape-mini
..\..\.venv-model-service\Scripts\python -m pytest
```

- [x] Skip backend focused tests because no Java DTO/client files changed:

```powershell
cd backend-java
mvn test
```

- [ ] Commit:

```powershell
git add docs model-services infra .gitignore
git commit -m "Add real Nonescape runtime framework"
```

- [ ] Push:

```powershell
git push -u origin feature/real-nonescape-runtime
```
