package com.fengting.aigcforensics.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.upload")
public record UploadPolicyProperties(
        Long maxBytes,
        Integer maxWidth,
        Integer maxHeight,
        Long maxPixels,
        Integer maxFilenameLength) {

    private static final long DEFAULT_MAX_BYTES = 10L * 1024 * 1024;
    private static final int DEFAULT_MAX_DIMENSION = 8192;
    private static final long DEFAULT_MAX_PIXELS = 25_000_000L;
    private static final int DEFAULT_MAX_FILENAME_LENGTH = 255;

    public UploadPolicyProperties {
        maxBytes = defaultIfNull(maxBytes, DEFAULT_MAX_BYTES);
        maxWidth = defaultIfNull(maxWidth, DEFAULT_MAX_DIMENSION);
        maxHeight = defaultIfNull(maxHeight, DEFAULT_MAX_DIMENSION);
        maxPixels = defaultIfNull(maxPixels, DEFAULT_MAX_PIXELS);
        maxFilenameLength = defaultIfNull(maxFilenameLength, DEFAULT_MAX_FILENAME_LENGTH);

        requirePositive("maxBytes", maxBytes);
        requirePositive("maxWidth", maxWidth);
        requirePositive("maxHeight", maxHeight);
        requirePositive("maxPixels", maxPixels);
        requirePositive("maxFilenameLength", maxFilenameLength);
    }

    private static long defaultIfNull(Long value, long defaultValue) {
        return value == null ? defaultValue : value;
    }

    private static int defaultIfNull(Integer value, int defaultValue) {
        return value == null ? defaultValue : value;
    }

    private static void requirePositive(String name, long value) {
        if (value <= 0) {
            throw new IllegalArgumentException(name + " must be positive");
        }
    }
}
