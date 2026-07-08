package com.fengting.aigcforensics.dto.detection;

import java.time.Instant;

import com.fengting.aigcforensics.domain.DetectionStatus;

public record DetectionHistoryItemResponse(
        String taskId,
        String assetId,
        DetectionStatus status,
        String failureReason,
        String filename,
        String contentType,
        long fileSize,
        String sha256,
        int width,
        int height,
        Instant createdAt,
        Instant startedAt,
        Instant completedAt,
        DetectionReportResponse report) {
}
