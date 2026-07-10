package com.fengting.aigcforensics.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.RedisSystemException;
import org.springframework.data.redis.connection.RedisStreamCommands.XClaimOptions;
import org.springframework.data.redis.connection.stream.Consumer;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.PendingMessage;
import org.springframework.data.redis.connection.stream.PendingMessages;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.RecordId;
import org.springframework.data.redis.connection.stream.StreamReadOptions;
import org.springframework.data.redis.connection.stream.StreamRecords;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.domain.Range;
import org.springframework.data.redis.core.StreamOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import com.fengting.aigcforensics.config.DetectionJobRedisProperties;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("unchecked")
class RedisDetectionJobQueueTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private StreamOperations<String, Object, Object> streamOperations;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Test
    void enqueuesVersionedEventEnvelope() {
        DetectionJobRedisProperties properties = new DetectionJobRedisProperties();
        DetectionJobRequest request = request("event-001", "task-001");
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(
                properties.getSubmittedKeyPrefix() + "event-001",
                "1",
                properties.getSubmittedTtl()))
                .thenReturn(true);
        when(redisTemplate.opsForStream()).thenReturn(streamOperations);
        when(streamOperations.add(any(MapRecord.class))).thenReturn(RecordId.of("message-001"));

        new RedisDetectionJobQueue(redisTemplate, properties).enqueue(request);

        ArgumentCaptor<MapRecord<String, Object, Object>> recordCaptor = ArgumentCaptor.forClass(MapRecord.class);
        verify(streamOperations).add(recordCaptor.capture());
        assertThat(recordCaptor.getValue().getValue())
                .containsEntry("eventId", "event-001")
                .containsEntry("eventVersion", "1")
                .containsEntry("taskId", "task-001")
                .containsEntry("occurredAt", "2026-07-11T00:00:00Z");
    }

    @Test
    void doesNotEnqueueDuplicateEventId() {
        DetectionJobRedisProperties properties = new DetectionJobRedisProperties();
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(
                properties.getSubmittedKeyPrefix() + "event-001",
                "1",
                properties.getSubmittedTtl()))
                .thenReturn(false);

        new RedisDetectionJobQueue(redisTemplate, properties).enqueue(request("event-001", "task-001"));

        verify(redisTemplate, never()).opsForStream();
    }

    @Test
    void rejectsIndeterminateDeduplicationResult() {
        DetectionJobRedisProperties properties = new DetectionJobRedisProperties();
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(
                properties.getSubmittedKeyPrefix() + "event-001",
                "1",
                properties.getSubmittedTtl()))
                .thenReturn(null);

        assertThatThrownBy(() -> new RedisDetectionJobQueue(redisTemplate, properties)
                .enqueue(request("event-001", "task-001")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("deduplication");
        verify(redisTemplate, never()).opsForStream();
    }

    @Test
    void rejectsMissingStreamRecordIdAndReleasesDeduplicationKey() {
        DetectionJobRedisProperties properties = new DetectionJobRedisProperties();
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(
                properties.getSubmittedKeyPrefix() + "event-001",
                "1",
                properties.getSubmittedTtl()))
                .thenReturn(true);
        when(redisTemplate.opsForStream()).thenReturn(streamOperations);
        when(streamOperations.add(any(MapRecord.class))).thenReturn(null);

        assertThatThrownBy(() -> new RedisDetectionJobQueue(redisTemplate, properties)
                .enqueue(request("event-001", "task-001")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("record id");
        verify(redisTemplate).delete(properties.getSubmittedKeyPrefix() + "event-001");
    }

    @Test
    void returnsEmptyWhenPollingBeforeStreamExists() {
        DetectionJobRedisProperties properties = new DetectionJobRedisProperties();
        when(redisTemplate.opsForStream()).thenReturn(streamOperations);
        when(streamOperations.createGroup(
                eq(properties.getStreamKey()),
                any(ReadOffset.class),
                eq(properties.getGroupName())))
                .thenThrow(new RedisSystemException(
                        "ERR The XGROUP subcommand requires the key to exist.",
                        null));

        Optional<DetectionJobMessage> message = new RedisDetectionJobQueue(redisTemplate, properties).poll();

        assertThat(message).isEmpty();
        verify(streamOperations).createGroup(
                eq(properties.getStreamKey()),
                any(ReadOffset.class),
                eq(properties.getGroupName()));
    }

    @Test
    void claimsStalePendingMessageBeforeReadingNewMessages() {
        DetectionJobRedisProperties properties = new DetectionJobRedisProperties();
        properties.setPendingIdleTimeout(Duration.ofMinutes(5));
        PendingMessage pendingMessage = pendingMessage(properties, "message-001", Duration.ofMinutes(6), 2);
        MapRecord<String, Object, Object> claimedRecord = record(
                properties.getStreamKey(),
                "message-001",
                eventFields("event-001", "1", "task-001"));

        when(redisTemplate.opsForStream()).thenReturn(streamOperations);
        when(streamOperations.pending(
                eq(properties.getStreamKey()),
                eq(properties.getGroupName()),
                any(Range.class),
                eq((long) properties.getPendingClaimBatchSize())))
                .thenReturn(new PendingMessages(properties.getGroupName(), List.of(pendingMessage)));
        when(streamOperations.claim(
                eq(properties.getStreamKey()),
                eq(properties.getGroupName()),
                eq(properties.getConsumerName()),
                any(XClaimOptions.class)))
                .thenReturn(List.of(claimedRecord));

        Optional<DetectionJobMessage> message = new RedisDetectionJobQueue(redisTemplate, properties).poll();

        assertThat(message).contains(new DetectionJobMessage("message-001", "event-001", 1, "task-001"));
        verify(streamOperations, never()).read(
                any(Consumer.class),
                any(StreamReadOptions.class),
                any(StreamOffset.class));
    }

    @Test
    void movesOverDeliveredPendingMessageToDeadLetter() {
        DetectionJobRedisProperties properties = new DetectionJobRedisProperties();
        properties.setMaxDeliveryAttempts(3);
        PendingMessage pendingMessage = pendingMessage(properties, "message-001", Duration.ofMinutes(6), 3);
        MapRecord<String, Object, Object> claimedRecord = record(
                properties.getStreamKey(),
                "message-001",
                eventFields("event-001", "1", "task-001"));

        when(redisTemplate.opsForStream()).thenReturn(streamOperations);
        when(streamOperations.pending(
                eq(properties.getStreamKey()),
                eq(properties.getGroupName()),
                any(Range.class),
                eq((long) properties.getPendingClaimBatchSize())))
                .thenReturn(new PendingMessages(properties.getGroupName(), List.of(pendingMessage)));
        when(streamOperations.claim(
                eq(properties.getStreamKey()),
                eq(properties.getGroupName()),
                eq(properties.getConsumerName()),
                any(XClaimOptions.class)))
                .thenReturn(List.of(claimedRecord));

        Optional<DetectionJobMessage> message = new RedisDetectionJobQueue(redisTemplate, properties).poll();

        assertThat(message).isEmpty();
        ArgumentCaptor<MapRecord<String, Object, Object>> deadLetterRecordCaptor =
                ArgumentCaptor.forClass(MapRecord.class);
        verify(streamOperations).add(deadLetterRecordCaptor.capture());
        assertThat(deadLetterRecordCaptor.getValue().getStream()).isEqualTo(properties.getDeadLetterStreamKey());
        assertThat(deadLetterRecordCaptor.getValue().getValue())
                .containsEntry("eventId", "event-001")
                .containsEntry("taskId", "task-001")
                .containsEntry("originalMessageId", "message-001")
                .containsEntry("deliveryCount", "3");
        verify(streamOperations).acknowledge(
                properties.getStreamKey(),
                properties.getGroupName(),
                RecordId.of("message-001"));
    }

    @Test
    void movesUnsupportedEventVersionToDeadLetter() {
        DetectionJobRedisProperties properties = new DetectionJobRedisProperties();
        PendingMessage pendingMessage = pendingMessage(properties, "message-001", Duration.ofMinutes(6), 1);
        MapRecord<String, Object, Object> claimedRecord = record(
                properties.getStreamKey(),
                "message-001",
                eventFields("event-001", "2", "task-001"));
        when(redisTemplate.opsForStream()).thenReturn(streamOperations);
        when(streamOperations.pending(
                eq(properties.getStreamKey()),
                eq(properties.getGroupName()),
                any(Range.class),
                eq((long) properties.getPendingClaimBatchSize())))
                .thenReturn(new PendingMessages(properties.getGroupName(), List.of(pendingMessage)));
        when(streamOperations.claim(
                eq(properties.getStreamKey()),
                eq(properties.getGroupName()),
                eq(properties.getConsumerName()),
                any(XClaimOptions.class)))
                .thenReturn(List.of(claimedRecord));

        assertThat(new RedisDetectionJobQueue(redisTemplate, properties).poll()).isEmpty();

        ArgumentCaptor<MapRecord<String, Object, Object>> deadLetterRecordCaptor =
                ArgumentCaptor.forClass(MapRecord.class);
        verify(streamOperations).add(deadLetterRecordCaptor.capture());
        assertThat(deadLetterRecordCaptor.getValue().getValue())
                .containsEntry("eventId", "event-001")
                .containsEntry("reason", "unsupported event version: 2");
    }

    private PendingMessage pendingMessage(
            DetectionJobRedisProperties properties,
            String messageId,
            Duration idleTime,
            long deliveryCount) {
        return new PendingMessage(
                RecordId.of(messageId),
                Consumer.from(properties.getGroupName(), "previous-consumer"),
                idleTime,
                deliveryCount);
    }

    private MapRecord<String, Object, Object> record(
            String streamKey,
            String messageId,
            Map<String, String> fields) {
        Map<String, Object> recordFields = new java.util.LinkedHashMap<>(fields);
        return (MapRecord<String, Object, Object>) (MapRecord<?, ?, ?>) StreamRecords.newRecord()
                .ofMap(recordFields)
                .withId(RecordId.of(messageId))
                .withStreamKey(streamKey);
    }

    private DetectionJobRequest request(String eventId, String taskId) {
        return new DetectionJobRequest(
                eventId,
                1,
                taskId,
                Instant.parse("2026-07-11T00:00:00Z"));
    }

    private Map<String, String> eventFields(String eventId, String version, String taskId) {
        return Map.of(
                "eventId", eventId,
                "eventVersion", version,
                "taskId", taskId,
                "occurredAt", "2026-07-11T00:00:00Z");
    }
}
