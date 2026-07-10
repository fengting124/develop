package com.fengting.aigcforensics.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import com.fengting.aigcforensics.client.ModelInferenceClient;
import com.fengting.aigcforensics.client.ModelInferenceRequest;
import com.fengting.aigcforensics.client.ModelInferenceResult;

@Service
public class DetectionExecutionService {

    private static final int MAX_FAILURE_REASON_LENGTH = 2048;

    private final DetectionExecutionTransactionService transactionService;
    private final ModelInferenceClient modelInferenceClient;

    public DetectionExecutionService(
            DetectionExecutionTransactionService transactionService,
            ModelInferenceClient modelInferenceClient) {
        this.transactionService = transactionService;
        this.modelInferenceClient = modelInferenceClient;
    }

    public DetectionExecutionOutcome runDetection(String taskId) {
        DetectionExecutionClaim claim = transactionService.claim(taskId);
        if (claim.status() != DetectionExecutionClaimStatus.CLAIMED) {
            return toOutcome(claim.status());
        }

        DetectionExecutionPlan plan = claim.plan();
        List<DetectionModelResult> results = new ArrayList<>(plan.models().size());
        try {
            for (DetectionModelTarget model : plan.models()) {
                ModelInferenceResult inference = modelInferenceClient.predict(
                        model.endpointUrl(),
                        new ModelInferenceRequest(
                                plan.taskId(),
                                plan.assetId(),
                                plan.assetPath(),
                                model.threshold()));
                results.add(new DetectionModelResult(model, inference));
            }
        } catch (RuntimeException exception) {
            return transactionService.fail(
                    plan.taskId(),
                    plan.executionToken(),
                    failureReason(exception));
        }

        return transactionService.complete(
                plan.taskId(),
                plan.executionToken(),
                List.copyOf(results));
    }

    private DetectionExecutionOutcome toOutcome(DetectionExecutionClaimStatus status) {
        return switch (status) {
            case BUSY -> DetectionExecutionOutcome.BUSY;
            case TERMINAL -> DetectionExecutionOutcome.TERMINAL;
            case FAILED -> DetectionExecutionOutcome.FAILED;
            case CLAIMED -> throw new IllegalArgumentException("claimed status must include an execution plan");
        };
    }

    private String failureReason(RuntimeException exception) {
        String message = exception.getMessage();
        if (message == null || message.isBlank()) {
            message = exception.getClass().getSimpleName();
        }
        return message.length() <= MAX_FAILURE_REASON_LENGTH
                ? message
                : message.substring(0, MAX_FAILURE_REASON_LENGTH);
    }
}
