import type { EvaluationSampleResponse, ModelLabel } from '@/api/backend';

export const LABELS = ['AUTHENTIC', 'SYNTHETIC', 'UNCERTAIN'] as const satisfies readonly ModelLabel[];

export type ConfusionMatrix = Record<ModelLabel, Record<ModelLabel, number>>;

export interface EvaluationInsightSummary {
  total: number;
  correct: number;
  wrong: number;
  failed: number;
  pending: number;
  completed: number;
}

export interface LabelDistributionRow {
  label: ModelLabel;
  count: number;
  ratio: number;
}

export interface EvaluationInsights {
  summary: EvaluationInsightSummary;
  matrix: ConfusionMatrix;
  labelDistribution: LabelDistributionRow[];
}

function createMatrix(): ConfusionMatrix {
  return LABELS.reduce((matrix, truthLabel) => {
    matrix[truthLabel] = LABELS.reduce(
      (row, predictedLabel) => {
        row[predictedLabel] = 0;
        return row;
      },
      {} as Record<ModelLabel, number>,
    );
    return matrix;
  }, {} as ConfusionMatrix);
}

export function buildEvaluationInsights(samples: EvaluationSampleResponse[]): EvaluationInsights {
  const matrix = createMatrix();
  const distributionCounts = LABELS.reduce(
    (counts, label) => {
      counts[label] = 0;
      return counts;
    },
    {} as Record<ModelLabel, number>,
  );
  const summary: EvaluationInsightSummary = {
    total: samples.length,
    correct: 0,
    wrong: 0,
    failed: 0,
    pending: 0,
    completed: 0,
  };

  for (const sample of samples) {
    distributionCounts[sample.groundTruthLabel] += 1;

    if (sample.failureReason) {
      summary.failed += 1;
      continue;
    }

    if (!sample.predictedLabel) {
      summary.pending += 1;
      continue;
    }

    summary.completed += 1;
    matrix[sample.groundTruthLabel][sample.predictedLabel] += 1;

    if (sample.correct) {
      summary.correct += 1;
    } else {
      summary.wrong += 1;
    }
  }

  return {
    summary,
    matrix,
    labelDistribution: LABELS.map((label) => ({
      label,
      count: distributionCounts[label],
      ratio: summary.total === 0 ? 0 : distributionCounts[label] / summary.total,
    })),
  };
}
