package com.fengting.aigcforensics.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;

import org.junit.jupiter.api.Test;

class JobOutboxEventTest {

    private static final Instant CREATED_AT = Instant.parse("2026-07-11T00:00:00Z");

    @Test
    void createsPendingDetectionEvent() {
        JobOutboxEvent event = newEvent();

        assertThat(event.getStatus()).isEqualTo(JobOutboxStatus.PENDING);
        assertThat(event.getAttemptCount()).isZero();
        assertThat(event.getAvailableAt()).isEqualTo(CREATED_AT);
        assertThat(event.getPayloadJson()).isEqualTo("{\"taskId\":\"task-001\"}");
    }

    @Test
    void claimsPendingEventWhenAvailable() {
        JobOutboxEvent event = newEvent();
        Instant claimedAt = CREATED_AT.plusSeconds(1);

        event.claim(claimedAt);

        assertThat(event.getStatus()).isEqualTo(JobOutboxStatus.PUBLISHING);
        assertThat(event.getAttemptCount()).isEqualTo(1);
        assertThat(event.getUpdatedAt()).isEqualTo(claimedAt);
    }

    @Test
    void rejectsClaimBeforeAvailableTime() {
        JobOutboxEvent event = newEvent();
        event.claim(CREATED_AT);
        event.markPublishFailed("redis unavailable", CREATED_AT.plusSeconds(10), 5, CREATED_AT.plusSeconds(1));

        assertThatThrownBy(() -> event.claim(CREATED_AT.plusSeconds(5)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("not available");
    }

    @Test
    void marksPublishedEvent() {
        JobOutboxEvent event = claimedEvent();
        Instant publishedAt = CREATED_AT.plusSeconds(2);

        event.markPublished(publishedAt);

        assertThat(event.getStatus()).isEqualTo(JobOutboxStatus.PUBLISHED);
        assertThat(event.getPublishedAt()).isEqualTo(publishedAt);
        assertThat(event.getLastError()).isNull();
    }

    @Test
    void schedulesRetryAfterPublishFailure() {
        JobOutboxEvent event = claimedEvent();
        Instant failedAt = CREATED_AT.plusSeconds(2);
        Instant retryAt = CREATED_AT.plusSeconds(10);

        event.markPublishFailed("redis unavailable", retryAt, 5, failedAt);

        assertThat(event.getStatus()).isEqualTo(JobOutboxStatus.PENDING);
        assertThat(event.getAvailableAt()).isEqualTo(retryAt);
        assertThat(event.getLastError()).isEqualTo("redis unavailable");
        assertThat(event.getUpdatedAt()).isEqualTo(failedAt);
    }

    @Test
    void marksEventFailedAfterRetryBudgetIsExhausted() {
        JobOutboxEvent event = newEvent();
        for (int attempt = 1; attempt <= 5; attempt++) {
            Instant attemptedAt = CREATED_AT.plusSeconds(attempt);
            event.claim(attemptedAt);
            event.markPublishFailed("redis unavailable", attemptedAt.plusSeconds(1), 5, attemptedAt);
        }

        assertThat(event.getStatus()).isEqualTo(JobOutboxStatus.FAILED);
        assertThat(event.getAttemptCount()).isEqualTo(5);
    }

    @Test
    void recoversStalePublishingEvent() {
        JobOutboxEvent event = claimedEvent();
        Instant recoveredAt = CREATED_AT.plusSeconds(60);

        event.recoverStaleClaim(recoveredAt);

        assertThat(event.getStatus()).isEqualTo(JobOutboxStatus.PENDING);
        assertThat(event.getAvailableAt()).isEqualTo(recoveredAt);
        assertThat(event.getLastError()).contains("stale");
    }

    @Test
    void replaysTerminalEvent() {
        JobOutboxEvent event = claimedEvent();
        event.markPublished(CREATED_AT.plusSeconds(2));
        Instant replayedAt = CREATED_AT.plusSeconds(3);

        event.replay(replayedAt);

        assertThat(event.getStatus()).isEqualTo(JobOutboxStatus.PENDING);
        assertThat(event.getAttemptCount()).isZero();
        assertThat(event.getAvailableAt()).isEqualTo(replayedAt);
        assertThat(event.getPublishedAt()).isNull();
    }

    private JobOutboxEvent claimedEvent() {
        JobOutboxEvent event = newEvent();
        event.claim(CREATED_AT.plusSeconds(1));
        return event;
    }

    private JobOutboxEvent newEvent() {
        return JobOutboxEvent.detectionRequested(
                "event-001",
                "task-001",
                "{\"taskId\":\"task-001\"}",
                CREATED_AT);
    }
}
