package com.fengting.aigcforensics.config;

import java.time.Instant;
import java.util.Objects;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.fengting.aigcforensics.domain.ModelRegistry;
import com.fengting.aigcforensics.repository.ModelRegistryRepository;

@Component
@ConditionalOnProperty(
        prefix = "app.model-registry",
        name = "synchronization-enabled",
        havingValue = "true",
        matchIfMissing = true)
public class ModelRegistryEndpointSynchronizer implements ApplicationRunner {

    private static final String NONESCAPE_MINI_MODEL_ID = "nonescape-mini";

    private final ModelRegistryRepository modelRegistryRepository;
    private final NonescapeMiniModelProperties nonescapeMiniModelProperties;

    public ModelRegistryEndpointSynchronizer(
            ModelRegistryRepository modelRegistryRepository,
            NonescapeMiniModelProperties nonescapeMiniModelProperties) {
        this.modelRegistryRepository = modelRegistryRepository;
        this.nonescapeMiniModelProperties = nonescapeMiniModelProperties;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        synchronize();
    }

    public void synchronize() {
        String configuredEndpointUrl = nonescapeMiniModelProperties.getEndpointUrl();
        if (!StringUtils.hasText(configuredEndpointUrl)) {
            return;
        }

        modelRegistryRepository.findByModelId(NONESCAPE_MINI_MODEL_ID)
                .filter(modelRegistry -> endpointChanged(modelRegistry, configuredEndpointUrl))
                .ifPresent(modelRegistry -> updateEndpoint(modelRegistry, configuredEndpointUrl));
    }

    private boolean endpointChanged(ModelRegistry modelRegistry, String configuredEndpointUrl) {
        return !Objects.equals(modelRegistry.getEndpointUrl(), configuredEndpointUrl);
    }

    private void updateEndpoint(ModelRegistry modelRegistry, String configuredEndpointUrl) {
        modelRegistry.updateEndpointUrl(configuredEndpointUrl, Instant.now());
        modelRegistryRepository.save(modelRegistry);
    }
}
