package com.fengting.aigcforensics.dto.error;

import java.time.Instant;

public record ErrorResponse(
        String message,
        Instant timestamp) {
}
