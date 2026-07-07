package com.fengting.aigcforensics.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.fengting.aigcforensics.domain.DetectionStatus;
import com.fengting.aigcforensics.domain.DetectionTask;
import com.fengting.aigcforensics.repository.DetectionTaskRepository;

@ExtendWith(MockitoExtension.class)
class DetectionJobServiceTest {

    @Mock
    private DetectionTaskRepository detectionTaskRepository;

    @Test
    void submitsQueuedTaskToQueue() {
        CapturingDetectionJobQueue jobQueue = new CapturingDetectionJobQueue();
        DetectionTask task = task("task-001", DetectionStatus.QUEUED);
        when(detectionTaskRepository.findByTaskId("task-001")).thenReturn(Optional.of(task));

        DetectionTask submitted = new DetectionJobService(
                detectionTaskRepository,
                jobQueue).submit("task-001");

        assertThat(submitted).isSameAs(task);
        assertThat(jobQueue.taskIds).containsExactly("task-001");
    }

    @Test
    void doesNotSubmitCompletedTask() {
        CapturingDetectionJobQueue jobQueue = new CapturingDetectionJobQueue();
        DetectionTask task = task("task-001", DetectionStatus.QUEUED);
        task.markCompleted(Instant.parse("2026-07-07T00:00:01Z"));
        when(detectionTaskRepository.findByTaskId("task-001")).thenReturn(Optional.of(task));

        new DetectionJobService(detectionTaskRepository, jobQueue)
                .submit("task-001");

        assertThat(jobQueue.taskIds).isEmpty();
    }

    @Test
    void submitsFailedTaskForManualRetry() {
        CapturingDetectionJobQueue jobQueue = new CapturingDetectionJobQueue();
        DetectionTask task = task("task-001", DetectionStatus.QUEUED);
        task.markFailed("temporary model outage", Instant.parse("2026-07-07T00:00:01Z"));
        when(detectionTaskRepository.findByTaskId("task-001")).thenReturn(Optional.of(task));

        new DetectionJobService(detectionTaskRepository, jobQueue)
                .submit("task-001");

        assertThat(jobQueue.taskIds).containsExactly("task-001");
    }

    private DetectionTask task(String taskId, DetectionStatus status) {
        return new DetectionTask(
                taskId,
                "asset-001",
                status,
                Instant.parse("2026-07-07T00:00:00Z"));
    }

    private static class CapturingDetectionJobQueue implements DetectionJobQueue {

        private final List<String> taskIds = new ArrayList<>();

        @Override
        public void enqueue(String taskId) {
            taskIds.add(taskId);
        }
    }
}
