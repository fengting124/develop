import assert from 'node:assert/strict';
import test from 'node:test';

import type { EvaluationSampleResponse, ModelLabel } from '@/api/backend';
import { buildEvaluationInsights } from './evaluationInsights.ts';

function sample(
  filename: string,
  groundTruthLabel: ModelLabel,
  predictedLabel: ModelLabel | null,
  correct: boolean | null,
  failureReason: string | null = null,
): EvaluationSampleResponse {
  return {
    sampleId: filename,
    evaluationId: 'eval-1',
    filename,
    groundTruthLabel,
    predictedLabel,
    score: predictedLabel ? 0.8 : null,
    latencyMs: predictedLabel ? 12 : null,
    correct,
    failureReason,
    createdAt: '2026-07-09T00:00:00Z',
  };
}

test('builds summary counts and confusion matrix from mixed samples', () => {
  const insights = buildEvaluationInsights([
    sample('a.jpg', 'AUTHENTIC', 'AUTHENTIC', true),
    sample('b.jpg', 'AUTHENTIC', 'SYNTHETIC', false),
    sample('c.jpg', 'SYNTHETIC', 'SYNTHETIC', true),
    sample('d.jpg', 'UNCERTAIN', null, null, 'model unavailable'),
    sample('e.jpg', 'SYNTHETIC', null, null),
  ]);

  assert.deepEqual(insights.summary, {
    total: 5,
    correct: 2,
    wrong: 1,
    failed: 1,
    pending: 1,
    completed: 3,
  });
  assert.equal(insights.matrix.AUTHENTIC.AUTHENTIC, 1);
  assert.equal(insights.matrix.AUTHENTIC.SYNTHETIC, 1);
  assert.equal(insights.matrix.SYNTHETIC.SYNTHETIC, 1);
  assert.equal(insights.matrix.UNCERTAIN.UNCERTAIN, 0);
});

test('builds label distribution percentages from ground-truth labels', () => {
  const insights = buildEvaluationInsights([
    sample('a.jpg', 'AUTHENTIC', 'AUTHENTIC', true),
    sample('b.jpg', 'AUTHENTIC', 'SYNTHETIC', false),
    sample('c.jpg', 'SYNTHETIC', 'SYNTHETIC', true),
    sample('d.jpg', 'UNCERTAIN', null, null, 'model unavailable'),
  ]);

  assert.deepEqual(
    insights.labelDistribution.map((row) => [row.label, row.count, row.ratio]),
    [
      ['AUTHENTIC', 2, 0.5],
      ['SYNTHETIC', 1, 0.25],
      ['UNCERTAIN', 1, 0.25],
    ],
  );
});

test('returns zeroed insights for empty samples', () => {
  const insights = buildEvaluationInsights([]);

  assert.deepEqual(insights.summary, {
    total: 0,
    correct: 0,
    wrong: 0,
    failed: 0,
    pending: 0,
    completed: 0,
  });
  assert.ok(insights.labelDistribution.every((row) => row.count === 0 && row.ratio === 0));
});
