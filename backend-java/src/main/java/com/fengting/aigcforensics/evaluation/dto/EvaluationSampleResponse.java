package com.fengting.aigcforensics.evaluation.dto;

import java.time.Instant;

import com.fengting.aigcforensics.domain.ModelLabel;

public record EvaluationSampleResponse(
        String sampleId,
        String evaluationId,
        String filename,
        ModelLabel groundTruthLabel,
        ModelLabel predictedLabel,
        Double score,
        Integer latencyMs,
        Boolean correct,
        String failureReason,
        Instant createdAt) {
}
