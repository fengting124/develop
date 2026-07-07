package com.fengting.aigcforensics.config;

import java.time.Duration;
import java.util.UUID;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.detection.jobs.redis")
public class DetectionJobRedisProperties {

    private String streamKey = "detection:jobs";
    private String groupName = "detection-workers";
    private String consumerName = "backend-" + UUID.randomUUID();
    private String submittedKeyPrefix = "detection:jobs:submitted:";
    private Duration submittedTtl = Duration.ofHours(6);
    private Duration blockTimeout = Duration.ofSeconds(2);

    public String getStreamKey() {
        return streamKey;
    }

    public void setStreamKey(String streamKey) {
        this.streamKey = streamKey;
    }

    public String getGroupName() {
        return groupName;
    }

    public void setGroupName(String groupName) {
        this.groupName = groupName;
    }

    public String getConsumerName() {
        return consumerName;
    }

    public void setConsumerName(String consumerName) {
        this.consumerName = consumerName;
    }

    public String getSubmittedKeyPrefix() {
        return submittedKeyPrefix;
    }

    public void setSubmittedKeyPrefix(String submittedKeyPrefix) {
        this.submittedKeyPrefix = submittedKeyPrefix;
    }

    public Duration getSubmittedTtl() {
        return submittedTtl;
    }

    public void setSubmittedTtl(Duration submittedTtl) {
        this.submittedTtl = submittedTtl;
    }

    public Duration getBlockTimeout() {
        return blockTimeout;
    }

    public void setBlockTimeout(Duration blockTimeout) {
        this.blockTimeout = blockTimeout;
    }
}
