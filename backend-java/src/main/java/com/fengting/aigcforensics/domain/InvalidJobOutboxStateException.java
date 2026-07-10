package com.fengting.aigcforensics.domain;

public class InvalidJobOutboxStateException extends IllegalStateException {

    public InvalidJobOutboxStateException(String message) {
        super(message);
    }
}
