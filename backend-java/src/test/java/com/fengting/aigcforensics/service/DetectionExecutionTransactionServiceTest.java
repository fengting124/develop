package com.fengting.aigcforensics.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.fengting.aigcforensics.client.ModelInferenceResult;
import com.fengting.aigcforensics.domain.DetectionReport;
import com.fengting.aigcforensics.domain.DetectionStatus;
import com.fengting.aigcforensics.domain.DetectionTask;
import com.fengting.aigcforensics.domain.MediaAsset;
import com.fengting.aigcforensics.domain.ModelLabel;
import com.fengting.aigcforensics.domain.ModelPrediction;
import com.fengting.aigcforensics.domain.ModelRegistry;
import com.fengting.aigcforensics.repository.DetectionReportRepository;
import com.fengting.aigcforensics.repository.DetectionTaskRepository;
import com.fengting.aigcforensics.repository.MediaAssetRepository;
import com.fengting.aigcforensics.repository.ModelPredictionRepository;
import com.fengting.aigcforensics.repository.ModelRegistryRepository;

@ExtendWith(MockitoExtension.class)
class DetectionExecutionTransactionServiceTest {

    private static final Instant NOW = Instant.parse("2026-07-11T00:00:00Z");

    @Mock
    private DetectionTaskRepository taskRepository;
    @Mock
    private MediaAssetRepository assetRepository;
    @Mock
    private ModelRegistryRepository modelRepository;
    @Mock
    private ModelPredictionRepository predictionRepository;
    @Mock
    private DetectionReportRepository reportRepository;

    private DetectionExecutionTransactionService service;

    @BeforeEach
    void setUp() {
        service = new DetectionExecutionTransactionService(
                taskRepository,
                assetRepository,
                modelRepository,
                predictionRepository,
                reportRepository,
                Duration.ofMinutes(5),
                Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void claimsTaskAndReturnsDetachedExecutionPlan() {
        DetectionTask task = queuedTask();
        when(taskRepository.findByTaskIdForUpdate("task-1")).thenReturn(Optional.of(task));
        when(assetRepository.findByAssetId("asset-1")).thenReturn(Optional.of(asset()));
        when(modelRepository.findByEnabledTrueOrderByWeightDesc()).thenReturn(List.of(model()));

        DetectionExecutionClaim claim = service.claim("task-1");

        assertThat(claim.status()).isEqualTo(DetectionExecutionClaimStatus.CLAIMED);
        assertThat(claim.plan()).isNotNull();
        assertThat(claim.plan().executionToken()).isNotBlank();
        assertThat(claim.plan().assetPath()).isEqualTo(Path.of("uploads/image.png"));
        assertThat(claim.plan().models())
                .extracting(DetectionModelTarget::modelId)
                .containsExactly("model-1");
        assertThat(task.getExecutionLeaseUntil()).isEqualTo(NOW.plus(Duration.ofMinutes(5)));
    }

    @Test
    void returnsBusyWithoutLoadingExecutionInputsForLiveLease() {
        DetectionTask task = queuedTask();
        task.claimExecution("active", NOW.minusSeconds(10), NOW.plusSeconds(30));
        when(taskRepository.findByTaskIdForUpdate("task-1")).thenReturn(Optional.of(task));

        DetectionExecutionClaim claim = service.claim("task-1");

        assertThat(claim.status()).isEqualTo(DetectionExecutionClaimStatus.BUSY);
        verify(assetRepository, never()).findByAssetId(any());
        verify(modelRepository, never()).findByEnabledTrueOrderByWeightDesc();
    }

    @Test
    void marksClaimFailedWhenNoEnabledModelExists() {
        DetectionTask task = queuedTask();
        when(taskRepository.findByTaskIdForUpdate("task-1")).thenReturn(Optional.of(task));
        when(assetRepository.findByAssetId("asset-1")).thenReturn(Optional.of(asset()));
        when(modelRepository.findByEnabledTrueOrderByWeightDesc()).thenReturn(List.of());

        DetectionExecutionClaim claim = service.claim("task-1");

        assertThat(claim.status()).isEqualTo(DetectionExecutionClaimStatus.FAILED);
        assertThat(task.getStatus()).isEqualTo(DetectionStatus.FAILED);
        assertThat(task.getFailureReason()).isEqualTo("No enabled model is available");
    }

    @Test
    void staleCompletionDoesNotPersistResults() {
        DetectionTask task = queuedTask();
        task.claimExecution("new-token", NOW, NOW.plusSeconds(60));
        when(taskRepository.findByTaskIdForUpdate("task-1")).thenReturn(Optional.of(task));

        DetectionExecutionOutcome outcome = service.complete(
                "task-1",
                "old-token",
                List.of(result()));

        assertThat(outcome).isEqualTo(DetectionExecutionOutcome.STALE);
        verify(predictionRepository, never()).saveAll(any());
        verify(reportRepository, never()).save(any());
        assertThat(task.getStatus()).isEqualTo(DetectionStatus.INFERENCING);
    }

    @Test
    void staleFailureDoesNotChangeNewerExecution() {
        DetectionTask task = queuedTask();
        task.claimExecution("new-token", NOW, NOW.plusSeconds(60));
        when(taskRepository.findByTaskIdForUpdate("task-1")).thenReturn(Optional.of(task));

        DetectionExecutionOutcome outcome = service.fail(
                "task-1",
                "old-token",
                "late model failure");

        assertThat(outcome).isEqualTo(DetectionExecutionOutcome.STALE);
        assertThat(task.getStatus()).isEqualTo(DetectionStatus.INFERENCING);
        assertThat(task.getFailureReason()).isNull();
        assertThat(task.getExecutionToken()).isEqualTo("new-token");
    }

    @Test
    void matchingCompletionPersistsPredictionsAndReportAtomically() {
        DetectionTask task = queuedTask();
        task.claimExecution("token-1", NOW, NOW.plusSeconds(60));
        when(taskRepository.findByTaskIdForUpdate("task-1")).thenReturn(Optional.of(task));

        DetectionExecutionOutcome outcome = service.complete(
                "task-1",
                "token-1",
                List.of(result()));

        assertThat(outcome).isEqualTo(DetectionExecutionOutcome.COMPLETED);
        ArgumentCaptor<List<ModelPrediction>> predictions = ArgumentCaptor.forClass(List.class);
        verify(predictionRepository).saveAll(predictions.capture());
        assertThat(predictions.getValue()).hasSize(1);
        ArgumentCaptor<DetectionReport> report = ArgumentCaptor.forClass(DetectionReport.class);
        verify(reportRepository).save(report.capture());
        assertThat(report.getValue().getTaskId()).isEqualTo("task-1");
        assertThat(task.getStatus()).isEqualTo(DetectionStatus.COMPLETED);
    }

    private DetectionTask queuedTask() {
        return new DetectionTask("task-1", "asset-1", DetectionStatus.QUEUED, NOW.minusSeconds(60));
    }

    private MediaAsset asset() {
        return new MediaAsset(
                "asset-1",
                "image.png",
                "image/png",
                100,
                "a".repeat(64),
                100,
                100,
                "uploads/image.png",
                null,
                NOW.minusSeconds(60));
    }

    private ModelRegistry model() {
        return new ModelRegistry(
                "model-1",
                "Model 1",
                "IMAGE_FORENSICS",
                "v1",
                "http://model:5010",
                true,
                0.5,
                1.0,
                "test model",
                NOW,
                NOW);
    }

    private DetectionModelResult result() {
        return new DetectionModelResult(
                new DetectionModelTarget("model-1", "http://model:5010", 0.5),
                new ModelInferenceResult(
                        "v1",
                        0.9,
                        0.9,
                        ModelLabel.SYNTHETIC,
                        25,
                        "{\"score\":0.9}"));
    }
}
