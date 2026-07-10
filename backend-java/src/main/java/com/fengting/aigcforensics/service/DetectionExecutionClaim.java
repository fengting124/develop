package com.fengting.aigcforensics.service;

public record DetectionExecutionClaim(
        DetectionExecutionClaimStatus status,
        DetectionExecutionPlan plan) {

    public static DetectionExecutionClaim claimed(DetectionExecutionPlan plan) {
        return new DetectionExecutionClaim(DetectionExecutionClaimStatus.CLAIMED, plan);
    }

    public static DetectionExecutionClaim withoutPlan(DetectionExecutionClaimStatus status) {
        if (status == DetectionExecutionClaimStatus.CLAIMED) {
            throw new IllegalArgumentException("claimed execution requires a plan");
        }
        return new DetectionExecutionClaim(status, null);
    }
}
