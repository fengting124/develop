package com.fengting.aigcforensics.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;

import org.junit.jupiter.api.Test;

class DetectionTaskTest {

    private static final Instant NOW = Instant.parse("2026-07-11T00:00:00Z");

    @Test
    void claimsQueuedTaskAndRecordsAttemptLease() {
        DetectionTask task = queuedTask();

        boolean claimed = task.claimExecution("attempt-1", NOW, NOW.plusSeconds(60));

        assertThat(claimed).isTrue();
        assertThat(task.getStatus()).isEqualTo(DetectionStatus.INFERENCING);
        assertThat(task.getExecutionToken()).isEqualTo("attempt-1");
        assertThat(task.getExecutionLeaseUntil()).isEqualTo(NOW.plusSeconds(60));
        assertThat(task.getExecutionAttemptCount()).isEqualTo(1);
    }

    @Test
    void rejectsClaimWhileExecutionLeaseIsLive() {
        DetectionTask task = queuedTask();
        task.claimExecution("attempt-1", NOW, NOW.plusSeconds(60));

        boolean claimed = task.claimExecution(
                "attempt-2",
                NOW.plusSeconds(30),
                NOW.plusSeconds(90));

        assertThat(claimed).isFalse();
        assertThat(task.getExecutionToken()).isEqualTo("attempt-1");
        assertThat(task.getExecutionAttemptCount()).isEqualTo(1);
    }

    @Test
    void reclaimsExpiredExecutionWithNewFencingToken() {
        DetectionTask task = queuedTask();
        task.claimExecution("attempt-1", NOW, NOW.plusSeconds(60));

        boolean claimed = task.claimExecution(
                "attempt-2",
                NOW.plusSeconds(61),
                NOW.plusSeconds(121));

        assertThat(claimed).isTrue();
        assertThat(task.getExecutionToken()).isEqualTo("attempt-2");
        assertThat(task.getExecutionAttemptCount()).isEqualTo(2);
    }

    @Test
    void staleAttemptCannotCompleteOrFailNewerExecution() {
        DetectionTask task = queuedTask();
        task.claimExecution("attempt-1", NOW, NOW.plusSeconds(60));
        task.claimExecution("attempt-2", NOW.plusSeconds(61), NOW.plusSeconds(121));

        assertThat(task.completeExecution("attempt-1", NOW.plusSeconds(70))).isFalse();
        assertThat(task.failExecution("attempt-1", "late failure", NOW.plusSeconds(70))).isFalse();
        assertThat(task.getStatus()).isEqualTo(DetectionStatus.INFERENCING);
        assertThat(task.getExecutionToken()).isEqualTo("attempt-2");
    }

    @Test
    void matchingAttemptCompletesAndClearsLease() {
        DetectionTask task = queuedTask();
        task.claimExecution("attempt-1", NOW, NOW.plusSeconds(60));

        boolean completed = task.completeExecution("attempt-1", NOW.plusSeconds(10));

        assertThat(completed).isTrue();
        assertThat(task.getStatus()).isEqualTo(DetectionStatus.COMPLETED);
        assertThat(task.getExecutionToken()).isNull();
        assertThat(task.getExecutionLeaseUntil()).isNull();
    }

    @Test
    void completedTaskCannotBeClaimedAgain() {
        DetectionTask task = queuedTask();
        task.markCompleted(NOW);

        assertThat(task.claimExecution("attempt-1", NOW, NOW.plusSeconds(60))).isFalse();
    }

    private DetectionTask queuedTask() {
        return new DetectionTask("task-1", "asset-1", DetectionStatus.QUEUED, NOW.minusSeconds(10));
    }
}
