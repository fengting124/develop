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
import jakarta.persistence.Version;

@Entity
@Table(name = "job_outbox")
public class JobOutboxEvent {

    private static final int MAX_ERROR_LENGTH = 2048;
    private static final String DETECTION_AGGREGATE_TYPE = "DETECTION_TASK";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false, unique = true, length = 64)
    private String eventId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 64)
    private JobOutboxEventType eventType;

    @Column(name = "aggregate_type", nullable = false, length = 64)
    private String aggregateType;

    @Column(name = "aggregate_id", nullable = false, length = 64)
    private String aggregateId;

    @Column(name = "payload_json", nullable = false, columnDefinition = "text")
    private String payloadJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private JobOutboxStatus status;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount;

    @Column(name = "available_at")
    private Instant availableAt;

    @Column(name = "last_error", length = MAX_ERROR_LENGTH)
    private String lastError;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Version
    @Column(name = "lock_version", nullable = false)
    private long lockVersion;

    protected JobOutboxEvent() {
    }

    private JobOutboxEvent(
            String eventId,
            JobOutboxEventType eventType,
            String aggregateType,
            String aggregateId,
            String payloadJson,
            Instant now) {
        this.eventId = requireText(eventId, "eventId");
        this.eventType = eventType;
        this.aggregateType = requireText(aggregateType, "aggregateType");
        this.aggregateId = requireText(aggregateId, "aggregateId");
        this.payloadJson = requireText(payloadJson, "payloadJson");
        this.status = JobOutboxStatus.PENDING;
        this.availableAt = now;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static JobOutboxEvent detectionRequested(
            String eventId,
            String taskId,
            String payloadJson,
            Instant now) {
        return new JobOutboxEvent(
                eventId,
                JobOutboxEventType.DETECTION_REQUESTED,
                DETECTION_AGGREGATE_TYPE,
                taskId,
                payloadJson,
                now);
    }

    public void claim(Instant claimedAt) {
        requireStatus(JobOutboxStatus.PENDING, "claim");
        if (availableAt == null || availableAt.isAfter(claimedAt)) {
            throw new InvalidJobOutboxStateException(
                    "Outbox event is not available for publishing: " + eventId);
        }
        status = JobOutboxStatus.PUBLISHING;
        attemptCount++;
        updatedAt = claimedAt;
    }

    public void markPublished(Instant completedAt) {
        requireStatus(JobOutboxStatus.PUBLISHING, "mark published");
        status = JobOutboxStatus.PUBLISHED;
        publishedAt = completedAt;
        availableAt = null;
        lastError = null;
        updatedAt = completedAt;
    }

    public void markPublishFailed(String error, Instant retryAt, int maxAttempts, Instant failedAt) {
        requireStatus(JobOutboxStatus.PUBLISHING, "mark publish failed");
        if (maxAttempts < 1) {
            throw new IllegalArgumentException("maxAttempts must be at least 1");
        }
        lastError = truncateError(error);
        updatedAt = failedAt;
        if (attemptCount >= maxAttempts) {
            status = JobOutboxStatus.FAILED;
            availableAt = null;
            return;
        }
        status = JobOutboxStatus.PENDING;
        availableAt = retryAt;
    }

    public void recoverStaleClaim(Instant recoveredAt) {
        requireStatus(JobOutboxStatus.PUBLISHING, "recover stale claim");
        status = JobOutboxStatus.PENDING;
        availableAt = recoveredAt;
        lastError = "Recovered stale publishing claim";
        updatedAt = recoveredAt;
    }

    public void replay(Instant replayedAt) {
        if (status != JobOutboxStatus.PUBLISHED && status != JobOutboxStatus.FAILED) {
            throw new InvalidJobOutboxStateException(
                    "Only terminal outbox events can be replayed: " + eventId);
        }
        status = JobOutboxStatus.PENDING;
        attemptCount = 0;
        availableAt = replayedAt;
        lastError = null;
        publishedAt = null;
        updatedAt = replayedAt;
    }

    private void requireStatus(JobOutboxStatus expected, String action) {
        if (status != expected) {
            throw new InvalidJobOutboxStateException(
                    "Cannot " + action + " outbox event " + eventId + " while status is " + status);
        }
    }

    private static String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " must not be blank");
        }
        return value;
    }

    private String truncateError(String error) {
        String message = error == null || error.isBlank() ? "Unknown publish failure" : error;
        return message.length() <= MAX_ERROR_LENGTH ? message : message.substring(0, MAX_ERROR_LENGTH);
    }

    public Long getId() {
        return id;
    }

    public String getEventId() {
        return eventId;
    }

    public JobOutboxEventType getEventType() {
        return eventType;
    }

    public String getAggregateType() {
        return aggregateType;
    }

    public String getAggregateId() {
        return aggregateId;
    }

    public String getPayloadJson() {
        return payloadJson;
    }

    public JobOutboxStatus getStatus() {
        return status;
    }

    public int getAttemptCount() {
        return attemptCount;
    }

    public Instant getAvailableAt() {
        return availableAt;
    }

    public String getLastError() {
        return lastError;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public long getLockVersion() {
        return lockVersion;
    }
}
