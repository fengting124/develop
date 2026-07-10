package com.fengting.aigcforensics.domain;

import java.time.Instant;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "detection_task")
public class DetectionTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "task_id", nullable = false, unique = true, length = 64)
    private String taskId;

    @Column(name = "asset_id", nullable = false, length = 64)
    private String assetId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private DetectionStatus status;

    @Column(name = "failure_reason", length = 2048)
    private String failureReason;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "execution_token", length = 64)
    private String executionToken;

    @Column(name = "execution_lease_until")
    private Instant executionLeaseUntil;

    @Column(name = "execution_attempt_count", nullable = false)
    private int executionAttemptCount;

    protected DetectionTask() {
    }

    public DetectionTask(String taskId, String assetId, DetectionStatus status, Instant createdAt) {
        this.taskId = taskId;
        this.assetId = assetId;
        this.status = status;
        this.createdAt = createdAt;
    }

    public void markStarted(Instant startedAt) {
        this.status = DetectionStatus.INFERENCING;
        this.startedAt = startedAt;
    }

    public void markCompleted(Instant completedAt) {
        this.status = DetectionStatus.COMPLETED;
        this.completedAt = completedAt;
        clearExecutionOwnership();
    }

    public void markFailed(String failureReason, Instant completedAt) {
        this.status = DetectionStatus.FAILED;
        this.failureReason = failureReason;
        this.completedAt = completedAt;
        clearExecutionOwnership();
    }

    public boolean claimExecution(String token, Instant now, Instant leaseUntil) {
        requireValidClaim(token, now, leaseUntil);
        if (status == DetectionStatus.COMPLETED || hasLiveExecutionLease(now)) {
            return false;
        }

        status = DetectionStatus.INFERENCING;
        executionToken = token;
        executionLeaseUntil = leaseUntil;
        executionAttemptCount++;
        startedAt = now;
        completedAt = null;
        failureReason = null;
        return true;
    }

    public boolean completeExecution(String token, Instant completedAt) {
        if (!ownsExecution(token)) {
            return false;
        }
        markCompleted(Objects.requireNonNull(completedAt, "completedAt must not be null"));
        return true;
    }

    public boolean failExecution(String token, String reason, Instant completedAt) {
        if (!ownsExecution(token)) {
            return false;
        }
        markFailed(reason, Objects.requireNonNull(completedAt, "completedAt must not be null"));
        return true;
    }

    public boolean ownsExecution(String token) {
        return status == DetectionStatus.INFERENCING
                && executionToken != null
                && executionToken.equals(token);
    }

    private boolean hasLiveExecutionLease(Instant now) {
        return status == DetectionStatus.INFERENCING
                && executionLeaseUntil != null
                && executionLeaseUntil.isAfter(now);
    }

    private void requireValidClaim(String token, Instant now, Instant leaseUntil) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("execution token must not be blank");
        }
        Objects.requireNonNull(now, "now must not be null");
        Objects.requireNonNull(leaseUntil, "leaseUntil must not be null");
        if (!leaseUntil.isAfter(now)) {
            throw new IllegalArgumentException("execution lease must expire after claim time");
        }
    }

    private void clearExecutionOwnership() {
        executionToken = null;
        executionLeaseUntil = null;
    }

    public Long getId() {
        return id;
    }

    public String getTaskId() {
        return taskId;
    }

    public String getAssetId() {
        return assetId;
    }

    public DetectionStatus getStatus() {
        return status;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public String getExecutionToken() {
        return executionToken;
    }

    public Instant getExecutionLeaseUntil() {
        return executionLeaseUntil;
    }

    public int getExecutionAttemptCount() {
        return executionAttemptCount;
    }
}
