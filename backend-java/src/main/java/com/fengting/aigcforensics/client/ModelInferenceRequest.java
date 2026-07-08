package com.fengting.aigcforensics.client;

import java.nio.file.Path;

public record ModelInferenceRequest(
        String taskId,
        String assetId,
        Path imagePath,
        double threshold) {
}
