package com.fengting.aigcforensics.evaluation.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate",
        "app.detection.jobs.worker-enabled=false"
})
class EvaluationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void createsCompletedEvaluationAndExposesMetricsAndWrongSamples() throws Exception {
        String response = mockMvc.perform(post("/api/evaluations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "name": "Smoke Dataset",
                          "datasetName": "sample-v1",
                          "modelId": "nonescape-mini",
                          "manifest": "filename,groundTruthLabel,predictedLabel,score,latencyMs\\nreal_001.jpg,AUTHENTIC,AUTHENTIC,0.12,31\\nfake_001.jpg,SYNTHETIC,SYNTHETIC,0.91,42\\nfake_002.jpg,SYNTHETIC,AUTHENTIC,0.44,28"
                        }
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.evaluationId").isString())
                .andExpect(jsonPath("$.name").value("Smoke Dataset"))
                .andExpect(jsonPath("$.datasetName").value("sample-v1"))
                .andExpect(jsonPath("$.modelId").value("nonescape-mini"))
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.totalSamples").value(3))
                .andExpect(jsonPath("$.completedSamples").value(3))
                .andExpect(jsonPath("$.precision").value(1.0))
                .andExpect(jsonPath("$.recall").value(0.5))
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode created = objectMapper.readTree(response);
        String evaluationId = created.get("evaluationId").asText();

        mockMvc.perform(get("/api/evaluations/{evaluationId}", evaluationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.evaluationId").value(evaluationId))
                .andExpect(jsonPath("$.samples.length()").value(3))
                .andExpect(jsonPath("$.samples[0].filename").value("real_001.jpg"));

        mockMvc.perform(get("/api/evaluations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].evaluationId").value(evaluationId))
                .andExpect(jsonPath("$[0].status").value("COMPLETED"));

        mockMvc.perform(get("/api/evaluations/{evaluationId}/samples", evaluationId).param("correct", "false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].filename").value("fake_002.jpg"))
                .andExpect(jsonPath("$[0].correct").value(false));

        assertThat(created.get("accuracy").asDouble()).isCloseTo(2.0 / 3.0, org.assertj.core.data.Offset.offset(0.001));
        assertThat(created.get("f1").asDouble()).isCloseTo(2.0 / 3.0, org.assertj.core.data.Offset.offset(0.001));
    }

    @Test
    void createEvaluationRejectsUnknownModel() throws Exception {
        mockMvc.perform(post("/api/evaluations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "name": "Unknown Model Dataset",
                          "datasetName": "sample-v1",
                          "modelId": "missing-model",
                          "manifest": "filename,groundTruthLabel\\nreal_001.jpg,AUTHENTIC"
                        }
                        """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Model not found: missing-model"));
    }

    @Test
    void createEvaluationRejectsInvalidManifest() throws Exception {
        mockMvc.perform(post("/api/evaluations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "name": "Bad Dataset",
                          "datasetName": "sample-v1",
                          "modelId": "nonescape-mini",
                          "manifest": "filename,groundTruthLabel\\nreal_001.jpg,UNKNOWN"
                        }
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Unsupported label at manifest line 2: UNKNOWN"));
    }
}
