package com.fengting.aigcforensics.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

import com.fengting.aigcforensics.client.ModelInferenceClient;
import com.fengting.aigcforensics.client.ModelInferenceRequest;
import com.fengting.aigcforensics.client.ModelInferenceResult;
import com.fengting.aigcforensics.domain.ModelLabel;
import com.fengting.aigcforensics.domain.ModelRegistry;
import com.fengting.aigcforensics.dto.model.ModelSummaryResponse;
import com.fengting.aigcforensics.repository.ModelRegistryRepository;

@DataJpaTest
@Import({ModelRegistryService.class, ModelRegistryServiceTest.ModelRegistryServiceTestConfig.class})
class ModelRegistryServiceTest {

    @Autowired
    private ModelRegistryRepository modelRegistryRepository;

    @Autowired
    private ModelRegistryService modelRegistryService;

    @Test
    void listsEnabledModelsOrderedByWeight() {
        Instant now = Instant.parse("2026-07-07T00:00:00Z");
        modelRegistryRepository.save(new ModelRegistry(
                "enabled-low-weight",
                "Enabled Low Weight",
                "AI_IMAGE_DETECTOR",
                "v1",
                "http://localhost:5011",
                true,
                0.5,
                0.1,
                "Enabled model with lower priority.",
                now,
                now));
        modelRegistryRepository.save(new ModelRegistry(
                "enabled-high-weight",
                "Enabled High Weight",
                "AI_IMAGE_DETECTOR",
                "v1",
                "http://localhost:5012",
                true,
                0.5,
                2.0,
                "Enabled model with higher priority.",
                now,
                now));
        modelRegistryRepository.save(new ModelRegistry(
                "disabled",
                "Disabled",
                "AI_IMAGE_DETECTOR",
                "v1",
                "http://localhost:5013",
                false,
                0.5,
                1.0,
                "Disabled model.",
                now,
                now));

        assertThat(modelRegistryService.listEnabledModels())
                .extracting(ModelSummaryResponse::modelId)
                .containsSubsequence("enabled-high-weight", "nonescape-mini", "enabled-low-weight")
                .doesNotContain("disabled");
    }

    @TestConfiguration
    static class ModelRegistryServiceTestConfig {

        @Bean
        ModelInferenceClient modelInferenceClient() {
            return new ModelInferenceClient() {
                @Override
                public void checkHealth(String endpointUrl) {
                }

                @Override
                public ModelInferenceResult predict(String endpointUrl, ModelInferenceRequest request) {
                    return new ModelInferenceResult(
                            "v0",
                            0.1,
                            0.1,
                            ModelLabel.AUTHENTIC,
                            1,
                            "{}");
                }
            };
        }
    }
}
