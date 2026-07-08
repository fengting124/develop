package com.fengting.aigcforensics.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import com.fengting.aigcforensics.domain.DetectionReport;
import com.fengting.aigcforensics.domain.DetectionStatus;
import com.fengting.aigcforensics.domain.DetectionTask;
import com.fengting.aigcforensics.domain.MediaAsset;
import com.fengting.aigcforensics.domain.ModelLabel;
import com.fengting.aigcforensics.domain.ModelPrediction;
import com.fengting.aigcforensics.domain.ModelRegistry;
import com.fengting.aigcforensics.domain.ReportVerdict;
import com.fengting.aigcforensics.domain.RiskLevel;

@DataJpaTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate"
})
class CoreRepositoryTest {

    @Autowired
    private MediaAssetRepository mediaAssetRepository;

    @Autowired
    private DetectionTaskRepository detectionTaskRepository;

    @Autowired
    private ModelRegistryRepository modelRegistryRepository;

    @Autowired
    private ModelPredictionRepository modelPredictionRepository;

    @Autowired
    private DetectionReportRepository detectionReportRepository;

    @Test
    void persistsDetectionAggregateRecords() {
        Instant now = Instant.parse("2026-07-07T00:00:00Z");

        mediaAssetRepository.save(new MediaAsset(
                "asset_001",
                "sample.png",
                "image/png",
                128,
                "0".repeat(64),
                640,
                480,
                "storage/uploads/asset_001/sample.png",
                null,
                now));
        modelRegistryRepository.save(new ModelRegistry(
                "test-detector",
                "Test Detector",
                "AI_IMAGE_DETECTOR",
                "v1",
                "http://localhost:5010",
                true,
                0.5,
                1.0,
                "Mini AI-generated image detector.",
                now,
                now));
        detectionTaskRepository.save(new DetectionTask("task_001", "asset_001", DetectionStatus.QUEUED, now));
        modelPredictionRepository.save(new ModelPrediction(
                "prediction_001",
                "task_001",
                "test-detector",
                "v1",
                0.91,
                0.91,
                ModelLabel.SYNTHETIC,
                0.5,
                132,
                "{\"score\":0.91}",
                now));
        detectionReportRepository.save(new DetectionReport(
                "report_001",
                "task_001",
                ReportVerdict.LIKELY_SYNTHETIC,
                0.91,
                "The enabled detector reports a high probability that this image is AI-generated.",
                RiskLevel.HIGH,
                "{\"reportId\":\"report_001\"}",
                now));

        assertThat(mediaAssetRepository.findByAssetId("asset_001")).isPresent();
        assertThat(modelRegistryRepository.findByEnabledTrueOrderByWeightDesc())
                .extracting(ModelRegistry::getModelId)
                .contains("nonescape-mini", "test-detector");
        assertThat(detectionTaskRepository.findByTaskId("task_001"))
                .get()
                .extracting(DetectionTask::getStatus)
                .isEqualTo(DetectionStatus.QUEUED);
        assertThat(modelPredictionRepository.findByTaskIdOrderByCreatedAtAsc("task_001")).hasSize(1);
        assertThat(detectionReportRepository.findByReportId("report_001"))
                .get()
                .extracting(DetectionReport::getVerdict)
                .isEqualTo(ReportVerdict.LIKELY_SYNTHETIC);
    }
}
