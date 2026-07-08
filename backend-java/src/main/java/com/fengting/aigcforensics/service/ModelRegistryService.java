package com.fengting.aigcforensics.service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fengting.aigcforensics.client.ModelInferenceClient;
import com.fengting.aigcforensics.client.ModelInferenceException;
import com.fengting.aigcforensics.domain.ModelRegistry;
import com.fengting.aigcforensics.dto.model.ModelHealthResponse;
import com.fengting.aigcforensics.dto.model.ModelSummaryResponse;
import com.fengting.aigcforensics.repository.ModelRegistryRepository;

@Service
public class ModelRegistryService {

    private final ModelRegistryRepository modelRegistryRepository;
    private final ModelInferenceClient modelInferenceClient;
    private final Clock clock;

    @Autowired
    public ModelRegistryService(
            ModelRegistryRepository modelRegistryRepository,
            ModelInferenceClient modelInferenceClient) {
        this(modelRegistryRepository, modelInferenceClient, Clock.systemUTC());
    }

    ModelRegistryService(
            ModelRegistryRepository modelRegistryRepository,
            ModelInferenceClient modelInferenceClient,
            Clock clock) {
        this.modelRegistryRepository = modelRegistryRepository;
        this.modelInferenceClient = modelInferenceClient;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<ModelSummaryResponse> listModels() {
        return modelRegistryRepository.findAll().stream()
                .map(this::toSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ModelSummaryResponse> listEnabledModels() {
        return modelRegistryRepository.findByEnabledTrueOrderByWeightDesc().stream()
                .map(this::toSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public ModelHealthResponse checkHealth(String modelId) {
        ModelRegistry model = modelRegistryRepository.findByModelId(modelId)
                .orElseThrow(() -> new ResourceNotFoundException("Model not found: " + modelId));
        Instant checkedAt = Instant.now(clock);
        try {
            modelInferenceClient.checkHealth(model.getEndpointUrl());
            return new ModelHealthResponse(
                    model.getModelId(),
                    model.getEndpointUrl(),
                    true,
                    "UP",
                    "Model service is reachable",
                    checkedAt);
        } catch (ModelInferenceException exception) {
            return new ModelHealthResponse(
                    model.getModelId(),
                    model.getEndpointUrl(),
                    false,
                    "DOWN",
                    exception.getMessage(),
                    checkedAt);
        }
    }

    private ModelSummaryResponse toSummary(ModelRegistry model) {
        return new ModelSummaryResponse(
                model.getModelId(),
                model.getDisplayName(),
                model.getModelType(),
                model.getVersion(),
                model.getEndpointUrl(),
                model.isEnabled(),
                model.getDefaultThreshold(),
                model.getWeight(),
                model.getDescription());
    }
}
