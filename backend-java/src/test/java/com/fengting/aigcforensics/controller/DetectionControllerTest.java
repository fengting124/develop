package com.fengting.aigcforensics.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.concurrent.atomic.AtomicBoolean;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fengting.aigcforensics.client.ModelInferenceClient;
import com.fengting.aigcforensics.client.ModelInferenceException;
import com.fengting.aigcforensics.client.ModelInferenceRequest;
import com.fengting.aigcforensics.client.ModelInferenceResult;
import com.fengting.aigcforensics.domain.DetectionStatus;
import com.fengting.aigcforensics.domain.ModelLabel;
import com.fengting.aigcforensics.repository.DetectionTaskRepository;
import com.fengting.aigcforensics.repository.DetectionReportRepository;
import com.fengting.aigcforensics.repository.MediaAssetRepository;
import com.fengting.aigcforensics.repository.ModelPredictionRepository;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate",
        "app.storage.root=target/test-storage"
})
class DetectionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private MediaAssetRepository mediaAssetRepository;

    @Autowired
    private DetectionTaskRepository detectionTaskRepository;

    @Autowired
    private ModelPredictionRepository modelPredictionRepository;

    @Autowired
    private DetectionReportRepository detectionReportRepository;

    @Autowired
    private StubModelInferenceClient stubModelInferenceClient;

    @Test
    void createImageDetectionStoresAssetAndQueuedTask() throws Exception {
        MockMultipartFile image = new MockMultipartFile(
                "file",
                "sample.png",
                "image/png",
                onePixelPng("sample.png"));

        String response = mockMvc.perform(multipart("/api/detections/images").file(image))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.assetId").isString())
                .andExpect(jsonPath("$.taskId").isString())
                .andExpect(jsonPath("$.status").value("QUEUED"))
                .andExpect(jsonPath("$.filename").value("sample.png"))
                .andExpect(jsonPath("$.contentType").value("image/png"))
                .andExpect(jsonPath("$.width").value(1))
                .andExpect(jsonPath("$.height").value(1))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String assetId = response.replaceAll(".*\"assetId\":\"([^\"]+)\".*", "$1");
        String taskId = response.replaceAll(".*\"taskId\":\"([^\"]+)\".*", "$1");

        assertThat(mediaAssetRepository.findByAssetId(assetId)).isPresent();
        assertThat(detectionTaskRepository.findByTaskId(taskId))
                .isPresent()
                .get()
                .extracting(task -> task.getStatus())
                .isEqualTo(DetectionStatus.QUEUED);
    }

    @Test
    void createImageDetectionRejectsNonImageUpload() throws Exception {
        MockMultipartFile text = new MockMultipartFile(
                "file",
                "note.txt",
                "text/plain",
                "hello".getBytes());

        mockMvc.perform(multipart("/api/detections/images").file(text))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Only JPEG, PNG, and WebP images are supported"));
    }

    @Test
    void getDetectionReturnsTaskAndAssetDetails() throws Exception {
        JsonNode created = createImageDetection("lookup.png");
        String taskId = created.get("taskId").asText();
        String assetId = created.get("assetId").asText();

        mockMvc.perform(get("/api/detections/{taskId}", taskId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.taskId").value(taskId))
                .andExpect(jsonPath("$.assetId").value(assetId))
                .andExpect(jsonPath("$.status").value("QUEUED"))
                .andExpect(jsonPath("$.filename").value("lookup.png"))
                .andExpect(jsonPath("$.contentType").value("image/png"))
                .andExpect(jsonPath("$.width").value(1))
                .andExpect(jsonPath("$.height").value(1));
    }

    @Test
    void getDetectionReturnsNotFoundForUnknownTask() throws Exception {
        mockMvc.perform(get("/api/detections/{taskId}", "task_missing"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Detection task not found: task_missing"));
    }

    @Test
    void listDetectionsReturnsNewestTasksWithReportSummary() throws Exception {
        JsonNode older = createImageDetection("older.png");
        String olderTaskId = older.get("taskId").asText();
        mockMvc.perform(post("/api/detections/{taskId}/run", olderTaskId))
                .andExpect(status().isOk());

        JsonNode newer = createImageDetection("newer.png");
        String newerTaskId = newer.get("taskId").asText();

        mockMvc.perform(get("/api/detections"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].taskId").value(newerTaskId))
                .andExpect(jsonPath("$[0].filename").value("newer.png"))
                .andExpect(jsonPath("$[0].status").value("QUEUED"))
                .andExpect(jsonPath("$[0].report").doesNotExist())
                .andExpect(jsonPath("$[1].taskId").value(olderTaskId))
                .andExpect(jsonPath("$[1].filename").value("older.png"))
                .andExpect(jsonPath("$[1].status").value("COMPLETED"))
                .andExpect(jsonPath("$[1].report.verdict").value("LIKELY_SYNTHETIC"))
                .andExpect(jsonPath("$[1].report.confidence").value(0.86));
    }

    @Test
    void runDetectionStoresPredictionReportAndMarksTaskCompleted() throws Exception {
        JsonNode created = createImageDetection("synthetic.png");
        String taskId = created.get("taskId").asText();

        String response = mockMvc.perform(post("/api/detections/{taskId}/run", taskId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.taskId").value(taskId))
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.predictions[0].modelId").value("nonescape-mini"))
                .andExpect(jsonPath("$.predictions[0].label").value("SYNTHETIC"))
                .andExpect(jsonPath("$.report.verdict").value("LIKELY_SYNTHETIC"))
                .andExpect(jsonPath("$.report.riskLevel").value("HIGH"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String reportId = objectMapper.readTree(response).get("report").get("reportId").asText();

        assertThat(detectionTaskRepository.findByTaskId(taskId))
                .isPresent()
                .get()
                .extracting(task -> task.getStatus())
                .isEqualTo(DetectionStatus.COMPLETED);
        assertThat(modelPredictionRepository.findByTaskIdOrderByCreatedAtAsc(taskId)).hasSize(1);
        assertThat(detectionReportRepository.findByTaskId(taskId)).isPresent();

        mockMvc.perform(get("/api/reports/{reportId}", reportId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.taskId").value(taskId))
                .andExpect(jsonPath("$.filename").value("synthetic.png"))
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.predictions[0].modelId").value("nonescape-mini"))
                .andExpect(jsonPath("$.report.reportId").value(reportId))
                .andExpect(jsonPath("$.report.verdict").value("LIKELY_SYNTHETIC"));
    }

    @Test
    void getReportReturnsNotFoundForUnknownReport() throws Exception {
        mockMvc.perform(get("/api/reports/{reportId}", "report_missing"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Detection report not found: report_missing"));
    }

    @Test
    void runDetectionMarksTaskFailedWhenModelCallFails() throws Exception {
        JsonNode created = createImageDetection("failure.png");
        String taskId = created.get("taskId").asText();
        stubModelInferenceClient.failNextCall();

        mockMvc.perform(post("/api/detections/{taskId}/run", taskId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.taskId").value(taskId))
                .andExpect(jsonPath("$.status").value("FAILED"))
                .andExpect(jsonPath("$.failureReason").value("model service unavailable"));

        assertThat(detectionTaskRepository.findByTaskId(taskId))
                .isPresent()
                .get()
                .extracting(task -> task.getStatus())
                .isEqualTo(DetectionStatus.FAILED);
        assertThat(modelPredictionRepository.findByTaskIdOrderByCreatedAtAsc(taskId)).isEmpty();
        assertThat(detectionReportRepository.findByTaskId(taskId)).isEmpty();
    }

    private byte[] onePixelPng(String seed) throws IOException {
        BufferedImage image = new BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB);
        image.setRGB(0, 0, Color.getHSBColor(Math.abs(seed.hashCode() % 360) / 360.0f, 0.5f, 1.0f).getRGB());

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        ImageIO.write(image, "png", outputStream);
        return outputStream.toByteArray();
    }

    private JsonNode createImageDetection(String filename) throws Exception {
        MockMultipartFile image = new MockMultipartFile(
                "file",
                filename,
                "image/png",
                onePixelPng(filename));

        String response = mockMvc.perform(multipart("/api/detections/images").file(image))
                .andExpect(status().isAccepted())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(response);
    }

    @TestConfiguration
    static class DetectionControllerTestConfig {

        @Bean
        @Primary
        StubModelInferenceClient stubModelInferenceClient() {
            return new StubModelInferenceClient();
        }
    }

    static class StubModelInferenceClient implements ModelInferenceClient {

        private final AtomicBoolean failNextCall = new AtomicBoolean(false);

        void failNextCall() {
            failNextCall.set(true);
        }

        @Override
        public void checkHealth(String endpointUrl) {
        }

        @Override
        public ModelInferenceResult predict(String endpointUrl, ModelInferenceRequest request) {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            if (failNextCall.getAndSet(false)) {
                throw new ModelInferenceException("model service unavailable");
            }
            return new ModelInferenceResult(
                    "v0",
                    0.86,
                    0.86,
                    ModelLabel.SYNTHETIC,
                    42,
                    "{\"score\":0.86,\"label\":\"SYNTHETIC\"}");
        }
    }
}
