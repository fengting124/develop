package com.fengting.aigcforensics.evaluation.service;

import com.fengting.aigcforensics.domain.ModelLabel;

public record EvaluationPredictionCase(
        ModelLabel groundTruthLabel,
        ModelLabel predictedLabel) {
}
