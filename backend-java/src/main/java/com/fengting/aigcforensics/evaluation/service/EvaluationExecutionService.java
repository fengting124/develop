package com.fengting.aigcforensics.evaluation.service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fengting.aigcforensics.evaluation.client.EvaluationModelClient;
import com.fengting.aigcforensics.evaluation.client.EvaluationModelRequest;
import com.fengting.aigcforensics.evaluation.client.EvaluationModelResult;
import com.fengting.aigcforensics.evaluation.domain.EvaluationRun;
import com.fengting.aigcforensics.evaluation.domain.EvaluationSample;
import com.fengting.aigcforensics.evaluation.domain.EvaluationStatus;
import com.fengting.aigcforensics.evaluation.dto.EvaluationDetailResponse;
import com.fengting.aigcforensics.evaluation.dto.EvaluationSampleResponse;
import com.fengting.aigcforensics.evaluation.repository.EvaluationRunRepository;
import com.fengting.aigcforensics.evaluation.repository.EvaluationSampleRepository;
import com.fengting.aigcforensics.service.ResourceNotFoundException;

@Service
public class EvaluationExecutionService {

    private final EvaluationRunRepository evaluationRunRepository;
    private final EvaluationSampleRepository evaluationSampleRepository;
    private final EvaluationMetricsCalculator metricsCalculator;
    private final EvaluationModelClient modelClient;
    private final Clock clock;

    @Autowired
    public EvaluationExecutionService(
            EvaluationRunRepository evaluationRunRepository,
            EvaluationSampleRepository evaluationSampleRepository,
            EvaluationMetricsCalculator metricsCalculator,
            EvaluationModelClient modelClient) {
        this(
                evaluationRunRepository,
                evaluationSampleRepository,
                metricsCalculator,
                modelClient,
                Clock.systemUTC());
    }

    EvaluationExecutionService(
            EvaluationRunRepository evaluationRunRepository,
            EvaluationSampleRepository evaluationSampleRepository,
            EvaluationMetricsCalculator metricsCalculator,
            EvaluationModelClient modelClient,
            Clock clock) {
        this.evaluationRunRepository = evaluationRunRepository;
        this.evaluationSampleRepository = evaluationSampleRepository;
        this.metricsCalculator = metricsCalculator;
        this.modelClient = modelClient;
        this.clock = clock;
    }

    @Transactional
    public EvaluationDetailResponse runEvaluation(String evaluationId) {
        EvaluationRun run = findRun(evaluationId);
        List<EvaluationSample> samples = evaluationSampleRepository.findByEvaluationIdOrderByCreatedAtAsc(evaluationId);
        if (run.getStatus() == EvaluationStatus.COMPLETED) {
            return toDetailResponse(run, samples);
        }
        if (run.getStatus() == EvaluationStatus.FAILED && !run.canRetry()) {
            throw new IllegalStateException("Evaluation retry attempts exhausted: " + evaluationId);
        }

        run.markStarted(Instant.now(clock));
        for (EvaluationSample sample : samples) {
            if (sample.getPredictedLabel() != null) {
                continue;
            }
            try {
                EvaluationModelResult result = modelClient.predict(new EvaluationModelRequest(
                        run.getEvaluationId(),
                        sample.getSampleId(),
                        run.getModelId(),
                        sample.getFilename()));
                sample.markPredicted(result.predictedLabel(), result.score(), result.latencyMs());
            } catch (RuntimeException exception) {
                String failureReason = failureMessage(exception);
                sample.markFailed(failureReason);
                run.markFailed(failureReason, countCompleted(samples), Instant.now(clock));
                evaluationSampleRepository.saveAll(samples);
                evaluationRunRepository.save(run);
                return toDetailResponse(run, samples);
            }
        }

        EvaluationMetrics metrics = metricsCalculator.calculate(samples.stream()
                .map(sample -> new EvaluationPredictionCase(sample.getGroundTruthLabel(), sample.getPredictedLabel()))
                .toList());
        run.markCompleted(
                samples.size(),
                metrics.accuracy(),
                metrics.precision(),
                metrics.recall(),
                metrics.f1(),
                Instant.now(clock));
        evaluationSampleRepository.saveAll(samples);
        evaluationRunRepository.save(run);
        return toDetailResponse(run, samples);
    }

    private int countCompleted(List<EvaluationSample> samples) {
        return (int) samples.stream().filter(sample -> sample.getPredictedLabel() != null).count();
    }

    private String failureMessage(RuntimeException exception) {
        if (exception.getMessage() == null || exception.getMessage().isBlank()) {
            return exception.getClass().getSimpleName();
        }
        return exception.getMessage();
    }

    private EvaluationRun findRun(String evaluationId) {
        return evaluationRunRepository.findByEvaluationId(evaluationId)
                .orElseThrow(() -> new ResourceNotFoundException("Evaluation not found: " + evaluationId));
    }

    private EvaluationDetailResponse toDetailResponse(EvaluationRun run, List<EvaluationSample> samples) {
        return new EvaluationDetailResponse(
                run.getEvaluationId(),
                run.getName(),
                run.getDatasetName(),
                run.getModelId(),
                run.getStatus(),
                run.getTotalSamples(),
                run.getCompletedSamples(),
                run.getAccuracy(),
                run.getPrecision(),
                run.getRecall(),
                run.getF1(),
                run.getAttemptCount(),
                run.getMaxAttempts(),
                run.getCreatedAt(),
                run.getStartedAt(),
                run.getCompletedAt(),
                run.getFailureReason(),
                samples.stream().map(this::toSampleResponse).toList());
    }

    private EvaluationSampleResponse toSampleResponse(EvaluationSample sample) {
        return new EvaluationSampleResponse(
                sample.getSampleId(),
                sample.getEvaluationId(),
                sample.getFilename(),
                sample.getGroundTruthLabel(),
                sample.getPredictedLabel(),
                sample.getScore(),
                sample.getLatencyMs(),
                sample.getCorrect(),
                sample.getFailureReason(),
                sample.getCreatedAt());
    }
}
