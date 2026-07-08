package com.fengting.aigcforensics.client;

public interface ModelInferenceClient {

    ModelInferenceResult predict(String endpointUrl, ModelInferenceRequest request);
}
