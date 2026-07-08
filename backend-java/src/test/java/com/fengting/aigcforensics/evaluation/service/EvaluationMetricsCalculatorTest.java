package com.fengting.aigcforensics.evaluation.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.fengting.aigcforensics.domain.ModelLabel;

class EvaluationMetricsCalculatorTest {

    private final EvaluationMetricsCalculator calculator = new EvaluationMetricsCalculator();

    @Test
    void calculatesBinarySyntheticDetectionMetrics() {
        EvaluationMetrics metrics = calculator.calculate(List.of(
                new EvaluationPredictionCase(ModelLabel.SYNTHETIC, ModelLabel.SYNTHETIC),
                new EvaluationPredictionCase(ModelLabel.SYNTHETIC, ModelLabel.AUTHENTIC),
                new EvaluationPredictionCase(ModelLabel.AUTHENTIC, ModelLabel.SYNTHETIC),
                new EvaluationPredictionCase(ModelLabel.AUTHENTIC, ModelLabel.AUTHENTIC)));

        assertThat(metrics.totalCount()).isEqualTo(4);
        assertThat(metrics.truePositiveCount()).isEqualTo(1);
        assertThat(metrics.falseNegativeCount()).isEqualTo(1);
        assertThat(metrics.falsePositiveCount()).isEqualTo(1);
        assertThat(metrics.trueNegativeCount()).isEqualTo(1);
        assertThat(metrics.accuracy()).isEqualTo(0.5);
        assertThat(metrics.precision()).isEqualTo(0.5);
        assertThat(metrics.recall()).isEqualTo(0.5);
        assertThat(metrics.f1()).isEqualTo(0.5);
    }

    @Test
    void returnsZeroMetricsForEmptyInput() {
        EvaluationMetrics metrics = calculator.calculate(List.of());

        assertThat(metrics.totalCount()).isZero();
        assertThat(metrics.accuracy()).isZero();
        assertThat(metrics.precision()).isZero();
        assertThat(metrics.recall()).isZero();
        assertThat(metrics.f1()).isZero();
    }
}
