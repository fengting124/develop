package com.fengting.aigcforensics.service;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(
        prefix = "app.detection.jobs",
        name = "worker-enabled",
        havingValue = "true",
        matchIfMissing = true)
public class DetectionJobWorker {

    private final DetectionJobConsumer detectionJobConsumer;
    private final DetectionExecutionService detectionExecutionService;

    public DetectionJobWorker(
            DetectionJobConsumer detectionJobConsumer,
            DetectionExecutionService detectionExecutionService) {
        this.detectionJobConsumer = detectionJobConsumer;
        this.detectionExecutionService = detectionExecutionService;
    }

    @Scheduled(fixedDelayString = "${app.detection.jobs.poll-delay-ms:1000}")
    public void pollOnce() {
        detectionJobConsumer.poll().ifPresent(message -> {
            DetectionExecutionOutcome outcome = detectionExecutionService.runDetection(message.taskId());
            if (outcome.shouldAcknowledge()) {
                detectionJobConsumer.acknowledge(message);
            }
        });
    }
}
