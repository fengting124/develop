package com.fengting.aigcforensics.evaluation.dto;

import java.time.Instant;
import java.util.List;

import com.fengting.aigcforensics.evaluation.domain.EvaluationStatus;

public record EvaluationDetailResponse(
        String evaluationId,
        String name,
        String datasetName,
        String modelId,
        EvaluationStatus status,
        int totalSamples,
        int completedSamples,
        Double accuracy,
        Double precision,
        Double recall,
        Double f1,
        int attemptCount,
        int maxAttempts,
        Instant createdAt,
        Instant startedAt,
        Instant completedAt,
        String failureReason,
        List<EvaluationSampleResponse> samples) {
}
