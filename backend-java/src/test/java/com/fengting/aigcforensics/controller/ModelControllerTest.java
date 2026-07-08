package com.fengting.aigcforensics.controller;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.concurrent.atomic.AtomicBoolean;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.fengting.aigcforensics.client.ModelInferenceClient;
import com.fengting.aigcforensics.client.ModelInferenceException;
import com.fengting.aigcforensics.client.ModelInferenceRequest;
import com.fengting.aigcforensics.client.ModelInferenceResult;
import com.fengting.aigcforensics.domain.ModelLabel;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate"
})
class ModelControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private StubModelInferenceClient stubModelInferenceClient;

    @Test
    void listModelsReturnsSeededNonescapeMini() throws Exception {
        mockMvc.perform(get("/api/models"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].modelId").value("nonescape-mini"))
                .andExpect(jsonPath("$[0].displayName").value("Nonescape Mini"))
                .andExpect(jsonPath("$[0].enabled").value(true))
                .andExpect(jsonPath("$[0].defaultThreshold").value(0.5));
    }

    @Test
    void healthCheckReturnsHealthyModelStatus() throws Exception {
        mockMvc.perform(post("/api/models/{modelId}/health-check", "nonescape-mini"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.modelId").value("nonescape-mini"))
                .andExpect(jsonPath("$.endpointUrl").value("http://localhost:5010"))
                .andExpect(jsonPath("$.healthy").value(true))
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.message").value("Model service is reachable"));
    }

    @Test
    void healthCheckReturnsDegradedModelStatusWhenModelServiceFails() throws Exception {
        stubModelInferenceClient.failHealthCheck();

        mockMvc.perform(post("/api/models/{modelId}/health-check", "nonescape-mini"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.modelId").value("nonescape-mini"))
                .andExpect(jsonPath("$.healthy").value(false))
                .andExpect(jsonPath("$.status").value("DOWN"))
                .andExpect(jsonPath("$.message", containsString("model service unavailable")));
    }

    @Test
    void healthCheckReturnsNotFoundForUnknownModel() throws Exception {
        mockMvc.perform(post("/api/models/{modelId}/health-check", "missing-model"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Model not found: missing-model"));
    }

    @TestConfiguration
    static class ModelControllerTestConfig {

        @Bean
        @Primary
        StubModelInferenceClient stubModelInferenceClient() {
            return new StubModelInferenceClient();
        }
    }

    static class StubModelInferenceClient implements ModelInferenceClient {

        private final AtomicBoolean failHealthCheck = new AtomicBoolean(false);

        void failHealthCheck() {
            failHealthCheck.set(true);
        }

        @Override
        public void checkHealth(String endpointUrl) {
            if (failHealthCheck.getAndSet(false)) {
                throw new ModelInferenceException("model service unavailable");
            }
        }

        @Override
        public ModelInferenceResult predict(String endpointUrl, ModelInferenceRequest request) {
            return new ModelInferenceResult(
                    "v0",
                    0.2,
                    0.2,
                    ModelLabel.AUTHENTIC,
                    12,
                    "{}");
        }
    }
}
