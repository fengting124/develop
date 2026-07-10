package com.fengting.aigcforensics.service;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.fengting.aigcforensics.domain.JobOutboxEvent;

@ExtendWith(MockitoExtension.class)
class JobOutboxDispatcherTest {

    @Mock
    private JobOutboxService outboxService;

    @Mock
    private JobOutboxPublisher publisher;

    @Test
    void marksClaimedEventPublishedAfterQueueAcceptsIt() {
        JobOutboxEvent event = event();
        when(outboxService.claimNext()).thenReturn(Optional.of(event));

        new JobOutboxDispatcher(outboxService, publisher).pollOnce();

        verify(publisher).publish(event);
        verify(outboxService).markPublished("event-001");
        verify(outboxService, never()).markPublishFailed("event-001", "redis unavailable");
    }

    @Test
    void recordsRetryableFailureWhenPublishThrows() {
        JobOutboxEvent event = event();
        when(outboxService.claimNext()).thenReturn(Optional.of(event));
        doThrow(new IllegalStateException("redis unavailable")).when(publisher).publish(event);

        new JobOutboxDispatcher(outboxService, publisher).pollOnce();

        verify(outboxService).markPublishFailed("event-001", "redis unavailable");
        verify(outboxService, never()).markPublished("event-001");
    }

    @Test
    void doesNothingWhenNoEventIsAvailable() {
        when(outboxService.claimNext()).thenReturn(Optional.empty());

        new JobOutboxDispatcher(outboxService, publisher).pollOnce();

        verifyNoInteractions(publisher);
    }

    private JobOutboxEvent event() {
        return JobOutboxEvent.detectionRequested(
                "event-001",
                "task-001",
                "{\"taskId\":\"task-001\"}",
                Instant.parse("2026-07-11T00:00:00Z"));
    }
}
