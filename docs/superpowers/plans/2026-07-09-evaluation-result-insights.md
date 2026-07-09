# Evaluation Result Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add lightweight evaluation explainability to `/admin/evaluations` without adding backend APIs or model weights.

**Architecture:** Compute insight summaries in a tested pure TypeScript utility, then render the result in the existing React evaluation page. Keep the UI within the current dark admin style and avoid chart dependencies.

**Tech Stack:** React 18, TypeScript, Vite, CSS Modules, Node built-in test runner.

## Global Constraints

- Preserve the current frontend visual style.
- Do not download model weights.
- Do not add a chart library.
- Do not add backend aggregation APIs in this branch.
- Keep counting logic outside JSX.
- Verify with `npm run test`, `npm run lint`, `npm run build`, `mvn -B test`, and `git diff --check`.

---

### Task 1: Insight Utility Tests

**Files:**
- Modify: `package.json`
- Create: `src/pages/AdminEvaluations/evaluationInsights.test.ts`

**Interfaces:**
- Consumes future `buildEvaluationInsights(samples: EvaluationSampleResponse[]): EvaluationInsights`.
- Produces expected behavior for matrix counts, summary counts, and label distribution.

- [ ] Update `package.json` test script to include frontend test files:

```json
"test": "node --test --experimental-strip-types src/api/errorMessage.test.ts src/pages/AdminEvaluations/evaluationInsights.test.ts"
```

- [ ] Add a failing test for a mixed sample set:

```typescript
const insights = buildEvaluationInsights([
  sample('a.jpg', 'AUTHENTIC', 'AUTHENTIC', true),
  sample('b.jpg', 'AUTHENTIC', 'SYNTHETIC', false),
  sample('c.jpg', 'SYNTHETIC', 'SYNTHETIC', true),
  sample('d.jpg', 'UNCERTAIN', null, null, 'model unavailable'),
  sample('e.jpg', 'SYNTHETIC', null, null),
]);
```

Expected summary:

```text
total=5, correct=2, wrong=1, failed=1, pending=1
```

- [ ] Run `npm run test`.

Expected: FAIL because `evaluationInsights.ts` does not exist yet.

### Task 2: Insight Utility Implementation

**Files:**
- Create: `src/pages/AdminEvaluations/evaluationInsights.ts`

**Interfaces:**
- Produces `LABELS`, `EvaluationInsightSummary`, `ConfusionMatrixRow`, `LabelDistributionRow`, `EvaluationInsights`, and `buildEvaluationInsights`.

- [ ] Implement fixed labels `AUTHENTIC`, `SYNTHETIC`, `UNCERTAIN`.
- [ ] Count only samples with a `predictedLabel` in the confusion matrix.
- [ ] Count `failureReason` samples as failed.
- [ ] Count samples without `predictedLabel` and without `failureReason` as pending.
- [ ] Calculate label-distribution percentages as `count / total`, using `0` when total is `0`.
- [ ] Run `npm run test`.

Expected: PASS.

### Task 3: Evaluation Page Rendering

**Files:**
- Modify: `src/pages/AdminEvaluations/index.tsx`
- Modify: `src/pages/AdminEvaluations/AdminEvaluations.module.css`

**Interfaces:**
- Consumes `buildEvaluationInsights(detail?.samples ?? [])`.
- Renders summary cards, confusion matrix, and label distribution.

- [ ] Import and memoize `buildEvaluationInsights`.
- [ ] Add a summary strip below metric cards.
- [ ] Add a confusion matrix with truth rows and prediction columns.
- [ ] Add a label distribution panel.
- [ ] Improve wrong-sample empty copy:

```text
All completed predictions match the manifest labels.
```

- [ ] Keep responsive behavior for narrow screens.
- [ ] Run `npm run build`.

Expected: PASS.

### Task 4: Worklog And Verification

**Files:**
- Modify: `docs/project-worklog.md`

**Interfaces:**
- Records the branch, scope, verification, and deferred work.

- [ ] Add a dated worklog entry for `feature/evaluation-result-insights`.
- [ ] Run `npm run test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run `mvn -B test` in `backend-java`.
- [ ] Run `git diff --check`.
- [ ] Commit as `feat: add evaluation result insights`.
- [ ] Push and open a PR against `main`.
