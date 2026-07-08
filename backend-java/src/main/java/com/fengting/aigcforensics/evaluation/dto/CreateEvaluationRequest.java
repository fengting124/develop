package com.fengting.aigcforensics.evaluation.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateEvaluationRequest(
        @NotBlank String name,
        @NotBlank String datasetName,
        @NotBlank String modelId,
        @NotBlank String manifest) {
}
