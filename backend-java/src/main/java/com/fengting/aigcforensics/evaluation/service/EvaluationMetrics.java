package com.fengting.aigcforensics.evaluation.service;

public record EvaluationMetrics(
        int totalCount,
        int truePositiveCount,
        int falsePositiveCount,
        int trueNegativeCount,
        int falseNegativeCount,
        double accuracy,
        double precision,
        double recall,
        double f1) {
}
