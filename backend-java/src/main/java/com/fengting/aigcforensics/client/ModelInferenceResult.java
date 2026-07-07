package com.fengting.aigcforensics.client;

import com.fengting.aigcforensics.domain.ModelLabel;

public record ModelInferenceResult(
        String modelVersion,
        double rawScore,
        double normalizedScore,
        ModelLabel label,
        int latencyMs,
        String rawResponseJson) {
}
