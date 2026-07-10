package com.fengting.aigcforensics.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;

import org.junit.jupiter.api.Test;

class OutboxBackoffPolicyTest {

    @Test
    void doublesDelayAndCapsAtConfiguredMaximum() {
        OutboxBackoffPolicy policy = new OutboxBackoffPolicy(
                Duration.ofSeconds(1),
                Duration.ofSeconds(8));

        assertThat(policy.delay("event-001", 1))
                .isBetween(Duration.ofMillis(800), Duration.ofMillis(1200));
        assertThat(policy.delay("event-001", 2))
                .isBetween(Duration.ofMillis(1600), Duration.ofMillis(2400));
        assertThat(policy.delay("event-001", 8))
                .isBetween(Duration.ofMillis(6400), Duration.ofMillis(9600));
    }

    @Test
    void returnsStableJitterForSameEventAndAttempt() {
        OutboxBackoffPolicy policy = new OutboxBackoffPolicy(
                Duration.ofSeconds(1),
                Duration.ofMinutes(1));

        assertThat(policy.delay("event-001", 3))
                .isEqualTo(policy.delay("event-001", 3));
    }
}
