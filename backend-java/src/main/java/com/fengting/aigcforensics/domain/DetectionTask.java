package com.fengting.aigcforensics.domain;

import java.time.Instant;

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
    }

    public void markFailed(String failureReason, Instant completedAt) {
        this.status = DetectionStatus.FAILED;
        this.failureReason = failureReason;
        this.completedAt = completedAt;
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
}
