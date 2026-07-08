package com.fengting.aigcforensics.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fengting.aigcforensics.dto.model.ModelSummaryResponse;
import com.fengting.aigcforensics.service.ModelRegistryService;

@RestController
@RequestMapping("/api/models")
public class ModelController {

    private final ModelRegistryService modelRegistryService;

    public ModelController(ModelRegistryService modelRegistryService) {
        this.modelRegistryService = modelRegistryService;
    }

    @GetMapping
    public List<ModelSummaryResponse> listModels() {
        return modelRegistryService.listModels();
    }
}
