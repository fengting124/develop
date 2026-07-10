package com.fengting.aigcforensics.service;

public record DetectionModelTarget(
        String modelId,
        String endpointUrl,
        double threshold) {
}
