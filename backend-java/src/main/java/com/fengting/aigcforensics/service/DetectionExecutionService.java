package com.fengting.aigcforensics.service;

import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fengting.aigcforensics.client.ModelInferenceClient;
import com.fengting.aigcforensics.client.ModelInferenceRequest;
import com.fengting.aigcforensics.client.ModelInferenceResult;
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
public class DetectionExecutionService {

    private final DetectionTaskRepository detectionTaskRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final ModelRegistryRepository modelRegistryRepository;
    private final ModelPredictionRepository modelPredictionRepository;
    private final DetectionReportRepository detectionReportRepository;
    private final ModelInferenceClient modelInferenceClient;
    private final Clock clock;

    @Autowired
    public DetectionExecutionService(
            DetectionTaskRepository detectionTaskRepository,
            MediaAssetRepository mediaAssetRepository,
            ModelRegistryRepository modelRegistryRepository,
            ModelPredictionRepository modelPredictionRepository,
            DetectionReportRepository detectionReportRepository,
            ModelInferenceClient modelInferenceClient) {
        this(
                detectionTaskRepository,
                mediaAssetRepository,
                modelRegistryRepository,
                modelPredictionRepository,
                detectionReportRepository,
                modelInferenceClient,
                Clock.systemUTC());
    }

    DetectionExecutionService(
            DetectionTaskRepository detectionTaskRepository,
            MediaAssetRepository mediaAssetRepository,
            ModelRegistryRepository modelRegistryRepository,
            ModelPredictionRepository modelPredictionRepository,
            DetectionReportRepository detectionReportRepository,
            ModelInferenceClient modelInferenceClient,
            Clock clock) {
        this.detectionTaskRepository = detectionTaskRepository;
        this.mediaAssetRepository = mediaAssetRepository;
        this.modelRegistryRepository = modelRegistryRepository;
        this.modelPredictionRepository = modelPredictionRepository;
        this.detectionReportRepository = detectionReportRepository;
        this.modelInferenceClient = modelInferenceClient;
        this.clock = clock;
    }

    @Transactional
    public void runDetection(String taskId) {
        DetectionTask task = detectionTaskRepository.findByTaskId(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Detection task not found: " + taskId));
        if (task.getStatus() == DetectionStatus.COMPLETED) {
            return;
        }

        MediaAsset asset = mediaAssetRepository.findByAssetId(task.getAssetId())
                .orElseThrow(() -> new ResourceNotFoundException("Media asset not found: " + task.getAssetId()));
        List<ModelRegistry> enabledModels = modelRegistryRepository.findByEnabledTrueOrderByWeightDesc();
        if (enabledModels.isEmpty()) {
            task.markFailed("No enabled model is available", Instant.now(clock));
            return;
        }

        task.markStarted(Instant.now(clock));
        try {
            for (ModelRegistry model : enabledModels) {
                ModelInferenceResult result = modelInferenceClient.predict(
                        model.getEndpointUrl(),
                        new ModelInferenceRequest(
                                task.getTaskId(),
                                asset.getAssetId(),
                                Path.of(asset.getStoragePath()),
                                model.getDefaultThreshold()));
                modelPredictionRepository.save(toPrediction(task, model, result));
            }
            DetectionReport report = buildReport(task.getTaskId());
            detectionReportRepository.save(report);
            task.markCompleted(Instant.now(clock));
        } catch (RuntimeException exception) {
            task.markFailed(exception.getMessage(), Instant.now(clock));
        }
    }

    private ModelPrediction toPrediction(DetectionTask task, ModelRegistry model, ModelInferenceResult result) {
        Instant now = Instant.now(clock);
        return new ModelPrediction(
                newExternalId("prediction"),
                task.getTaskId(),
                model.getModelId(),
                result.modelVersion(),
                result.rawScore(),
                result.normalizedScore(),
                result.label(),
                model.getDefaultThreshold(),
                result.latencyMs(),
                result.rawResponseJson(),
                now);
    }

    private DetectionReport buildReport(String taskId) {
        List<ModelPrediction> predictions = modelPredictionRepository.findByTaskIdOrderByCreatedAtAsc(taskId);
        ModelPrediction strongestPrediction = predictions.stream()
                .max(Comparator.comparingDouble(ModelPrediction::getNormalizedScore))
                .orElseThrow(() -> new IllegalStateException("No model prediction was produced"));
        ReportVerdict verdict = toVerdict(strongestPrediction.getLabel());
        RiskLevel riskLevel = toRiskLevel(strongestPrediction.getLabel(), strongestPrediction.getNormalizedScore());
        double confidence = strongestPrediction.getNormalizedScore();
        String summary = "Model " + strongestPrediction.getModelId()
                + " classified the image as " + strongestPrediction.getLabel()
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
                Instant.now(clock));
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
