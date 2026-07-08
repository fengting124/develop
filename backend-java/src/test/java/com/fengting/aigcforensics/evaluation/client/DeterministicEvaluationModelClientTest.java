package com.fengting.aigcforensics.evaluation.client;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.fengting.aigcforensics.domain.ModelLabel;

class DeterministicEvaluationModelClientTest {

    @Test
    void returnsStablePredictionForSameModelAndFilename() {
        DeterministicEvaluationModelClient client = new DeterministicEvaluationModelClient();
        EvaluationModelRequest request = new EvaluationModelRequest(
                "eval_001",
                "sample_001",
                "nonescape-mini",
                "dataset/fake_001.jpg");

        EvaluationModelResult first = client.predict(request);
        EvaluationModelResult second = client.predict(request);

        assertThat(second).isEqualTo(first);
        assertThat(first.predictedLabel()).isIn(ModelLabel.AUTHENTIC, ModelLabel.SYNTHETIC);
        assertThat(first.score()).isBetween(0.0, 1.0);
        assertThat(first.latencyMs()).isGreaterThanOrEqualTo(0);
    }
}

