package com.fengting.aigcforensics.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.fengting.aigcforensics.dto.detection.CreateImageDetectionResponse;
import com.fengting.aigcforensics.dto.detection.DetectionDetailResponse;
import com.fengting.aigcforensics.dto.detection.DetectionHistoryItemResponse;
import com.fengting.aigcforensics.service.DetectionExecutionService;
import com.fengting.aigcforensics.service.DetectionJobService;
import com.fengting.aigcforensics.service.DetectionWorkflowService;

@RestController
@RequestMapping("/api/detections")
public class DetectionController {

    private final DetectionWorkflowService detectionWorkflowService;
    private final DetectionExecutionService detectionExecutionService;
    private final DetectionJobService detectionJobService;

    public DetectionController(
            DetectionWorkflowService detectionWorkflowService,
            DetectionExecutionService detectionExecutionService,
            DetectionJobService detectionJobService) {
        this.detectionWorkflowService = detectionWorkflowService;
        this.detectionExecutionService = detectionExecutionService;
        this.detectionJobService = detectionJobService;
    }

    @PostMapping("/images")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public CreateImageDetectionResponse createImageDetection(@RequestPart("file") MultipartFile file) {
        return detectionWorkflowService.createImageDetection(file);
    }

    @GetMapping
    public List<DetectionHistoryItemResponse> listDetections() {
        return detectionWorkflowService.listDetections();
    }

    @GetMapping("/{taskId}")
    public DetectionDetailResponse getDetection(@PathVariable String taskId) {
        return detectionWorkflowService.getDetection(taskId);
    }

    @PostMapping("/{taskId}/run")
    public DetectionDetailResponse runDetection(@PathVariable String taskId) {
        detectionExecutionService.runDetection(taskId);
        return detectionWorkflowService.getDetection(taskId);
    }

    @PostMapping("/{taskId}/run-async")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public DetectionDetailResponse runDetectionAsync(@PathVariable String taskId) {
        detectionJobService.submit(taskId);
        return detectionWorkflowService.getDetection(taskId);
    }
}
