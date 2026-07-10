package com.fengting.aigcforensics.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fengting.aigcforensics.config.JobOutboxProperties;
import com.fengting.aigcforensics.domain.JobOutboxEvent;
import com.fengting.aigcforensics.domain.JobOutboxEventType;
import com.fengting.aigcforensics.domain.JobOutboxStatus;
import com.fengting.aigcforensics.repository.JobOutboxEventRepository;

@ExtendWith(MockitoExtension.class)
class JobOutboxServiceTest {

    private static final Instant NOW = Instant.parse("2026-07-11T00:00:00Z");

    @Mock
    private JobOutboxEventRepository repository;

    private JobOutboxService service;

    @BeforeEach
    void setUp() {
        JobOutboxProperties properties = new JobOutboxProperties();
        properties.setStaleAfter(Duration.ofMinutes(1));
        properties.setMaxAttempts(5);
        properties.setBaseRetryDelay(Duration.ofSeconds(1));
        properties.setMaxRetryDelay(Duration.ofMinutes(1));
        service = new JobOutboxService(
                repository,
                new ObjectMapper(),
                properties,
                Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void schedulesNewDetectionEvent() {
        when(repository.findByEventTypeAndAggregateId(
                JobOutboxEventType.DETECTION_REQUESTED,
                "task-001"))
                .thenReturn(Optional.empty());
        when(repository.save(any(JobOutboxEvent.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        JobOutboxEvent scheduled = service.scheduleDetection("task-001");

        assertThat(scheduled.getEventId()).startsWith("event_");
        assertThat(scheduled.getStatus()).isEqualTo(JobOutboxStatus.PENDING);
        assertThat(scheduled.getPayloadJson()).isEqualTo("{\"taskId\":\"task-001\"}");
    }

    @Test
    void reusesExistingDetectionEventForDuplicateSubmission() {
        JobOutboxEvent existing = event("event-001", "task-001");
        when(repository.findByEventTypeAndAggregateId(
                JobOutboxEventType.DETECTION_REQUESTED,
                "task-001"))
                .thenReturn(Optional.of(existing));

        assertThat(service.scheduleDetection("task-001")).isSameAs(existing);
        verify(repository, never()).save(any());
    }

    @Test
    void replaysTerminalEventForFailedTaskRetry() {
        JobOutboxEvent existing = event("event-001", "task-001");
        existing.claim(NOW);
        existing.markPublished(NOW);
        when(repository.findByEventTypeAndAggregateId(
                JobOutboxEventType.DETECTION_REQUESTED,
                "task-001"))
                .thenReturn(Optional.of(existing));

        JobOutboxEvent replayed = service.replayDetection("task-001");

        assertThat(replayed.getStatus()).isEqualTo(JobOutboxStatus.PENDING);
        assertThat(replayed.getAvailableAt()).isEqualTo(NOW);
    }

    @Test
    void recoversStaleClaimAndClaimsOldestAvailableEvent() {
        JobOutboxEvent stale = event("event-stale", "task-stale");
        stale.claim(NOW.minusSeconds(120));
        JobOutboxEvent pending = event("event-next", "task-next");
        when(repository.findStalePublishing(
                eq(JobOutboxStatus.PUBLISHING),
                eq(NOW.minusSeconds(60)),
                any(Pageable.class)))
                .thenReturn(List.of(stale));
        when(repository.findClaimable(
                eq(JobOutboxStatus.PENDING),
                eq(NOW),
                any(Pageable.class)))
                .thenReturn(List.of(pending));

        Optional<JobOutboxEvent> claimed = service.claimNext();

        assertThat(stale.getStatus()).isEqualTo(JobOutboxStatus.PENDING);
        assertThat(claimed).contains(pending);
        assertThat(pending.getStatus()).isEqualTo(JobOutboxStatus.PUBLISHING);
    }

    @Test
    void recordsRetryWithBackoffAfterPublishFailure() {
        JobOutboxEvent event = event("event-001", "task-001");
        event.claim(NOW);
        when(repository.findByEventIdForUpdate("event-001")).thenReturn(Optional.of(event));

        service.markPublishFailed("event-001", "redis unavailable");

        assertThat(event.getStatus()).isEqualTo(JobOutboxStatus.PENDING);
        assertThat(event.getAvailableAt()).isAfter(NOW);
        assertThat(event.getLastError()).isEqualTo("redis unavailable");
    }

    @Test
    void marksClaimedEventPublished() {
        JobOutboxEvent event = event("event-001", "task-001");
        event.claim(NOW);
        when(repository.findByEventIdForUpdate("event-001")).thenReturn(Optional.of(event));

        service.markPublished("event-001");

        assertThat(event.getStatus()).isEqualTo(JobOutboxStatus.PUBLISHED);
        assertThat(event.getPublishedAt()).isEqualTo(NOW);
    }

    private JobOutboxEvent event(String eventId, String taskId) {
        return JobOutboxEvent.detectionRequested(
                eventId,
                taskId,
                "{\"taskId\":\"" + taskId + "\"}",
                NOW.minusSeconds(180));
    }
}
