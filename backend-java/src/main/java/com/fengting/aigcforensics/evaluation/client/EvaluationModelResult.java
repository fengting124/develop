package com.fengting.aigcforensics.evaluation.client;

import com.fengting.aigcforensics.domain.ModelLabel;

public record EvaluationModelResult(
        ModelLabel predictedLabel,
        double score,
        int latencyMs) {
}

