package com.fengting.aigcforensics.service;

public record InspectedImage(
        String contentType,
        String extension,
        int width,
        int height) {
}
