package com.fengting.aigcforensics.service;

import com.fengting.aigcforensics.client.ModelInferenceResult;

public record DetectionModelResult(
        DetectionModelTarget target,
        ModelInferenceResult inference) {
}
