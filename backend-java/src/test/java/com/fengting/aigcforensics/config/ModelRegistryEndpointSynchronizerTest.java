package com.fengting.aigcforensics.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.fengting.aigcforensics.domain.ModelRegistry;
import com.fengting.aigcforensics.repository.ModelRegistryRepository;

@ExtendWith(MockitoExtension.class)
class ModelRegistryEndpointSynchronizerTest {

    @Mock
    private ModelRegistryRepository modelRegistryRepository;

    @Test
    void updatesNonescapeMiniEndpointFromRuntimeConfiguration() {
        ModelRegistry modelRegistry = modelRegistry("http://localhost:5010");
        NonescapeMiniModelProperties properties = new NonescapeMiniModelProperties();
        properties.setEndpointUrl("http://nonescape-mini:5010");
        when(modelRegistryRepository.findByModelId("nonescape-mini")).thenReturn(Optional.of(modelRegistry));

        new ModelRegistryEndpointSynchronizer(modelRegistryRepository, properties).synchronize();

        assertThat(modelRegistry.getEndpointUrl()).isEqualTo("http://nonescape-mini:5010");
        verify(modelRegistryRepository).save(modelRegistry);
    }

    @Test
    void skipsUpdateWhenConfiguredEndpointMatchesRegistry() {
        ModelRegistry modelRegistry = modelRegistry("http://localhost:5010");
        NonescapeMiniModelProperties properties = new NonescapeMiniModelProperties();
        properties.setEndpointUrl("http://localhost:5010");
        when(modelRegistryRepository.findByModelId("nonescape-mini")).thenReturn(Optional.of(modelRegistry));

        new ModelRegistryEndpointSynchronizer(modelRegistryRepository, properties).synchronize();

        verify(modelRegistryRepository, never()).save(modelRegistry);
    }

    private ModelRegistry modelRegistry(String endpointUrl) {
        Instant now = Instant.parse("2026-07-07T00:00:00Z");
        return new ModelRegistry(
                "nonescape-mini",
                "Nonescape Mini",
                "AI_IMAGE_DETECTOR",
                "v0",
                endpointUrl,
                true,
                0.5,
                1.0,
                "Mini AI-generated image detector.",
                now,
                now);
    }
}
