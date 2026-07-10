package com.fengting.aigcforensics.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.jobs.outbox")
public class JobOutboxProperties {

    private boolean dispatcherEnabled = true;
    private long pollDelayMs = 500;
    private Duration staleAfter = Duration.ofMinutes(1);
    private int maxAttempts = 5;
    private Duration baseRetryDelay = Duration.ofSeconds(1);
    private Duration maxRetryDelay = Duration.ofMinutes(1);

    public boolean isDispatcherEnabled() {
        return dispatcherEnabled;
    }

    public void setDispatcherEnabled(boolean dispatcherEnabled) {
        this.dispatcherEnabled = dispatcherEnabled;
    }

    public long getPollDelayMs() {
        return pollDelayMs;
    }

    public void setPollDelayMs(long pollDelayMs) {
        this.pollDelayMs = pollDelayMs;
    }

    public Duration getStaleAfter() {
        return staleAfter;
    }

    public void setStaleAfter(Duration staleAfter) {
        this.staleAfter = staleAfter;
    }

    public int getMaxAttempts() {
        return maxAttempts;
    }

    public void setMaxAttempts(int maxAttempts) {
        this.maxAttempts = maxAttempts;
    }

    public Duration getBaseRetryDelay() {
        return baseRetryDelay;
    }

    public void setBaseRetryDelay(Duration baseRetryDelay) {
        this.baseRetryDelay = baseRetryDelay;
    }

    public Duration getMaxRetryDelay() {
        return maxRetryDelay;
    }

    public void setMaxRetryDelay(Duration maxRetryDelay) {
        this.maxRetryDelay = maxRetryDelay;
    }
}
