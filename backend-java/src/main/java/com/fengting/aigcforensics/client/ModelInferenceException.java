package com.fengting.aigcforensics.client;

public class ModelInferenceException extends RuntimeException {

    public ModelInferenceException(String message) {
        super(message);
    }

    public ModelInferenceException(String message, Throwable cause) {
        super(message, cause);
    }
}
