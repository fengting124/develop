package com.fengting.aigcforensics.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fengting.aigcforensics.dto.detection.DetectionDetailResponse;
import com.fengting.aigcforensics.service.DetectionWorkflowService;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final DetectionWorkflowService detectionWorkflowService;

    public ReportController(DetectionWorkflowService detectionWorkflowService) {
        this.detectionWorkflowService = detectionWorkflowService;
    }

    @GetMapping("/{reportId}")
    public DetectionDetailResponse getReport(@PathVariable String reportId) {
        return detectionWorkflowService.getReport(reportId);
    }
}
