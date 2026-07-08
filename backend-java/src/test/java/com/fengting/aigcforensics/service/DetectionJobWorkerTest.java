package com.fengting.aigcforensics.service;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DetectionJobWorkerTest {

    @Mock
    private DetectionJobConsumer detectionJobConsumer;

    @Mock
    private DetectionExecutionService detectionExecutionService;

    @Test
    void pollsJobRunsDetectionAndAcknowledgesMessage() {
        DetectionJobMessage message = new DetectionJobMessage("message-001", "task-001");
        when(detectionJobConsumer.poll()).thenReturn(Optional.of(message));

        new DetectionJobWorker(detectionJobConsumer, detectionExecutionService).pollOnce();

        verify(detectionExecutionService).runDetection("task-001");
        verify(detectionJobConsumer).acknowledge(message);
    }

    @Test
    void skipsWorkWhenNoJobIsAvailable() {
        when(detectionJobConsumer.poll()).thenReturn(Optional.empty());

        new DetectionJobWorker(detectionJobConsumer, detectionExecutionService).pollOnce();

        verify(detectionExecutionService, never()).runDetection("task-001");
    }
}
