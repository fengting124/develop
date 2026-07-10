package com.fengting.aigcforensics.service;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fengting.aigcforensics.domain.JobOutboxEvent;
import com.fengting.aigcforensics.domain.JobOutboxEventType;

@Service
public class JobOutboxPublisher {

    private static final int DETECTION_EVENT_VERSION = 1;

    private final DetectionJobQueue detectionJobQueue;
    private final ObjectMapper objectMapper;

    public JobOutboxPublisher(DetectionJobQueue detectionJobQueue, ObjectMapper objectMapper) {
        this.detectionJobQueue = detectionJobQueue;
        this.objectMapper = objectMapper;
    }

    public void publish(JobOutboxEvent event) {
        if (event.getEventType() != JobOutboxEventType.DETECTION_REQUESTED) {
            throw new IllegalArgumentException("Unsupported outbox event type: " + event.getEventType());
        }
        DetectionRequestedPayload payload = readDetectionPayload(event.getPayloadJson());
        if (!event.getAggregateId().equals(payload.taskId())) {
            throw new IllegalArgumentException(
                    "Outbox payload taskId does not match aggregate id: " + event.getEventId());
        }
        detectionJobQueue.enqueue(new DetectionJobRequest(
                event.getEventId(),
                DETECTION_EVENT_VERSION,
                payload.taskId(),
                event.getCreatedAt()));
    }

    private DetectionRequestedPayload readDetectionPayload(String payloadJson) {
        try {
            return objectMapper.readValue(payloadJson, DetectionRequestedPayload.class);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Invalid detection outbox payload", exception);
        }
    }

    private record DetectionRequestedPayload(String taskId) {
    }
}
