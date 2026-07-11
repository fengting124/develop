import assert from 'node:assert/strict';
import test from 'node:test';
import type { DetectionDetailResponse } from '@/api/backend';
import { buildReportPresentation } from './reportPresentation.ts';

function detail(overrides: Partial<DetectionDetailResponse> = {}): DetectionDetailResponse {
  return {
    taskId: 'task-1', assetId: 'asset-1', status: 'COMPLETED', failureReason: null,
    filename: 'evidence.png', contentType: 'image/png', fileSize: 100, sha256: 'a'.repeat(64),
    width: 100, height: 80, createdAt: '2026-07-11T00:00:00Z',
    startedAt: '2026-07-11T00:00:01Z', completedAt: '2026-07-11T00:00:02Z',
    predictions: [], report: null, ...overrides,
  };
}

test('does not fabricate a report when backend data is unavailable', () => {
  const presentation = buildReportPresentation(null);
  assert.equal(presentation.state, 'unavailable');
  assert.equal(presentation.confidence, null);
  assert.deepEqual(presentation.evidence, []);
  assert.deepEqual(presentation.timeline, []);
});

test('keeps completed tasks without predictions evidence-free', () => {
  assert.deepEqual(buildReportPresentation(detail()).evidence, []);
});

test('presents failed tasks without a confidence claim', () => {
  const presentation = buildReportPresentation(detail({ status: 'FAILED', failureReason: 'model timeout' }));
  assert.equal(presentation.state, 'failed');
  assert.equal(presentation.verdict, 'FAILED');
  assert.equal(presentation.confidence, null);
});

test('uses only persisted report confidence and prediction evidence', () => {
  const presentation = buildReportPresentation(detail({
    predictions: [{
      predictionId: 'prediction-1', modelId: 'nonescape-mini', modelVersion: 'v1', rawScore: 0.86,
      normalizedScore: 0.86, label: 'SYNTHETIC', threshold: 0.5, latencyMs: 42,
      createdAt: '2026-07-11T00:00:02Z',
    }],
    report: {
      reportId: 'report-1', verdict: 'LIKELY_SYNTHETIC', confidence: 0.86,
      summary: 'Persisted summary', riskLevel: 'HIGH', createdAt: '2026-07-11T00:00:02Z',
    },
  }));
  assert.equal(presentation.state, 'complete');
  assert.equal(presentation.confidence, 0.86);
  assert.equal(presentation.evidence.length, 1);
  assert.match(presentation.evidence[0].description, /nonescape-mini v1/);
});
