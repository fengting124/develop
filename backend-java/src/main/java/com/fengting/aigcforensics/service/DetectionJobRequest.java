package com.fengting.aigcforensics.service;

import java.time.Instant;

public record DetectionJobRequest(
        String eventId,
        int eventVersion,
        String taskId,
        Instant occurredAt) {

    public DetectionJobRequest {
        if (eventId == null || eventId.isBlank()) {
            throw new IllegalArgumentException("eventId must not be blank");
        }
        if (eventVersion < 1) {
            throw new IllegalArgumentException("eventVersion must be at least 1");
        }
        if (taskId == null || taskId.isBlank()) {
            throw new IllegalArgumentException("taskId must not be blank");
        }
        if (occurredAt == null) {
            throw new IllegalArgumentException("occurredAt must not be null");
        }
    }
}
