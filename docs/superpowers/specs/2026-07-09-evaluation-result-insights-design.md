# Evaluation Result Insights Design

## Purpose

Improve `/admin/evaluations` so an interviewer can understand model behavior
from one run without reading raw sample rows. The page should explain where the
model is correct, where it confuses labels, and whether failures are prediction
errors or execution errors.

## Scope

This branch adds frontend-only insight rendering based on the existing
`EvaluationDetailResponse.samples` payload.

In scope:

- Confusion matrix for `AUTHENTIC`, `SYNTHETIC`, and `UNCERTAIN`.
- Ground-truth label distribution.
- Summary counts for total, correct, wrong, pending, and failed samples.
- Clearer empty state when a selected run has no wrong or failed samples.
- Documentation of the work in `docs/project-worklog.md`.

Out of scope:

- New backend aggregation APIs.
- Model weight download or GPU runtime integration.
- Charts from a new visualization dependency.
- Video, training, or dataset management workflows.

## Architecture

Add a focused pure utility module under `src/pages/AdminEvaluations`:

```text
EvaluationDetailResponse.samples
  -> buildEvaluationInsights(samples)
  -> AdminEvaluations insight panels
```

The utility owns all counting logic and is tested with Node's built-in test
runner. The React page only renders the computed view model. This keeps business
math out of JSX and makes later backend/API changes easier to compare against
frontend expectations.

## UI Behavior

The existing visual style stays intact:

- Use the current dark surface, border, mono labels, and compact panel rhythm.
- Render the insight section inside the selected-run detail area.
- Use text tables and small numeric cards rather than a chart library.
- Keep labels English to match the current admin page copy.

The insight section contains:

- A compact summary strip.
- A confusion matrix with rows as ground truth and columns as prediction.
- A label-distribution list showing sample counts and percentages.
- A wrong-sample empty state that distinguishes "no selected run" from "all
  completed predictions matched".

## Error Handling

Samples with `failureReason` count as failed samples. Samples with no
`predictedLabel` and no `failureReason` count as pending samples. Failed and
pending samples are excluded from the confusion matrix because no final
prediction exists.

## Testing

Use the existing frontend `npm run test` command and add coverage for:

- Correct confusion-matrix counting.
- Failed and pending sample classification.
- Label distribution percentages.
- Empty sample handling.

Run the full project checks before PR:

```powershell
npm run test
npm run lint
npm run build
cd backend-java
mvn -B test
```

## Approval

The user requested continuing with the next planned branch. This design follows
the previously recommended `feature/evaluation-result-insights` scope and keeps
the project focused on interview-visible evaluation explainability.
