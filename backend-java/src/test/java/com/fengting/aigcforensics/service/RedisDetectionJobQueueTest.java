package com.fengting.aigcforensics.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
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

import com.fengting.aigcforensics.config.DetectionJobRedisProperties;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("unchecked")
class RedisDetectionJobQueueTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private StreamOperations<String, Object, Object> streamOperations;

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
                Map.of("taskId", "task-001"));

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

        assertThat(message).contains(new DetectionJobMessage("message-001", "task-001"));
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
                Map.of("taskId", "task-001"));

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
                .containsEntry("taskId", "task-001")
                .containsEntry("originalMessageId", "message-001")
                .containsEntry("deliveryCount", "3");
        verify(streamOperations).acknowledge(
                properties.getStreamKey(),
                properties.getGroupName(),
                RecordId.of("message-001"));
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
}
