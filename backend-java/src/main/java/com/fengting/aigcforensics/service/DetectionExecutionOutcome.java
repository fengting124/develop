package com.fengting.aigcforensics.service;

public enum DetectionExecutionOutcome {
    COMPLETED,
    FAILED,
    TERMINAL,
    BUSY,
    STALE;

    public boolean shouldAcknowledge() {
        return this != BUSY;
    }
}
