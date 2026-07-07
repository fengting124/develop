package com.fengting.aigcforensics.domain;

public enum DetectionStatus {
    UPLOADED,
    QUEUED,
    PREPROCESSING,
    INFERENCING,
    AGGREGATING,
    COMPLETED,
    FAILED
}
