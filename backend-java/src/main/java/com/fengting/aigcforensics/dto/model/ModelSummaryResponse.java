package com.fengting.aigcforensics.dto.model;

public record ModelSummaryResponse(
        String modelId,
        String displayName,
        String modelType,
        String version,
        String endpointUrl,
        boolean enabled,
        double defaultThreshold,
        double weight,
        String description) {
}
