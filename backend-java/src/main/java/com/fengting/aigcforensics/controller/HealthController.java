package com.fengting.aigcforensics.controller;

import java.time.Instant;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    private static final String SERVICE_NAME = "image-authenticity-backend";

    @GetMapping
    public HealthResponse health() {
        return new HealthResponse("ok", SERVICE_NAME, Instant.now());
    }

    public record HealthResponse(String status, String service, Instant time) {
    }
}
