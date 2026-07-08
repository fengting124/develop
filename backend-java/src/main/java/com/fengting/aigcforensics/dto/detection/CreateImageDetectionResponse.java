package com.fengting.aigcforensics.dto.detection;

import com.fengting.aigcforensics.domain.DetectionStatus;

public record CreateImageDetectionResponse(
        String assetId,
        String taskId,
        DetectionStatus status,
        String filename,
        String contentType,
        long fileSize,
        String sha256,
        int width,
        int height) {
}
