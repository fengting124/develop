package com.fengting.aigcforensics.dto.model;

import java.time.Instant;

public record ModelHealthResponse(
        String modelId,
        String endpointUrl,
        boolean healthy,
        String status,
        String message,
        Instant checkedAt) {
}
