package com.fengting.aigcforensics.dto.detection;

import java.time.Instant;

import com.fengting.aigcforensics.domain.ModelLabel;

public record DetectionPredictionResponse(
        String predictionId,
        String modelId,
        String modelVersion,
        double rawScore,
        double normalizedScore,
        ModelLabel label,
        double threshold,
        int latencyMs,
        Instant createdAt) {
}
