package com.fengting.aigcforensics.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fengting.aigcforensics.domain.ModelLabel;

import com.sun.net.httpserver.HttpServer;

class HttpModelInferenceClientTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private HttpServer server;

    @AfterEach
    void stopServer() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void predictPostsImagePathAndParsesModelResponse() throws Exception {
        AtomicReference<String> requestBody = new AtomicReference<>();
        startServer(200, """
                {
                  "modelVersion": "v0",
                  "rawScore": 0.82,
                  "normalizedScore": 0.82,
                  "label": "SYNTHETIC",
                  "latencyMs": 137,
                  "rawResponse": {"score": 0.82, "label": "SYNTHETIC"}
                }
                """, requestBody);

        HttpModelInferenceClient client = new HttpModelInferenceClient(objectMapper);

        ModelInferenceResult result = client.predict(
                serverBaseUrl(),
                new ModelInferenceRequest(
                        "task_123",
                        "asset_456",
                        Path.of("D:/workspace/develop/storage/uploads/asset_456/sample.png"),
                        0.5));

        assertThat(result.modelVersion()).isEqualTo("v0");
        assertThat(result.rawScore()).isEqualTo(0.82);
        assertThat(result.normalizedScore()).isEqualTo(0.82);
        assertThat(result.label()).isEqualTo(ModelLabel.SYNTHETIC);
        assertThat(result.latencyMs()).isEqualTo(137);
        assertThat(result.rawResponseJson()).contains("\"score\":0.82");

        assertThat(requestBody.get()).contains("\"taskId\":\"task_123\"");
        assertThat(requestBody.get()).contains("\"assetId\":\"asset_456\"");
        assertThat(requestBody.get()).contains("\"threshold\":0.5");
        assertThat(requestBody.get()).contains("sample.png");
    }

    @Test
    void predictThrowsWhenModelServiceReturnsError() throws Exception {
        startServer(503, "{\"message\":\"model warming up\"}", new AtomicReference<>());
        HttpModelInferenceClient client = new HttpModelInferenceClient(objectMapper);

        assertThatThrownBy(() -> client.predict(
                serverBaseUrl(),
                new ModelInferenceRequest("task_123", "asset_456", Path.of("sample.png"), 0.5)))
                .isInstanceOf(ModelInferenceException.class)
                .hasMessageContaining("503")
                .hasMessageContaining("model warming up");
    }

    @Test
    void checkHealthCallsHealthEndpoint() throws Exception {
        AtomicReference<String> requestBody = new AtomicReference<>();
        startServer("/health", 200, "{\"status\":\"ok\"}", requestBody);
        HttpModelInferenceClient client = new HttpModelInferenceClient(objectMapper);

        client.checkHealth(serverBaseUrl());

        assertThat(requestBody.get()).isEqualTo("");
    }

    @Test
    void checkHealthThrowsWhenHealthEndpointFails() throws Exception {
        startServer("/health", 503, "unavailable", new AtomicReference<>());
        HttpModelInferenceClient client = new HttpModelInferenceClient(objectMapper);

        assertThatThrownBy(() -> client.checkHealth(serverBaseUrl()))
                .isInstanceOf(ModelInferenceException.class)
                .hasMessageContaining("Model health check returned 503")
                .hasMessageContaining("unavailable");
    }

    private void startServer(int status, String responseBody, AtomicReference<String> requestBody) throws IOException {
        startServer("/api/v1/predict", status, responseBody, requestBody);
    }

    private void startServer(
            String path,
            int status,
            String responseBody,
            AtomicReference<String> requestBody) throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext(path, exchange -> {
            requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] response = responseBody.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(status, response.length);
            try (OutputStream outputStream = exchange.getResponseBody()) {
                outputStream.write(response);
            }
        });
        server.setExecutor(Executors.newSingleThreadExecutor());
        server.start();
    }

    private String serverBaseUrl() {
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }
}
