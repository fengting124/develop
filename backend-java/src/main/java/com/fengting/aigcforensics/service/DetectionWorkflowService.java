package com.fengting.aigcforensics.service;

import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.fengting.aigcforensics.domain.DetectionStatus;
import com.fengting.aigcforensics.domain.DetectionTask;
import com.fengting.aigcforensics.domain.MediaAsset;
import com.fengting.aigcforensics.domain.ModelPrediction;
import com.fengting.aigcforensics.dto.detection.CreateImageDetectionResponse;
import com.fengting.aigcforensics.dto.detection.DetectionDetailResponse;
import com.fengting.aigcforensics.dto.detection.DetectionHistoryItemResponse;
import com.fengting.aigcforensics.dto.detection.DetectionPredictionResponse;
import com.fengting.aigcforensics.dto.detection.DetectionReportResponse;
import com.fengting.aigcforensics.repository.DetectionReportRepository;
import com.fengting.aigcforensics.repository.DetectionTaskRepository;
import com.fengting.aigcforensics.repository.MediaAssetRepository;
import com.fengting.aigcforensics.repository.ModelPredictionRepository;
import com.fengting.aigcforensics.config.UploadPolicyProperties;
import com.fengting.aigcforensics.service.StorageService.StoredFile;

@Service
public class DetectionWorkflowService {

    private final MediaAssetRepository mediaAssetRepository;
    private final DetectionTaskRepository detectionTaskRepository;
    private final StorageService storageService;
    private final HashService hashService;
    private final ImageUploadInspector imageUploadInspector;
    private final UploadFilenameSanitizer filenameSanitizer;
    private final UploadPolicyProperties uploadPolicy;
    private final ModelPredictionRepository modelPredictionRepository;
    private final DetectionReportRepository detectionReportRepository;
    private final Clock clock;

    @Autowired
    public DetectionWorkflowService(
            MediaAssetRepository mediaAssetRepository,
            DetectionTaskRepository detectionTaskRepository,
            StorageService storageService,
            HashService hashService,
            ImageUploadInspector imageUploadInspector,
            UploadFilenameSanitizer filenameSanitizer,
            UploadPolicyProperties uploadPolicy,
            ModelPredictionRepository modelPredictionRepository,
            DetectionReportRepository detectionReportRepository) {
        this(
                mediaAssetRepository,
                detectionTaskRepository,
                storageService,
                hashService,
                imageUploadInspector,
                filenameSanitizer,
                uploadPolicy,
                modelPredictionRepository,
                detectionReportRepository,
                Clock.systemUTC());
    }

    DetectionWorkflowService(
            MediaAssetRepository mediaAssetRepository,
            DetectionTaskRepository detectionTaskRepository,
            StorageService storageService,
            HashService hashService,
            ImageUploadInspector imageUploadInspector,
            UploadFilenameSanitizer filenameSanitizer,
            UploadPolicyProperties uploadPolicy,
            ModelPredictionRepository modelPredictionRepository,
            DetectionReportRepository detectionReportRepository,
            Clock clock) {
        this.mediaAssetRepository = mediaAssetRepository;
        this.detectionTaskRepository = detectionTaskRepository;
        this.storageService = storageService;
        this.hashService = hashService;
        this.imageUploadInspector = imageUploadInspector;
        this.filenameSanitizer = filenameSanitizer;
        this.uploadPolicy = uploadPolicy;
        this.modelPredictionRepository = modelPredictionRepository;
        this.detectionReportRepository = detectionReportRepository;
        this.clock = clock;
    }

    @Transactional
    public CreateImageDetectionResponse createImageDetection(MultipartFile file) {
        validateUpload(file);

        byte[] content = readContent(file);
        InspectedImage inspectedImage = imageUploadInspector.inspect(content);
        String sha256 = hashService.sha256(content);
        MediaAsset asset = mediaAssetRepository.findBySha256(sha256)
                .orElseGet(() -> storeNewAsset(file, content, sha256, inspectedImage));

        DetectionTask task = new DetectionTask(
                newExternalId("task"),
                asset.getAssetId(),
                DetectionStatus.QUEUED,
                Instant.now(clock));
        DetectionTask savedTask = detectionTaskRepository.save(task);

        return new CreateImageDetectionResponse(
                asset.getAssetId(),
                savedTask.getTaskId(),
                savedTask.getStatus(),
                asset.getOriginalFilename(),
                asset.getContentType(),
                asset.getFileSize(),
                asset.getSha256(),
                asset.getWidth(),
                asset.getHeight());
    }

    @Transactional(readOnly = true)
    public DetectionDetailResponse getDetection(String taskId) {
        DetectionTask task = detectionTaskRepository.findByTaskId(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Detection task not found: " + taskId));
        return toDetailResponse(task);
    }

    @Transactional(readOnly = true)
    public List<DetectionHistoryItemResponse> listDetections() {
        return detectionTaskRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toHistoryItemResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public DetectionDetailResponse getReport(String reportId) {
        String taskId = detectionReportRepository.findByReportId(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Detection report not found: " + reportId))
                .getTaskId();
        DetectionTask task = detectionTaskRepository.findByTaskId(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Detection task not found: " + taskId));
        return toDetailResponse(task);
    }

    private DetectionDetailResponse toDetailResponse(DetectionTask task) {
        MediaAsset asset = mediaAssetRepository.findByAssetId(task.getAssetId())
                .orElseThrow(() -> new ResourceNotFoundException("Media asset not found: " + task.getAssetId()));

        return new DetectionDetailResponse(
                task.getTaskId(),
                task.getAssetId(),
                task.getStatus(),
                task.getFailureReason(),
                asset.getOriginalFilename(),
                asset.getContentType(),
                asset.getFileSize(),
                asset.getSha256(),
                asset.getWidth(),
                asset.getHeight(),
                task.getCreatedAt(),
                task.getStartedAt(),
                task.getCompletedAt(),
                toPredictionResponses(task.getTaskId()),
                toReportResponse(task.getTaskId()));
    }

    private DetectionHistoryItemResponse toHistoryItemResponse(DetectionTask task) {
        MediaAsset asset = mediaAssetRepository.findByAssetId(task.getAssetId())
                .orElseThrow(() -> new ResourceNotFoundException("Media asset not found: " + task.getAssetId()));

        return new DetectionHistoryItemResponse(
                task.getTaskId(),
                task.getAssetId(),
                task.getStatus(),
                task.getFailureReason(),
                asset.getOriginalFilename(),
                asset.getContentType(),
                asset.getFileSize(),
                asset.getSha256(),
                asset.getWidth(),
                asset.getHeight(),
                task.getCreatedAt(),
                task.getStartedAt(),
                task.getCompletedAt(),
                toReportResponse(task.getTaskId()));
    }

    private List<DetectionPredictionResponse> toPredictionResponses(String taskId) {
        return modelPredictionRepository.findByTaskIdOrderByCreatedAtAsc(taskId).stream()
                .map(this::toPredictionResponse)
                .toList();
    }

    private DetectionPredictionResponse toPredictionResponse(ModelPrediction prediction) {
        return new DetectionPredictionResponse(
                prediction.getPredictionId(),
                prediction.getModelId(),
                prediction.getModelVersion(),
                prediction.getRawScore(),
                prediction.getNormalizedScore(),
                prediction.getLabel(),
                prediction.getThreshold(),
                prediction.getLatencyMs(),
                prediction.getCreatedAt());
    }

    private DetectionReportResponse toReportResponse(String taskId) {
        return detectionReportRepository.findByTaskId(taskId)
                .map(report -> new DetectionReportResponse(
                        report.getReportId(),
                        report.getVerdict(),
                        report.getConfidence(),
                        report.getSummary(),
                        report.getRiskLevel(),
                        report.getCreatedAt()))
                .orElse(null);
    }

    private void validateUpload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file must not be empty");
        }
        if (file.getSize() > uploadPolicy.maxBytes()) {
            throw new IllegalArgumentException("Uploaded file exceeds the configured byte limit");
        }
    }

    private MediaAsset storeNewAsset(
            MultipartFile file,
            byte[] content,
            String sha256,
            InspectedImage inspectedImage) {
        String assetId = newExternalId("asset");
        StoredFile storedFile = storageService.saveAcceptedImage(
                assetId,
                inspectedImage.extension(),
                content);

        MediaAsset asset = new MediaAsset(
                assetId,
                filenameSanitizer.sanitize(file.getOriginalFilename()),
                inspectedImage.contentType(),
                storedFile.size(),
                sha256,
                inspectedImage.width(),
                inspectedImage.height(),
                storedFile.path().toString(),
                null,
                Instant.now(clock));
        return mediaAssetRepository.save(asset);
    }

    private byte[] readContent(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to read uploaded file", exception);
        }
    }

    private String newExternalId(String prefix) {
        return prefix + "_" + UUID.randomUUID().toString().replace("-", "");
    }
}
