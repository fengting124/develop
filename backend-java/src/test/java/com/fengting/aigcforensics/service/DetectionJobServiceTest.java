package com.fengting.aigcforensics.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
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

    @Mock
    private JobOutboxService jobOutboxService;

    @Test
    void submitsQueuedTaskToQueue() {
        DetectionTask task = task("task-001", DetectionStatus.QUEUED);
        when(detectionTaskRepository.findByTaskId("task-001")).thenReturn(Optional.of(task));

        DetectionTask submitted = new DetectionJobService(
                detectionTaskRepository,
                jobOutboxService).submit("task-001");

        assertThat(submitted).isSameAs(task);
        verify(jobOutboxService).scheduleDetection("task-001");
    }

    @Test
    void doesNotSubmitCompletedTask() {
        DetectionTask task = task("task-001", DetectionStatus.QUEUED);
        task.markCompleted(Instant.parse("2026-07-07T00:00:01Z"));
        when(detectionTaskRepository.findByTaskId("task-001")).thenReturn(Optional.of(task));

        new DetectionJobService(detectionTaskRepository, jobOutboxService)
                .submit("task-001");

        verify(jobOutboxService, never()).scheduleDetection("task-001");
        verify(jobOutboxService, never()).replayDetection("task-001");
    }

    @Test
    void submitsFailedTaskForManualRetry() {
        DetectionTask task = task("task-001", DetectionStatus.QUEUED);
        task.markFailed("temporary model outage", Instant.parse("2026-07-07T00:00:01Z"));
        when(detectionTaskRepository.findByTaskId("task-001")).thenReturn(Optional.of(task));

        new DetectionJobService(detectionTaskRepository, jobOutboxService)
                .submit("task-001");

        verify(jobOutboxService).replayDetection("task-001");
    }

    private DetectionTask task(String taskId, DetectionStatus status) {
        return new DetectionTask(
                taskId,
                "asset-001",
                status,
                Instant.parse("2026-07-07T00:00:00Z"));
    }
}
