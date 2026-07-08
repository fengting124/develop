package com.fengting.aigcforensics.service;

import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Set;
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
import com.fengting.aigcforensics.service.ImageMetadataService.ImageMetadata;
import com.fengting.aigcforensics.service.StorageService.StoredFile;

@Service
public class DetectionWorkflowService {

    private static final Set<String> SUPPORTED_IMAGE_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp");
    private static final String UNSUPPORTED_IMAGE_MESSAGE = "Only JPEG, PNG, and WebP images are supported";

    private final MediaAssetRepository mediaAssetRepository;
    private final DetectionTaskRepository detectionTaskRepository;
    private final StorageService storageService;
    private final HashService hashService;
    private final ImageMetadataService imageMetadataService;
    private final ModelPredictionRepository modelPredictionRepository;
    private final DetectionReportRepository detectionReportRepository;
    private final Clock clock;

    @Autowired
    public DetectionWorkflowService(
            MediaAssetRepository mediaAssetRepository,
            DetectionTaskRepository detectionTaskRepository,
            StorageService storageService,
            HashService hashService,
            ImageMetadataService imageMetadataService,
            ModelPredictionRepository modelPredictionRepository,
            DetectionReportRepository detectionReportRepository) {
        this(
                mediaAssetRepository,
                detectionTaskRepository,
                storageService,
                hashService,
                imageMetadataService,
                modelPredictionRepository,
                detectionReportRepository,
                Clock.systemUTC());
    }

    DetectionWorkflowService(
            MediaAssetRepository mediaAssetRepository,
            DetectionTaskRepository detectionTaskRepository,
            StorageService storageService,
            HashService hashService,
            ImageMetadataService imageMetadataService,
            ModelPredictionRepository modelPredictionRepository,
            DetectionReportRepository detectionReportRepository,
            Clock clock) {
        this.mediaAssetRepository = mediaAssetRepository;
        this.detectionTaskRepository = detectionTaskRepository;
        this.storageService = storageService;
        this.hashService = hashService;
        this.imageMetadataService = imageMetadataService;
        this.modelPredictionRepository = modelPredictionRepository;
        this.detectionReportRepository = detectionReportRepository;
        this.clock = clock;
    }

    @Transactional
    public CreateImageDetectionResponse createImageDetection(MultipartFile file) {
        validateUpload(file);

        byte[] content = readContent(file);
        String sha256 = hashService.sha256(content);
        MediaAsset asset = mediaAssetRepository.findBySha256(sha256)
                .orElseGet(() -> storeNewAsset(file, content, sha256));

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

        String contentType = normalizeContentType(file.getContentType());
        if (!SUPPORTED_IMAGE_TYPES.contains(contentType)) {
            throw new IllegalArgumentException(UNSUPPORTED_IMAGE_MESSAGE);
        }
    }

    private MediaAsset storeNewAsset(MultipartFile file, byte[] content, String sha256) {
        String assetId = newExternalId("asset");
        StoredFile storedFile = storageService.saveUpload(assetId, file.getOriginalFilename(), content);
        ImageMetadata metadata = imageMetadataService.read(storedFile.path());

        MediaAsset asset = new MediaAsset(
                assetId,
                safeOriginalFilename(file),
                normalizeContentType(file.getContentType()),
                storedFile.size(),
                sha256,
                metadata.width(),
                metadata.height(),
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

    private String safeOriginalFilename(MultipartFile file) {
        String filename = file.getOriginalFilename();
        if (filename == null || filename.isBlank()) {
            return "upload.bin";
        }
        return filename;
    }

    private String normalizeContentType(String contentType) {
        if (contentType == null) {
            return "";
        }
        return contentType.toLowerCase(Locale.ROOT);
    }

    private String newExternalId(String prefix) {
        return prefix + "_" + UUID.randomUUID().toString().replace("-", "");
    }
}
