package com.fengting.aigcforensics.dto.operations;

import java.time.Instant;

import com.fengting.aigcforensics.domain.JobOutboxEventType;
import com.fengting.aigcforensics.domain.JobOutboxStatus;

public record JobOutboxEventResponse(
        String eventId,
        JobOutboxEventType eventType,
        String aggregateType,
        String aggregateId,
        JobOutboxStatus status,
        int attemptCount,
        Instant availableAt,
        String lastError,
        Instant createdAt,
        Instant updatedAt,
        Instant publishedAt) {
}
