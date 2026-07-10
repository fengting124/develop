package com.fengting.aigcforensics.service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fengting.aigcforensics.config.JobOutboxProperties;
import com.fengting.aigcforensics.domain.JobOutboxEvent;
import com.fengting.aigcforensics.domain.JobOutboxEventType;
import com.fengting.aigcforensics.domain.JobOutboxStatus;
import com.fengting.aigcforensics.repository.JobOutboxEventRepository;

@Service
public class JobOutboxService {

    private static final int STALE_RECOVERY_BATCH_SIZE = 100;

    private final JobOutboxEventRepository repository;
    private final ObjectMapper objectMapper;
    private final JobOutboxProperties properties;
    private final OutboxBackoffPolicy backoffPolicy;
    private final Clock clock;

    @Autowired
    public JobOutboxService(
            JobOutboxEventRepository repository,
            ObjectMapper objectMapper,
            JobOutboxProperties properties) {
        this(repository, objectMapper, properties, Clock.systemUTC());
    }

    JobOutboxService(
            JobOutboxEventRepository repository,
            ObjectMapper objectMapper,
            JobOutboxProperties properties,
            Clock clock) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.properties = properties;
        this.backoffPolicy = new OutboxBackoffPolicy(
                properties.getBaseRetryDelay(),
                properties.getMaxRetryDelay());
        this.clock = clock;
    }

    @Transactional
    public JobOutboxEvent scheduleDetection(String taskId) {
        return repository.findByEventTypeAndAggregateId(
                        JobOutboxEventType.DETECTION_REQUESTED,
                        taskId)
                .orElseGet(() -> repository.save(newDetectionEvent(taskId)));
    }

    @Transactional
    public JobOutboxEvent replayDetection(String taskId) {
        Optional<JobOutboxEvent> existing = repository.findByEventTypeAndAggregateId(
                JobOutboxEventType.DETECTION_REQUESTED,
                taskId);
        if (existing.isEmpty()) {
            return repository.save(newDetectionEvent(taskId));
        }
        JobOutboxEvent event = existing.get();
        if (event.getStatus() == JobOutboxStatus.PUBLISHED || event.getStatus() == JobOutboxStatus.FAILED) {
            event.replay(Instant.now(clock));
        }
        return event;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Optional<JobOutboxEvent> claimNext() {
        Instant now = Instant.now(clock);
        Instant staleBefore = now.minus(properties.getStaleAfter());
        repository.findStalePublishing(
                        JobOutboxStatus.PUBLISHING,
                        staleBefore,
                        PageRequest.of(0, STALE_RECOVERY_BATCH_SIZE))
                .forEach(event -> event.recoverStaleClaim(now));

        List<JobOutboxEvent> candidates = repository.findClaimable(
                JobOutboxStatus.PENDING,
                now,
                PageRequest.of(0, 1));
        if (candidates.isEmpty()) {
            return Optional.empty();
        }
        JobOutboxEvent event = candidates.get(0);
        event.claim(now);
        return Optional.of(event);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markPublished(String eventId) {
        JobOutboxEvent event = findForUpdate(eventId);
        event.markPublished(Instant.now(clock));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markPublishFailed(String eventId, String error) {
        JobOutboxEvent event = findForUpdate(eventId);
        Instant now = Instant.now(clock);
        Instant retryAt = now.plus(backoffPolicy.delay(eventId, event.getAttemptCount()));
        event.markPublishFailed(error, retryAt, properties.getMaxAttempts(), now);
    }

    @Transactional
    public JobOutboxEvent replay(String eventId) {
        JobOutboxEvent event = findForUpdate(eventId);
        event.replay(Instant.now(clock));
        return event;
    }

    @Transactional(readOnly = true)
    public List<JobOutboxEvent> list(JobOutboxStatus status, int limit) {
        return repository.findByStatusOrderByCreatedAtDesc(status, PageRequest.of(0, limit));
    }

    private JobOutboxEvent newDetectionEvent(String taskId) {
        Instant now = Instant.now(clock);
        return JobOutboxEvent.detectionRequested(
                newExternalId("event"),
                taskId,
                serializePayload(new DetectionRequestedPayload(taskId)),
                now);
    }

    private String serializePayload(DetectionRequestedPayload payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize outbox payload", exception);
        }
    }

    private JobOutboxEvent findForUpdate(String eventId) {
        return repository.findByEventIdForUpdate(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Outbox event not found: " + eventId));
    }

    private String newExternalId(String prefix) {
        return prefix + "_" + UUID.randomUUID().toString().replace("-", "");
    }

    private record DetectionRequestedPayload(String taskId) {
    }
}
