# Frontend Workbench Redesign Design

## Goal

Reshape the admin frontend from a concept demo into a usable AI image authenticity workbench while preserving the current visual language: dark calm canvas, fine rules, serif headings, restrained motion, compact cards, and professional forensic tone.

## References

- MLflow: experiment tracking, model registry, and evaluation are organized as lifecycle surfaces rather than unrelated pages.
- Label Studio: model output review works best when uncertain samples become an explicit human-in-the-loop queue.
- ClearML: experiment, model, dataset, and pipeline surfaces are connected through a dense operational dashboard.

These references inform information architecture only. The project should not copy their visual style.

## Current Problems

- Admin navigation names are too conceptual: `Pipeline`, `Experts`, and `Anomaly` do not clearly communicate the job-search project story.
- The backend now has evaluation execution APIs, but the frontend has no evaluation surface.
- The admin overview shows useful detection status, but it does not connect detection, model health, evaluation, and review into one workflow.
- Some existing pages rely on mock concepts such as expert training and anomaly pools. They look interesting but are less credible than model registry, evaluation metrics, and sample review.

## Product Direction

The admin area becomes the main workbench:

- `Overview`: operational snapshot across detection, model health, evaluation, and review.
- `Detections`: detection history and report navigation.
- `Evaluations`: create/run/retry evaluations, inspect metrics, and review wrong samples.
- `Models`: model registry and health checks.
- `Review`: uncertain or failed samples needing human attention.

The public detection flow and report page keep their current structure for this branch.

## Visual Constraints

- Preserve existing colors, tokens, typography, spacing rhythm, border style, and restrained animation.
- Do not introduce a marketing hero, large gradients, decorative blobs, or a new design system.
- Use dense but legible operational layouts: metric rows, tables, compact panels, status dots, and side-by-side detail panels.
- Keep cards at the current radius and border treatment.
- Keep Chinese/English mixed labels concise, but use clear operational English where existing Chinese encoding may be fragile.

## Data And API Design

Extend `src/api/backend.ts` with evaluation types and calls:

- `EvaluationStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED'`
- `EvaluationRunResponse`
- `EvaluationDetailResponse`
- `EvaluationSampleResponse`
- `createEvaluation`
- `listEvaluations`
- `getEvaluation`
- `runEvaluation`
- `retryEvaluation`
- `listEvaluationSamples`

The first frontend slice can create evaluations from a pasted CSV manifest, run queued evaluations, retry failed evaluations, list recent evaluations, and inspect wrong samples.

## Page Design

### Admin Layout

Replace icon-only conceptual navigation with operational destinations while keeping the compact sidebar:

- Overview
- Detections
- Evaluations
- Models
- Review

The sidebar stays narrow on desktop and should remain usable on smaller screens.

### Overview

Use the existing page style but change the content:

- API/system status from detection history load.
- Recent detections with status and report links.
- Evaluation snapshot: total runs, completed runs, latest accuracy/F1 if available.
- Model health snapshot: enabled models and health check status.
- Review queue snapshot: failed detections plus failed evaluations.

### Evaluations

Add a new page under `/admin/evaluations`:

- Left/main area: evaluation run table with name, dataset, model, status, attempts, accuracy, precision, recall, F1.
- Right/secondary area: selected evaluation detail with action buttons.
- Create panel: name, dataset, model id, manifest textarea.
- Actions: run, retry, refresh.
- Wrong samples: filename, ground truth, prediction, score, latency, failure reason.

### Detections

Create a clearer admin detection history page using existing detection APIs:

- Status filter.
- Recent detection table.
- Report link when a report exists.
- Basic file metadata.

### Models

Keep the useful model registry and health functionality from `AdminExperts`, but rename and simplify the page. Mock expert-training panels are removed from the primary workflow.

### Review

Keep the spirit of `AdminAnomaly`, but make it credible:

- Show failed detections and failed/incorrect evaluation samples.
- Keep the visual sample-review affordance.
- Do not claim retraining or data generation is actually happening.

## Error Handling

- Every page that calls an API shows a compact inline error message.
- Loading states use existing subdued text and status dots.
- Empty states should explain the next action: upload a detection, create an evaluation, or check model health.

## Acceptance Criteria

- `npm run lint` passes.
- `npm run build` passes.
- Admin navigation exposes Overview, Detections, Evaluations, Models, and Review.
- Evaluation frontend calls the backend APIs added in the previous branch.
- Existing visual style remains recognizable.
- No model weights or backend changes are required.

