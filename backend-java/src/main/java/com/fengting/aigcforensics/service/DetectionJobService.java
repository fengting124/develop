package com.fengting.aigcforensics.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fengting.aigcforensics.domain.DetectionStatus;
import com.fengting.aigcforensics.domain.DetectionTask;
import com.fengting.aigcforensics.repository.DetectionTaskRepository;

@Service
public class DetectionJobService {

    private final DetectionTaskRepository detectionTaskRepository;
    private final JobOutboxService jobOutboxService;

    public DetectionJobService(
            DetectionTaskRepository detectionTaskRepository,
            JobOutboxService jobOutboxService) {
        this.detectionTaskRepository = detectionTaskRepository;
        this.jobOutboxService = jobOutboxService;
    }

    @Transactional
    public DetectionTask submit(String taskId) {
        DetectionTask task = detectionTaskRepository.findByTaskId(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Detection task not found: " + taskId));
        if (task.getStatus() == DetectionStatus.QUEUED) {
            jobOutboxService.scheduleDetection(taskId);
        } else if (task.getStatus() == DetectionStatus.FAILED) {
            jobOutboxService.replayDetection(taskId);
        }
        return task;
    }
}
