import type { DetectionDetailResponse } from '../../api/backend.ts';

export interface ReportEvidence {
  code: string;
  name: string;
  description: string;
}

export interface ReportTimelineEntry {
  timestamp: string;
  event: string;
  note: string;
}

export interface ReportPresentation {
  state: 'unavailable' | 'pending' | 'failed' | 'complete';
  verdict: 'LIKELY_AUTHENTIC' | 'LIKELY_SYNTHETIC' | 'UNCERTAIN' | 'FAILED' | null;
  confidence: number | null;
  summary: string | null;
  evidence: ReportEvidence[];
  timeline: ReportTimelineEntry[];
}

export function buildReportPresentation(detail: DetectionDetailResponse | null): ReportPresentation {
  if (!detail) {
    return { state: 'unavailable', verdict: null, confidence: null, summary: null, evidence: [], timeline: [] };
  }

  const timeline: ReportTimelineEntry[] = [
    { timestamp: detail.createdAt, event: 'Task created', note: detail.filename },
  ];
  if (detail.startedAt) timeline.push({ timestamp: detail.startedAt, event: 'Inference started', note: detail.status });
  if (detail.completedAt) {
    timeline.push({
      timestamp: detail.completedAt,
      event: detail.status === 'FAILED' ? 'Task failed' : 'Task completed',
      note: detail.failureReason ?? detail.report?.riskLevel ?? '',
    });
  }

  if (detail.status === 'FAILED') {
    return {
      state: 'failed', verdict: 'FAILED', confidence: null,
      summary: detail.failureReason, evidence: [], timeline,
    };
  }

  const evidence = detail.predictions.map((prediction, index) => ({
    code: `M-${String(index + 1).padStart(2, '0')}`,
    name: prediction.modelId,
    description: `${prediction.modelId} ${prediction.modelVersion} returned ${prediction.label} with score ${prediction.normalizedScore.toFixed(4)}, threshold ${prediction.threshold.toFixed(2)}, latency ${prediction.latencyMs}ms.`,
  }));

  if (!detail.report) {
    return { state: 'pending', verdict: null, confidence: null, summary: null, evidence, timeline };
  }

  return {
    state: 'complete', verdict: detail.report.verdict, confidence: detail.report.confidence,
    summary: detail.report.summary, evidence, timeline,
  };
}
