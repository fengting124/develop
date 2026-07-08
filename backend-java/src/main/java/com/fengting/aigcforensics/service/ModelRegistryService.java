package com.fengting.aigcforensics.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fengting.aigcforensics.domain.ModelRegistry;
import com.fengting.aigcforensics.dto.model.ModelSummaryResponse;
import com.fengting.aigcforensics.repository.ModelRegistryRepository;

@Service
public class ModelRegistryService {

    private final ModelRegistryRepository modelRegistryRepository;

    public ModelRegistryService(ModelRegistryRepository modelRegistryRepository) {
        this.modelRegistryRepository = modelRegistryRepository;
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
