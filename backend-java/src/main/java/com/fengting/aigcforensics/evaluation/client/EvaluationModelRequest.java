package com.fengting.aigcforensics.evaluation.client;

public record EvaluationModelRequest(
        String evaluationId,
        String sampleId,
        String modelId,
        String filename) {
}

