package com.fengting.aigcforensics.evaluation.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.fengting.aigcforensics.domain.ModelLabel;
import com.fengting.aigcforensics.evaluation.client.EvaluationModelClient;
import com.fengting.aigcforensics.evaluation.client.EvaluationModelResult;
import com.fengting.aigcforensics.evaluation.domain.EvaluationRun;
import com.fengting.aigcforensics.evaluation.domain.EvaluationSample;
import com.fengting.aigcforensics.evaluation.domain.EvaluationStatus;
import com.fengting.aigcforensics.evaluation.dto.EvaluationDetailResponse;
import com.fengting.aigcforensics.evaluation.repository.EvaluationRunRepository;
import com.fengting.aigcforensics.evaluation.repository.EvaluationSampleRepository;

@ExtendWith(MockitoExtension.class)
class EvaluationExecutionServiceTest {

    private static final Instant NOW = Instant.parse("2026-07-08T00:00:00Z");

    @Mock
    private EvaluationRunRepository evaluationRunRepository;

    @Mock
    private EvaluationSampleRepository evaluationSampleRepository;

    @Test
    void runsQueuedEvaluationAndPersistsPredictionsAndMetrics() {
        EvaluationRun run = queuedRun();
        List<EvaluationSample> samples = List.of(
                sample("sample_001", "real_001.jpg", ModelLabel.AUTHENTIC),
                sample("sample_002", "fake_001.jpg", ModelLabel.SYNTHETIC));
        when(evaluationRunRepository.findByEvaluationId("eval_001")).thenReturn(Optional.of(run));
        when(evaluationSampleRepository.findByEvaluationIdOrderByCreatedAtAsc("eval_001")).thenReturn(samples);
        EvaluationModelClient modelClient = request -> request.filename().startsWith("fake")
                ? new EvaluationModelResult(ModelLabel.SYNTHETIC, 0.91, 42)
                : new EvaluationModelResult(ModelLabel.AUTHENTIC, 0.12, 31);
        EvaluationExecutionService service = service(modelClient);

        EvaluationDetailResponse response = service.runEvaluation("eval_001");

        assertThat(response.status()).isEqualTo(EvaluationStatus.COMPLETED);
        assertThat(response.completedSamples()).isEqualTo(2);
        assertThat(response.attemptCount()).isEqualTo(1);
        assertThat(response.accuracy()).isEqualTo(1.0);
        assertThat(response.precision()).isEqualTo(1.0);
        assertThat(response.recall()).isEqualTo(1.0);
        assertThat(response.samples())
                .extracting(sample -> sample.predictedLabel())
                .containsExactly(ModelLabel.AUTHENTIC, ModelLabel.SYNTHETIC);
        verify(evaluationRunRepository).save(run);
        verify(evaluationSampleRepository).saveAll(samples);
    }

    @Test
    void marksEvaluationFailedWhenPredictionFails() {
        EvaluationRun run = queuedRun();
        List<EvaluationSample> samples = List.of(
                sample("sample_001", "real_001.jpg", ModelLabel.AUTHENTIC),
                sample("sample_002", "fake_001.jpg", ModelLabel.SYNTHETIC));
        when(evaluationRunRepository.findByEvaluationId("eval_001")).thenReturn(Optional.of(run));
        when(evaluationSampleRepository.findByEvaluationIdOrderByCreatedAtAsc("eval_001")).thenReturn(samples);
        EvaluationModelClient modelClient = request -> {
            if (request.filename().startsWith("fake")) {
                throw new IllegalStateException("model service unavailable");
            }
            return new EvaluationModelResult(ModelLabel.AUTHENTIC, 0.12, 31);
        };

        EvaluationDetailResponse response = service(modelClient).runEvaluation("eval_001");

        assertThat(response.status()).isEqualTo(EvaluationStatus.FAILED);
        assertThat(response.completedSamples()).isEqualTo(1);
        assertThat(response.attemptCount()).isEqualTo(1);
        assertThat(response.failureReason()).isEqualTo("model service unavailable");
        assertThat(response.samples().get(0).predictedLabel()).isEqualTo(ModelLabel.AUTHENTIC);
        assertThat(response.samples().get(1).failureReason()).isEqualTo("model service unavailable");
        verify(evaluationRunRepository).save(run);
        verify(evaluationSampleRepository).saveAll(samples);
    }

    @Test
    void retriesFailedEvaluationAndCompletesRemainingSamples() {
        EvaluationRun run = queuedRun();
        List<EvaluationSample> samples = List.of(
                sample("sample_001", "real_001.jpg", ModelLabel.AUTHENTIC),
                sample("sample_002", "fake_001.jpg", ModelLabel.SYNTHETIC));
        when(evaluationRunRepository.findByEvaluationId("eval_001")).thenReturn(Optional.of(run));
        when(evaluationSampleRepository.findByEvaluationIdOrderByCreatedAtAsc("eval_001")).thenReturn(samples);
        RetryOnceModelClient modelClient = new RetryOnceModelClient();
        EvaluationExecutionService service = service(modelClient);

        EvaluationDetailResponse failed = service.runEvaluation("eval_001");
        EvaluationDetailResponse completed = service.runEvaluation("eval_001");

        assertThat(failed.status()).isEqualTo(EvaluationStatus.FAILED);
        assertThat(completed.status()).isEqualTo(EvaluationStatus.COMPLETED);
        assertThat(completed.attemptCount()).isEqualTo(2);
        assertThat(completed.completedSamples()).isEqualTo(2);
        assertThat(completed.failureReason()).isNull();
        assertThat(completed.samples())
                .extracting(sample -> sample.failureReason())
                .containsExactly(null, null);
        assertThat(modelClient.callCount()).isEqualTo(3);
    }

    private EvaluationExecutionService service(EvaluationModelClient modelClient) {
        return new EvaluationExecutionService(
                evaluationRunRepository,
                evaluationSampleRepository,
                new EvaluationMetricsCalculator(),
                modelClient,
                Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private EvaluationRun queuedRun() {
        return new EvaluationRun(
                "eval_001",
                "Smoke Dataset",
                "sample-v1",
                "nonescape-mini",
                EvaluationStatus.QUEUED,
                2,
                0,
                null,
                null,
                null,
                null,
                0,
                3,
                NOW,
                null,
                null,
                null);
    }

    private EvaluationSample sample(String sampleId, String filename, ModelLabel groundTruth) {
        return new EvaluationSample(
                sampleId,
                "eval_001",
                filename,
                groundTruth,
                null,
                null,
                null,
                null,
                null,
                NOW);
    }

    private static final class RetryOnceModelClient implements EvaluationModelClient {
        private int callCount;
        private boolean failedFakeOnce;

        @Override
        public EvaluationModelResult predict(com.fengting.aigcforensics.evaluation.client.EvaluationModelRequest request) {
            callCount++;
            if (request.filename().startsWith("fake") && !failedFakeOnce) {
                failedFakeOnce = true;
                throw new IllegalStateException("temporary model error");
            }
            if (request.filename().startsWith("fake")) {
                return new EvaluationModelResult(ModelLabel.SYNTHETIC, 0.91, 42);
            }
            return new EvaluationModelResult(ModelLabel.AUTHENTIC, 0.12, 31);
        }

        int callCount() {
            return callCount;
        }
    }
}
