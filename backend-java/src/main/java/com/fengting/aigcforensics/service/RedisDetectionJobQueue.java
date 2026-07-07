package com.fengting.aigcforensics.service;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;

import org.springframework.data.redis.RedisSystemException;
import org.springframework.data.redis.connection.stream.Consumer;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.RecordId;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.connection.stream.StreamReadOptions;
import org.springframework.data.redis.connection.stream.StreamRecords;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import com.fengting.aigcforensics.config.DetectionJobRedisProperties;

@Service
public class RedisDetectionJobQueue implements DetectionJobQueue, DetectionJobConsumer {

    private static final String TASK_ID_FIELD = "taskId";

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
    public void enqueue(String taskId) {
        String submittedKey = submittedKey(taskId);
        Boolean acquired = redisTemplate.opsForValue()
                .setIfAbsent(submittedKey, "1", properties.getSubmittedTtl());
        if (Boolean.FALSE.equals(acquired)) {
            return;
        }

        try {
            redisTemplate.opsForStream().add(StreamRecords.newRecord()
                    .ofMap(Map.of(TASK_ID_FIELD, taskId))
                    .withStreamKey(properties.getStreamKey()));
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
        Object taskId = record.getValue().get(TASK_ID_FIELD);
        if (taskId == null) {
            acknowledge(new DetectionJobMessage(record.getId().getValue(), ""));
            return Optional.empty();
        }
        return Optional.of(new DetectionJobMessage(record.getId().getValue(), taskId.toString()));
    }

    @Override
    public void acknowledge(DetectionJobMessage message) {
        redisTemplate.opsForStream().acknowledge(
                properties.getStreamKey(),
                properties.getGroupName(),
                RecordId.of(message.messageId()));
        if (!message.taskId().isBlank()) {
            redisTemplate.delete(submittedKey(message.taskId()));
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

    private String submittedKey(String taskId) {
        return properties.getSubmittedKeyPrefix() + taskId;
    }
}
