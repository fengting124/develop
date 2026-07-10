package com.fengting.aigcforensics.service;

import java.time.Duration;

public class OutboxBackoffPolicy {

    private static final int MIN_JITTER_PERMILLE = 800;
    private static final int JITTER_RANGE = 401;

    private final Duration baseDelay;
    private final Duration maxDelay;

    public OutboxBackoffPolicy(Duration baseDelay, Duration maxDelay) {
        if (baseDelay == null || baseDelay.isNegative() || baseDelay.isZero()) {
            throw new IllegalArgumentException("baseDelay must be positive");
        }
        if (maxDelay == null || maxDelay.compareTo(baseDelay) < 0) {
            throw new IllegalArgumentException("maxDelay must be at least baseDelay");
        }
        this.baseDelay = baseDelay;
        this.maxDelay = maxDelay;
    }

    public Duration delay(String eventId, int attemptCount) {
        if (eventId == null || eventId.isBlank()) {
            throw new IllegalArgumentException("eventId must not be blank");
        }
        if (attemptCount < 1) {
            throw new IllegalArgumentException("attemptCount must be at least 1");
        }

        long baseMillis = baseDelay.toMillis();
        long maxMillis = maxDelay.toMillis();
        int shift = Math.min(attemptCount - 1, 30);
        long exponential = baseMillis > (Long.MAX_VALUE >> shift)
                ? Long.MAX_VALUE
                : baseMillis << shift;
        long capped = Math.min(exponential, maxMillis);
        int jitterPermille = MIN_JITTER_PERMILLE + Math.floorMod(eventId.hashCode(), JITTER_RANGE);
        long jittered = capped * jitterPermille / 1000;
        return Duration.ofMillis(Math.max(1, Math.min(jittered, maxMillis)));
    }
}
