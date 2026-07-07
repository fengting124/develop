package com.fengting.aigcforensics.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.RedisSystemException;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.core.StreamOperations;
import org.springframework.data.redis.core.StringRedisTemplate;

import com.fengting.aigcforensics.config.DetectionJobRedisProperties;

@ExtendWith(MockitoExtension.class)
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
}
