package com.fengting.aigcforensics.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.file.Path;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.fengting.aigcforensics.client.ModelInferenceClient;
import com.fengting.aigcforensics.client.ModelInferenceException;
import com.fengting.aigcforensics.client.ModelInferenceRequest;
import com.fengting.aigcforensics.client.ModelInferenceResult;
import com.fengting.aigcforensics.domain.ModelLabel;

@ExtendWith(MockitoExtension.class)
class DetectionExecutionServiceTest {

    @Mock
    private DetectionExecutionTransactionService transactionService;
    @Mock
    private ModelInferenceClient modelInferenceClient;

    private DetectionExecutionService service;

    @BeforeEach
    void setUp() {
        service = new DetectionExecutionService(transactionService, modelInferenceClient);
    }

    @Test
    void executesClaimedPlanAndCommitsCollectedResults() {
        DetectionExecutionPlan plan = plan();
        when(transactionService.claim("task-1")).thenReturn(DetectionExecutionClaim.claimed(plan));
        when(modelInferenceClient.predict(eq("http://model:5010"), any()))
                .thenReturn(inferenceResult());
        when(transactionService.complete(eq("task-1"), eq("token-1"), any()))
                .thenReturn(DetectionExecutionOutcome.COMPLETED);

        DetectionExecutionOutcome outcome = service.runDetection("task-1");

        assertThat(outcome).isEqualTo(DetectionExecutionOutcome.COMPLETED);
        ArgumentCaptor<ModelInferenceRequest> request = ArgumentCaptor.forClass(ModelInferenceRequest.class);
        verify(modelInferenceClient).predict(eq("http://model:5010"), request.capture());
        assertThat(request.getValue().taskId()).isEqualTo("task-1");
        assertThat(request.getValue().imagePath()).isEqualTo(Path.of("uploads/image.png"));
        verify(transactionService).complete(eq("task-1"), eq("token-1"), any());
    }

    @Test
    void recordsFailureInSeparateTransactionWhenModelCallFails() {
        when(transactionService.claim("task-1")).thenReturn(DetectionExecutionClaim.claimed(plan()));
        when(modelInferenceClient.predict(eq("http://model:5010"), any()))
                .thenThrow(new ModelInferenceException("model unavailable"));
        when(transactionService.fail("task-1", "token-1", "model unavailable"))
                .thenReturn(DetectionExecutionOutcome.FAILED);

        DetectionExecutionOutcome outcome = service.runDetection("task-1");

        assertThat(outcome).isEqualTo(DetectionExecutionOutcome.FAILED);
        verify(transactionService).fail("task-1", "token-1", "model unavailable");
        verify(transactionService, never()).complete(any(), any(), any());
    }

    @Test
    void returnsBusyWithoutCallingModel() {
        when(transactionService.claim("task-1")).thenReturn(
                DetectionExecutionClaim.withoutPlan(DetectionExecutionClaimStatus.BUSY));

        DetectionExecutionOutcome outcome = service.runDetection("task-1");

        assertThat(outcome).isEqualTo(DetectionExecutionOutcome.BUSY);
        verify(modelInferenceClient, never()).predict(any(), any());
    }

    @Test
    void returnsTerminalWithoutCallingModel() {
        when(transactionService.claim("task-1")).thenReturn(
                DetectionExecutionClaim.withoutPlan(DetectionExecutionClaimStatus.TERMINAL));

        DetectionExecutionOutcome outcome = service.runDetection("task-1");

        assertThat(outcome).isEqualTo(DetectionExecutionOutcome.TERMINAL);
        verify(modelInferenceClient, never()).predict(any(), any());
    }

    private DetectionExecutionPlan plan() {
        return new DetectionExecutionPlan(
                "token-1",
                "task-1",
                "asset-1",
                Path.of("uploads/image.png"),
                List.of(new DetectionModelTarget("model-1", "http://model:5010", 0.5)));
    }

    private ModelInferenceResult inferenceResult() {
        return new ModelInferenceResult(
                "v1",
                0.9,
                0.9,
                ModelLabel.SYNTHETIC,
                20,
                "{\"score\":0.9}");
    }
}
