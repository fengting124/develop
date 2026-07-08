package com.fengting.aigcforensics.evaluation.service;

import java.util.List;

import org.springframework.stereotype.Component;

import com.fengting.aigcforensics.domain.ModelLabel;

@Component
public class EvaluationMetricsCalculator {

    public EvaluationMetrics calculate(List<EvaluationPredictionCase> cases) {
        int truePositive = 0;
        int falsePositive = 0;
        int trueNegative = 0;
        int falseNegative = 0;

        for (EvaluationPredictionCase predictionCase : cases) {
            boolean actualSynthetic = predictionCase.groundTruthLabel() == ModelLabel.SYNTHETIC;
            boolean predictedSynthetic = predictionCase.predictedLabel() == ModelLabel.SYNTHETIC;
            if (actualSynthetic && predictedSynthetic) {
                truePositive++;
            } else if (!actualSynthetic && predictedSynthetic) {
                falsePositive++;
            } else if (!actualSynthetic) {
                trueNegative++;
            } else {
                falseNegative++;
            }
        }

        int total = cases.size();
        double accuracy = ratio(truePositive + trueNegative, total);
        double precision = ratio(truePositive, truePositive + falsePositive);
        double recall = ratio(truePositive, truePositive + falseNegative);
        double f1 = precision + recall == 0 ? 0 : 2 * precision * recall / (precision + recall);
        return new EvaluationMetrics(
                total,
                truePositive,
                falsePositive,
                trueNegative,
                falseNegative,
                accuracy,
                precision,
                recall,
                f1);
    }

    private double ratio(int numerator, int denominator) {
        if (denominator == 0) {
            return 0;
        }
        return (double) numerator / denominator;
    }
}
