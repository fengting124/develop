package com.fengting.aigcforensics.service;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;

import org.springframework.data.redis.RedisSystemException;
import org.springframework.data.redis.connection.RedisStreamCommands.XClaimOptions;
import org.springframework.data.redis.connection.stream.Consumer;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.PendingMessage;
import org.springframework.data.redis.connection.stream.PendingMessages;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.RecordId;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.connection.stream.StreamReadOptions;
import org.springframework.data.redis.connection.stream.StreamRecords;
import org.springframework.data.domain.Range;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import com.fengting.aigcforensics.config.DetectionJobRedisProperties;

@Service
public class RedisDetectionJobQueue implements DetectionJobQueue, DetectionJobConsumer {

    private static final String TASK_ID_FIELD = "taskId";
    private static final String EVENT_ID_FIELD = "eventId";
    private static final String EVENT_VERSION_FIELD = "eventVersion";
    private static final String OCCURRED_AT_FIELD = "occurredAt";
    private static final int SUPPORTED_EVENT_VERSION = 1;
    private static final String ORIGINAL_MESSAGE_ID_FIELD = "originalMessageId";
    private static final String DELIVERY_COUNT_FIELD = "deliveryCount";
    private static final String REASON_FIELD = "reason";

    private final StringRedisTemplate redisTemplate;
    private final DetectionJobRedisProperties properties;
    private final AtomicBoolean consumerGroupReady = new AtomicBoolean(false);

    public RedisDetectionJobQueue(
            StringRedisTemplate redisTemplate,
            DetectionJobRedisProperties properties) {
        this.redisTemplate = redisTemplate;
        this.properties = properties;
    }

    @Override
    public void enqueue(DetectionJobRequest request) {
        String submittedKey = submittedKey(request.eventId());
        Boolean acquired = redisTemplate.opsForValue()
                .setIfAbsent(submittedKey, "1", properties.getSubmittedTtl());
        if (acquired == null) {
            throw new IllegalStateException("Redis deduplication returned no result for event " + request.eventId());
        }
        if (Boolean.FALSE.equals(acquired)) {
            return;
        }

        try {
            RecordId recordId = redisTemplate.opsForStream().add(StreamRecords.newRecord()
                    .ofMap(Map.of(
                            EVENT_ID_FIELD, request.eventId(),
                            EVENT_VERSION_FIELD, String.valueOf(request.eventVersion()),
                            TASK_ID_FIELD, request.taskId(),
                            OCCURRED_AT_FIELD, request.occurredAt().toString()))
                    .withStreamKey(properties.getStreamKey()));
            if (recordId == null) {
                throw new IllegalStateException("Redis stream returned no record id for event " + request.eventId());
            }
        } catch (RuntimeException exception) {
            redisTemplate.delete(submittedKey);
            throw exception;
        }
    }

    @Override
    @SuppressWarnings("unchecked")
    public Optional<DetectionJobMessage> poll() {
        try {
            ensureConsumerGroup();
        } catch (RedisSystemException exception) {
            if (isStreamMissingError(exception)) {
                return Optional.empty();
            }
            throw exception;
        }
        Optional<DetectionJobMessage> pendingMessage = recoverPendingMessage();
        if (pendingMessage.isPresent()) {
            return pendingMessage;
        }
        List<MapRecord<String, Object, Object>> records = redisTemplate.opsForStream().read(
                Consumer.from(properties.getGroupName(), properties.getConsumerName()),
                StreamReadOptions.empty()
                        .count(1)
                        .block(properties.getBlockTimeout()),
                StreamOffset.create(properties.getStreamKey(), ReadOffset.lastConsumed()));
        if (records == null || records.isEmpty()) {
            return Optional.empty();
        }

        MapRecord<String, Object, Object> record = records.get(0);
        return toMessage(record);
    }

    @Override
    public void acknowledge(DetectionJobMessage message) {
        redisTemplate.opsForStream().acknowledge(
                properties.getStreamKey(),
                properties.getGroupName(),
                RecordId.of(message.messageId()));
        if (!message.eventId().isBlank()) {
            redisTemplate.delete(submittedKey(message.eventId()));
        }
    }

    private void ensureConsumerGroup() {
        if (!consumerGroupReady.compareAndSet(false, true)) {
            return;
        }
        try {
            redisTemplate.opsForStream().createGroup(
                    properties.getStreamKey(),
                    ReadOffset.from("0-0"),
                    properties.getGroupName());
        } catch (RedisSystemException exception) {
            if (!isGroupAlreadyExistsError(exception)) {
                consumerGroupReady.set(false);
                throw exception;
            }
        }
    }

    private Optional<DetectionJobMessage> recoverPendingMessage() {
        PendingMessages pendingMessages = redisTemplate.opsForStream().pending(
                properties.getStreamKey(),
                properties.getGroupName(),
                Range.unbounded(),
                properties.getPendingClaimBatchSize());
        if (pendingMessages == null || pendingMessages.isEmpty()) {
            return Optional.empty();
        }

        for (PendingMessage pendingMessage : pendingMessages) {
            if (pendingMessage.getElapsedTimeSinceLastDelivery().compareTo(properties.getPendingIdleTimeout()) < 0) {
                continue;
            }
            Optional<MapRecord<String, Object, Object>> claimedRecord = claim(pendingMessage.getId());
            if (claimedRecord.isEmpty()) {
                continue;
            }
            if (pendingMessage.getTotalDeliveryCount() >= properties.getMaxDeliveryAttempts()) {
                moveToDeadLetter(claimedRecord.get(), pendingMessage.getTotalDeliveryCount());
                continue;
            }
            return toMessage(claimedRecord.get());
        }
        return Optional.empty();
    }

    @SuppressWarnings("unchecked")
    private Optional<MapRecord<String, Object, Object>> claim(RecordId recordId) {
        List<MapRecord<String, Object, Object>> claimedRecords = redisTemplate.opsForStream().claim(
                properties.getStreamKey(),
                properties.getGroupName(),
                properties.getConsumerName(),
                XClaimOptions.minIdle(properties.getPendingIdleTimeout()).ids(recordId));
        if (claimedRecords == null || claimedRecords.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(claimedRecords.get(0));
    }

    private Optional<DetectionJobMessage> toMessage(MapRecord<String, Object, Object> record) {
        String messageId = record.getId().getValue();
        String eventId = field(record, EVENT_ID_FIELD);
        String taskId = field(record, TASK_ID_FIELD);
        String versionText = field(record, EVENT_VERSION_FIELD);
        String occurredAt = field(record, OCCURRED_AT_FIELD);

        if (eventId.isBlank()) {
            moveInvalidToDeadLetter(record, "missing event id");
            return Optional.empty();
        }
        if (taskId.isBlank()) {
            moveInvalidToDeadLetter(record, "missing task id");
            return Optional.empty();
        }

        int eventVersion;
        try {
            eventVersion = Integer.parseInt(versionText);
        } catch (NumberFormatException exception) {
            moveInvalidToDeadLetter(record, "invalid event version: " + versionText);
            return Optional.empty();
        }
        if (eventVersion != SUPPORTED_EVENT_VERSION) {
            moveInvalidToDeadLetter(record, "unsupported event version: " + eventVersion);
            return Optional.empty();
        }
        try {
            Instant.parse(occurredAt);
        } catch (DateTimeParseException exception) {
            moveInvalidToDeadLetter(record, "invalid occurredAt: " + occurredAt);
            return Optional.empty();
        }
        return Optional.of(new DetectionJobMessage(messageId, eventId, eventVersion, taskId));
    }

    private void moveToDeadLetter(MapRecord<String, Object, Object> record, long deliveryCount) {
        String messageId = record.getId().getValue();
        String eventId = field(record, EVENT_ID_FIELD);
        String taskId = field(record, TASK_ID_FIELD);
        redisTemplate.opsForStream().add(StreamRecords.newRecord()
                .ofMap(Map.of(
                        EVENT_ID_FIELD, eventId,
                        TASK_ID_FIELD, taskId,
                        ORIGINAL_MESSAGE_ID_FIELD, messageId,
                        DELIVERY_COUNT_FIELD, String.valueOf(deliveryCount),
                        REASON_FIELD, "max delivery attempts exceeded"))
                .withStreamKey(properties.getDeadLetterStreamKey()));
        acknowledgeRecord(messageId, eventId);
    }

    private void moveInvalidToDeadLetter(MapRecord<String, Object, Object> record, String reason) {
        String messageId = record.getId().getValue();
        String eventId = field(record, EVENT_ID_FIELD);
        Map<String, String> deadLetter = new LinkedHashMap<>();
        deadLetter.put(EVENT_ID_FIELD, eventId);
        deadLetter.put(TASK_ID_FIELD, field(record, TASK_ID_FIELD));
        deadLetter.put(ORIGINAL_MESSAGE_ID_FIELD, messageId);
        deadLetter.put(REASON_FIELD, reason);
        redisTemplate.opsForStream().add(StreamRecords.newRecord()
                .ofMap(deadLetter)
                .withStreamKey(properties.getDeadLetterStreamKey()));
        acknowledgeRecord(messageId, eventId);
    }

    private void acknowledgeRecord(String messageId, String eventId) {
        redisTemplate.opsForStream().acknowledge(
                properties.getStreamKey(),
                properties.getGroupName(),
                RecordId.of(messageId));
        if (!eventId.isBlank()) {
            redisTemplate.delete(submittedKey(eventId));
        }
    }

    private String field(MapRecord<String, Object, Object> record, String fieldName) {
        Object value = record.getValue().get(fieldName);
        return value == null ? "" : value.toString();
    }

    private boolean isGroupAlreadyExistsError(RedisSystemException exception) {
        return exception.getMessage() != null && exception.getMessage().contains("BUSYGROUP");
    }

    private boolean isStreamMissingError(RedisSystemException exception) {
        if (exception.getMessage() == null) {
            return false;
        }
        String message = exception.getMessage().toLowerCase(Locale.ROOT);
        return message.contains("requires the key to exist") || message.contains("no such key");
    }

    private String submittedKey(String eventId) {
        return properties.getSubmittedKeyPrefix() + eventId;
    }
}
