package com.fengting.aigcforensics.service;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.task.TaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fengting.aigcforensics.domain.DetectionStatus;
import com.fengting.aigcforensics.domain.DetectionTask;
import com.fengting.aigcforensics.repository.DetectionTaskRepository;

@Service
public class DetectionJobService {

    private final DetectionTaskRepository detectionTaskRepository;
    private final DetectionExecutionService detectionExecutionService;
    private final TaskExecutor taskExecutor;
    private final Set<String> runningTaskIds = ConcurrentHashMap.newKeySet();

    public DetectionJobService(
            DetectionTaskRepository detectionTaskRepository,
            DetectionExecutionService detectionExecutionService,
            @Qualifier("detectionJobTaskExecutor") TaskExecutor taskExecutor) {
        this.detectionTaskRepository = detectionTaskRepository;
        this.detectionExecutionService = detectionExecutionService;
        this.taskExecutor = taskExecutor;
    }

    @Transactional(readOnly = true)
    public DetectionTask submit(String taskId) {
        DetectionTask task = detectionTaskRepository.findByTaskId(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Detection task not found: " + taskId));
        if (task.getStatus() != DetectionStatus.QUEUED) {
            return task;
        }
        if (!runningTaskIds.add(taskId)) {
            return task;
        }

        taskExecutor.execute(() -> runAndRelease(taskId));
        return task;
    }

    private void runAndRelease(String taskId) {
        try {
            detectionExecutionService.runDetection(taskId);
        } finally {
            runningTaskIds.remove(taskId);
        }
    }
}
