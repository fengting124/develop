package com.fengting.aigcforensics.client;

public interface ModelInferenceClient {

    void checkHealth(String endpointUrl);

    ModelInferenceResult predict(String endpointUrl, ModelInferenceRequest request);
}
