package com.fengting.aigcforensics.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.fengting.aigcforensics.config.AppStorageProperties;

@Service
public class LocalStorageService implements StorageService {

    private final Path root;

    @Autowired
    public LocalStorageService(AppStorageProperties properties) {
        this(Path.of(properties.root()));
    }

    public LocalStorageService(Path root) {
        this.root = root.toAbsolutePath().normalize();
    }

    @Override
    public StoredFile saveUpload(String assetId, String originalFilename, byte[] content) {
        if (assetId == null || assetId.isBlank()) {
            throw new IllegalArgumentException("assetId must not be blank");
        }
        if (content == null || content.length == 0) {
            throw new IllegalArgumentException("content must not be empty");
        }

        String safeFilename = sanitizeFilename(originalFilename);
        Path directory = root.resolve("uploads").resolve(assetId).normalize();
        Path output = directory.resolve(safeFilename).normalize();
        ensurePathInsideRoot(output);

        try {
            Files.createDirectories(directory);
            Files.write(output, content);
            return new StoredFile(output, content.length);
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to save upload " + safeFilename, exception);
        }
    }

    private String sanitizeFilename(String originalFilename) {
        String filename = Path.of(Objects.requireNonNullElse(originalFilename, "upload.bin")).getFileName().toString();
        String sanitized = filename.replaceAll("[^A-Za-z0-9._-]", "_");
        if (sanitized.isBlank() || sanitized.equals(".") || sanitized.equals("..")) {
            return "upload.bin";
        }
        return sanitized;
    }

    private void ensurePathInsideRoot(Path output) {
        if (!output.startsWith(root)) {
            throw new IllegalArgumentException("Resolved upload path escapes storage root");
        }
    }
}
