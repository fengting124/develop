package com.fengting.aigcforensics.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fengting.aigcforensics.domain.DetectionStatus;
import com.fengting.aigcforensics.domain.DetectionTask;
import com.fengting.aigcforensics.repository.DetectionTaskRepository;

@Service
public class DetectionJobService {

    private final DetectionTaskRepository detectionTaskRepository;
    private final DetectionJobQueue detectionJobQueue;

    public DetectionJobService(
            DetectionTaskRepository detectionTaskRepository,
            DetectionJobQueue detectionJobQueue) {
        this.detectionTaskRepository = detectionTaskRepository;
        this.detectionJobQueue = detectionJobQueue;
    }

    @Transactional(readOnly = true)
    public DetectionTask submit(String taskId) {
        DetectionTask task = detectionTaskRepository.findByTaskId(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Detection task not found: " + taskId));
        if (task.getStatus() != DetectionStatus.QUEUED && task.getStatus() != DetectionStatus.FAILED) {
            return task;
        }
        detectionJobQueue.enqueue(taskId);
        return task;
    }
}
