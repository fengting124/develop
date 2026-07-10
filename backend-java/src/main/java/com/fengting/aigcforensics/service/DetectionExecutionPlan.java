package com.fengting.aigcforensics.service;

import java.nio.file.Path;
import java.util.List;

public record DetectionExecutionPlan(
        String executionToken,
        String taskId,
        String assetId,
        Path assetPath,
        List<DetectionModelTarget> models) {

    public DetectionExecutionPlan {
        models = List.copyOf(models);
    }
}
