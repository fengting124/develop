package com.fengting.aigcforensics.service;

import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fengting.aigcforensics.domain.DetectionReport;
import com.fengting.aigcforensics.domain.DetectionStatus;
import com.fengting.aigcforensics.domain.DetectionTask;
import com.fengting.aigcforensics.domain.MediaAsset;
import com.fengting.aigcforensics.domain.ModelLabel;
import com.fengting.aigcforensics.domain.ModelPrediction;
import com.fengting.aigcforensics.domain.ModelRegistry;
import com.fengting.aigcforensics.domain.ReportVerdict;
import com.fengting.aigcforensics.domain.RiskLevel;
import com.fengting.aigcforensics.repository.DetectionReportRepository;
import com.fengting.aigcforensics.repository.DetectionTaskRepository;
import com.fengting.aigcforensics.repository.MediaAssetRepository;
import com.fengting.aigcforensics.repository.ModelPredictionRepository;
import com.fengting.aigcforensics.repository.ModelRegistryRepository;

@Service
public class DetectionExecutionTransactionService {

    private final DetectionTaskRepository taskRepository;
    private final MediaAssetRepository assetRepository;
    private final ModelRegistryRepository modelRepository;
    private final ModelPredictionRepository predictionRepository;
    private final DetectionReportRepository reportRepository;
    private final Duration leaseDuration;
    private final Clock clock;

    @Autowired
    public DetectionExecutionTransactionService(
            DetectionTaskRepository taskRepository,
            MediaAssetRepository assetRepository,
            ModelRegistryRepository modelRepository,
            ModelPredictionRepository predictionRepository,
            DetectionReportRepository reportRepository,
            @Value("${app.detection.execution.lease-duration:5m}") Duration leaseDuration) {
        this(
                taskRepository,
                assetRepository,
                modelRepository,
                predictionRepository,
                reportRepository,
                leaseDuration,
                Clock.systemUTC());
    }

    DetectionExecutionTransactionService(
            DetectionTaskRepository taskRepository,
            MediaAssetRepository assetRepository,
            ModelRegistryRepository modelRepository,
            ModelPredictionRepository predictionRepository,
            DetectionReportRepository reportRepository,
            Duration leaseDuration,
            Clock clock) {
        if (leaseDuration.isZero() || leaseDuration.isNegative()) {
            throw new IllegalArgumentException("execution lease duration must be positive");
        }
        this.taskRepository = taskRepository;
        this.assetRepository = assetRepository;
        this.modelRepository = modelRepository;
        this.predictionRepository = predictionRepository;
        this.reportRepository = reportRepository;
        this.leaseDuration = leaseDuration;
        this.clock = clock;
    }

    @Transactional
    public DetectionExecutionClaim claim(String taskId) {
        DetectionTask task = findTaskForUpdate(taskId);
        if (task.getStatus() == DetectionStatus.COMPLETED) {
            return DetectionExecutionClaim.withoutPlan(DetectionExecutionClaimStatus.TERMINAL);
        }

        Instant now = Instant.now(clock);
        String token = newExternalId("execution");
        if (!task.claimExecution(token, now, now.plus(leaseDuration))) {
            return DetectionExecutionClaim.withoutPlan(DetectionExecutionClaimStatus.BUSY);
        }

        MediaAsset asset = assetRepository.findByAssetId(task.getAssetId())
                .orElseThrow(() -> new ResourceNotFoundException("Media asset not found: " + task.getAssetId()));
        List<ModelRegistry> models = modelRepository.findByEnabledTrueOrderByWeightDesc();
        if (models.isEmpty()) {
            task.failExecution(token, "No enabled model is available", now);
            return DetectionExecutionClaim.withoutPlan(DetectionExecutionClaimStatus.FAILED);
        }

        List<DetectionModelTarget> targets = models.stream()
                .map(model -> new DetectionModelTarget(
                        model.getModelId(),
                        model.getEndpointUrl(),
                        model.getDefaultThreshold()))
                .toList();
        return DetectionExecutionClaim.claimed(new DetectionExecutionPlan(
                token,
                task.getTaskId(),
                asset.getAssetId(),
                Path.of(asset.getStoragePath()),
                targets));
    }

    @Transactional
    public DetectionExecutionOutcome complete(
            String taskId,
            String executionToken,
            List<DetectionModelResult> results) {
        if (results.isEmpty()) {
            throw new IllegalArgumentException("detection completion requires at least one model result");
        }

        DetectionTask task = findTaskForUpdate(taskId);
        if (!task.ownsExecution(executionToken)) {
            return DetectionExecutionOutcome.STALE;
        }

        Instant now = Instant.now(clock);
        List<ModelPrediction> predictions = results.stream()
                .map(result -> toPrediction(taskId, result, now))
                .toList();
        predictionRepository.saveAll(predictions);
        reportRepository.save(buildReport(taskId, results, now));
        task.completeExecution(executionToken, now);
        return DetectionExecutionOutcome.COMPLETED;
    }

    @Transactional
    public DetectionExecutionOutcome fail(String taskId, String executionToken, String failureReason) {
        DetectionTask task = findTaskForUpdate(taskId);
        if (!task.failExecution(executionToken, failureReason, Instant.now(clock))) {
            return DetectionExecutionOutcome.STALE;
        }
        return DetectionExecutionOutcome.FAILED;
    }

    private DetectionTask findTaskForUpdate(String taskId) {
        return taskRepository.findByTaskIdForUpdate(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Detection task not found: " + taskId));
    }

    private ModelPrediction toPrediction(String taskId, DetectionModelResult result, Instant createdAt) {
        return new ModelPrediction(
                newExternalId("prediction"),
                taskId,
                result.target().modelId(),
                result.inference().modelVersion(),
                result.inference().rawScore(),
                result.inference().normalizedScore(),
                result.inference().label(),
                result.target().threshold(),
                result.inference().latencyMs(),
                result.inference().rawResponseJson(),
                createdAt);
    }

    private DetectionReport buildReport(
            String taskId,
            List<DetectionModelResult> results,
            Instant createdAt) {
        DetectionModelResult strongest = results.stream()
                .max(Comparator.comparingDouble(result -> result.inference().normalizedScore()))
                .orElseThrow();
        ModelLabel label = strongest.inference().label();
        double confidence = strongest.inference().normalizedScore();
        ReportVerdict verdict = toVerdict(label);
        RiskLevel riskLevel = toRiskLevel(label, confidence);
        String summary = "Model " + strongest.target().modelId()
                + " classified the image as " + label
                + " with confidence " + String.format("%.2f", confidence) + ".";
        String reportJson = "{\"verdict\":\"" + verdict
                + "\",\"confidence\":" + confidence
                + ",\"riskLevel\":\"" + riskLevel + "\"}";

        return new DetectionReport(
                newExternalId("report"),
                taskId,
                verdict,
                confidence,
                summary,
                riskLevel,
                reportJson,
                createdAt);
    }

    private ReportVerdict toVerdict(ModelLabel label) {
        return switch (label) {
            case AUTHENTIC -> ReportVerdict.LIKELY_AUTHENTIC;
            case SYNTHETIC -> ReportVerdict.LIKELY_SYNTHETIC;
            case UNCERTAIN -> ReportVerdict.UNCERTAIN;
        };
    }

    private RiskLevel toRiskLevel(ModelLabel label, double score) {
        if (label == ModelLabel.SYNTHETIC && score >= 0.8) {
            return RiskLevel.HIGH;
        }
        if (label == ModelLabel.SYNTHETIC || label == ModelLabel.UNCERTAIN) {
            return RiskLevel.MEDIUM;
        }
        return RiskLevel.LOW;
    }

    private String newExternalId(String prefix) {
        return prefix + "_" + UUID.randomUUID().toString().replace("-", "");
    }
}
