package com.fengting.aigcforensics.service;

public record DetectionJobMessage(
        String messageId,
        String eventId,
        int eventVersion,
        String taskId) {
}
