package com.fengting.aigcforensics.evaluation.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.fengting.aigcforensics.evaluation.dto.CreateEvaluationRequest;
import com.fengting.aigcforensics.evaluation.dto.EvaluationDetailResponse;
import com.fengting.aigcforensics.evaluation.dto.EvaluationRunResponse;
import com.fengting.aigcforensics.evaluation.dto.EvaluationSampleResponse;
import com.fengting.aigcforensics.evaluation.service.EvaluationService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/evaluations")
public class EvaluationController {

    private final EvaluationService evaluationService;

    public EvaluationController(EvaluationService evaluationService) {
        this.evaluationService = evaluationService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EvaluationRunResponse createEvaluation(@Valid @RequestBody CreateEvaluationRequest request) {
        return evaluationService.createEvaluation(request);
    }

    @GetMapping
    public List<EvaluationRunResponse> listEvaluations() {
        return evaluationService.listEvaluations();
    }

    @GetMapping("/{evaluationId}")
    public EvaluationDetailResponse getEvaluation(@PathVariable String evaluationId) {
        return evaluationService.getEvaluation(evaluationId);
    }

    @GetMapping("/{evaluationId}/samples")
    public List<EvaluationSampleResponse> listSamples(
            @PathVariable String evaluationId,
            @RequestParam(required = false) Boolean correct) {
        return evaluationService.listSamples(evaluationId, correct);
    }
}
