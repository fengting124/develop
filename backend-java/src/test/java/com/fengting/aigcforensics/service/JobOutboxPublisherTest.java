package com.fengting.aigcforensics.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;

import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fengting.aigcforensics.domain.JobOutboxEvent;

@ExtendWith(MockitoExtension.class)
class JobOutboxPublisherTest {

    @Mock
    private DetectionJobQueue detectionJobQueue;

    @Test
    void publishesDetectionRequestedEvent() {
        JobOutboxEvent event = event("{\"taskId\":\"task-001\"}");
        JobOutboxPublisher publisher = new JobOutboxPublisher(detectionJobQueue, new ObjectMapper());

        publisher.publish(event);

        ArgumentCaptor<DetectionJobRequest> requestCaptor = ArgumentCaptor.forClass(DetectionJobRequest.class);
        verify(detectionJobQueue).enqueue(requestCaptor.capture());
        assertThat(requestCaptor.getValue()).isEqualTo(new DetectionJobRequest(
                "event-001",
                1,
                "task-001",
                Instant.parse("2026-07-11T00:00:00Z")));
    }

    @Test
    void rejectsMalformedDetectionPayload() {
        JobOutboxPublisher publisher = new JobOutboxPublisher(detectionJobQueue, new ObjectMapper());

        assertThatThrownBy(() -> publisher.publish(event("not-json")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("payload");
    }

    @Test
    void rejectsPayloadForDifferentAggregate() {
        JobOutboxPublisher publisher = new JobOutboxPublisher(detectionJobQueue, new ObjectMapper());

        assertThatThrownBy(() -> publisher.publish(event("{\"taskId\":\"task-other\"}")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("aggregate");
    }

    private JobOutboxEvent event(String payloadJson) {
        return JobOutboxEvent.detectionRequested(
                "event-001",
                "task-001",
                payloadJson,
                Instant.parse("2026-07-11T00:00:00Z"));
    }
}
