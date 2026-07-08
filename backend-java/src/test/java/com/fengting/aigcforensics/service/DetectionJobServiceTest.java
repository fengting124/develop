package com.fengting.aigcforensics.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.task.TaskExecutor;

import com.fengting.aigcforensics.domain.DetectionStatus;
import com.fengting.aigcforensics.domain.DetectionTask;
import com.fengting.aigcforensics.repository.DetectionTaskRepository;

@ExtendWith(MockitoExtension.class)
class DetectionJobServiceTest {

    @Mock
    private DetectionTaskRepository detectionTaskRepository;

    @Mock
    private DetectionExecutionService detectionExecutionService;

    @Test
    void submitsQueuedTaskToExecutor() {
        CapturingTaskExecutor taskExecutor = new CapturingTaskExecutor();
        DetectionTask task = task("task-001", DetectionStatus.QUEUED);
        when(detectionTaskRepository.findByTaskId("task-001")).thenReturn(Optional.of(task));

        DetectionTask submitted = new DetectionJobService(
                detectionTaskRepository,
                detectionExecutionService,
                taskExecutor).submit("task-001");

        assertThat(submitted).isSameAs(task);
        assertThat(taskExecutor.tasks).hasSize(1);

        taskExecutor.tasks.get(0).run();

        verify(detectionExecutionService).runDetection("task-001");
    }

    @Test
    void doesNotSubmitCompletedTask() {
        CapturingTaskExecutor taskExecutor = new CapturingTaskExecutor();
        DetectionTask task = task("task-001", DetectionStatus.QUEUED);
        task.markCompleted(Instant.parse("2026-07-07T00:00:01Z"));
        when(detectionTaskRepository.findByTaskId("task-001")).thenReturn(Optional.of(task));

        new DetectionJobService(detectionTaskRepository, detectionExecutionService, taskExecutor)
                .submit("task-001");

        assertThat(taskExecutor.tasks).isEmpty();
        verify(detectionExecutionService, never()).runDetection("task-001");
    }

    @Test
    void doesNotSubmitDuplicateRunningTask() {
        CapturingTaskExecutor taskExecutor = new CapturingTaskExecutor();
        DetectionTask task = task("task-001", DetectionStatus.QUEUED);
        when(detectionTaskRepository.findByTaskId("task-001")).thenReturn(Optional.of(task));
        DetectionJobService detectionJobService = new DetectionJobService(
                detectionTaskRepository,
                detectionExecutionService,
                taskExecutor);

        detectionJobService.submit("task-001");
        detectionJobService.submit("task-001");

        assertThat(taskExecutor.tasks).hasSize(1);
    }

    private DetectionTask task(String taskId, DetectionStatus status) {
        return new DetectionTask(
                taskId,
                "asset-001",
                status,
                Instant.parse("2026-07-07T00:00:00Z"));
    }

    private static class CapturingTaskExecutor implements TaskExecutor {

        private final List<Runnable> tasks = new ArrayList<>();

        @Override
        public void execute(Runnable task) {
            tasks.add(task);
        }
    }
}
