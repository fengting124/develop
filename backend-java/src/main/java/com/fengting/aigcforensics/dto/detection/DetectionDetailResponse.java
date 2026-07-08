package com.fengting.aigcforensics.dto.detection;

import java.time.Instant;
import java.util.List;

import com.fengting.aigcforensics.domain.DetectionStatus;

public record DetectionDetailResponse(
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
        List<DetectionPredictionResponse> predictions,
        DetectionReportResponse report) {
}
