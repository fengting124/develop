package com.fengting.aigcforensics.client;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fengting.aigcforensics.domain.ModelLabel;

@Component
public class HttpModelInferenceClient implements ModelInferenceClient {

    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(30);

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Autowired
    public HttpModelInferenceClient(ObjectMapper objectMapper) {
        this(objectMapper, HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build());
    }

    HttpModelInferenceClient(ObjectMapper objectMapper, HttpClient httpClient) {
        this.objectMapper = objectMapper;
        this.httpClient = httpClient;
    }

    @Override
    public void checkHealth(String endpointUrl) {
        URI uri = URI.create(normalizeEndpointUrl(endpointUrl) + "/health");
        HttpRequest httpRequest = HttpRequest.newBuilder(uri)
                .timeout(REQUEST_TIMEOUT)
                .GET()
                .build();

        HttpResponse<String> response = send(httpRequest);
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new ModelInferenceException(
                    "Model health check returned " + response.statusCode() + ": " + response.body());
        }
    }

    @Override
    public ModelInferenceResult predict(String endpointUrl, ModelInferenceRequest request) {
        URI uri = URI.create(normalizeEndpointUrl(endpointUrl) + "/api/v1/predict");
        String requestBody = serializeRequest(request);

        HttpRequest httpRequest = HttpRequest.newBuilder(uri)
                .timeout(REQUEST_TIMEOUT)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = send(httpRequest);
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new ModelInferenceException(
                    "Model service returned " + response.statusCode() + ": " + response.body());
        }
        return parseResponse(response.body());
    }

    private String serializeRequest(ModelInferenceRequest request) {
        try {
            return objectMapper.writeValueAsString(new WireRequest(
                    request.taskId(),
                    request.assetId(),
                    request.imagePath().toString(),
                    request.threshold()));
        } catch (IOException exception) {
            throw new ModelInferenceException("Failed to serialize model inference request", exception);
        }
    }

    private HttpResponse<String> send(HttpRequest httpRequest) {
        try {
            return httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
        } catch (IOException exception) {
            throw new ModelInferenceException("Failed to call model service", exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ModelInferenceException("Interrupted while calling model service", exception);
        }
    }

    private ModelInferenceResult parseResponse(String responseBody) {
        try {
            JsonNode response = objectMapper.readTree(responseBody);
            JsonNode rawResponse = response.path("rawResponse");
            String rawResponseJson = rawResponse.isMissingNode()
                    ? responseBody
                    : objectMapper.writeValueAsString(rawResponse);
            return new ModelInferenceResult(
                    requiredText(response, "modelVersion"),
                    requiredDouble(response, "rawScore"),
                    requiredDouble(response, "normalizedScore"),
                    ModelLabel.valueOf(requiredText(response, "label")),
                    requiredInt(response, "latencyMs"),
                    rawResponseJson);
        } catch (IllegalArgumentException | IOException exception) {
            throw new ModelInferenceException("Failed to parse model service response: " + responseBody, exception);
        }
    }

    private String requiredText(JsonNode response, String fieldName) {
        JsonNode value = response.path(fieldName);
        if (!value.isTextual() || value.asText().isBlank()) {
            throw new IllegalArgumentException("Missing text field: " + fieldName);
        }
        return value.asText();
    }

    private double requiredDouble(JsonNode response, String fieldName) {
        JsonNode value = response.path(fieldName);
        if (!value.isNumber()) {
            throw new IllegalArgumentException("Missing numeric field: " + fieldName);
        }
        return value.asDouble();
    }

    private int requiredInt(JsonNode response, String fieldName) {
        JsonNode value = response.path(fieldName);
        if (!value.canConvertToInt()) {
            throw new IllegalArgumentException("Missing integer field: " + fieldName);
        }
        return value.asInt();
    }

    private String normalizeEndpointUrl(String endpointUrl) {
        if (endpointUrl == null || endpointUrl.isBlank()) {
            throw new IllegalArgumentException("endpointUrl must not be blank");
        }
        return endpointUrl.endsWith("/") ? endpointUrl.substring(0, endpointUrl.length() - 1) : endpointUrl;
    }

    private record WireRequest(
            String taskId,
            String assetId,
            String imagePath,
            double threshold) {
    }
}
