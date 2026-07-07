package com.fengting.aigcforensics.controller;

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
import com.fengting.aigcforensics.service.DetectionWorkflowService;

@RestController
@RequestMapping("/api/detections")
public class DetectionController {

    private final DetectionWorkflowService detectionWorkflowService;

    public DetectionController(DetectionWorkflowService detectionWorkflowService) {
        this.detectionWorkflowService = detectionWorkflowService;
    }

    @PostMapping("/images")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public CreateImageDetectionResponse createImageDetection(@RequestPart("file") MultipartFile file) {
        return detectionWorkflowService.createImageDetection(file);
    }

    @GetMapping("/{taskId}")
    public DetectionDetailResponse getDetection(@PathVariable String taskId) {
        return detectionWorkflowService.getDetection(taskId);
    }
}
