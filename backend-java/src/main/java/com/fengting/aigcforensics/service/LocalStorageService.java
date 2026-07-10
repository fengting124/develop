package com.fengting.aigcforensics.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.fengting.aigcforensics.config.AppStorageProperties;

@Service
public class LocalStorageService implements StorageService {

    private static final Pattern ASSET_ID_PATTERN = Pattern.compile("[A-Za-z0-9_-]{1,64}");
    private static final Pattern EXTENSION_PATTERN = Pattern.compile("[a-z0-9]{1,10}");

    private final Path root;

    @Autowired
    public LocalStorageService(AppStorageProperties properties) {
        this(Path.of(properties.root()));
    }

    public LocalStorageService(Path root) {
        this.root = root.toAbsolutePath().normalize();
    }

    @Override
    public StoredFile saveAcceptedImage(String assetId, String extension, byte[] content) {
        requireSafeComponent(assetId, ASSET_ID_PATTERN, "assetId");
        requireSafeComponent(extension, EXTENSION_PATTERN, "extension");
        if (content == null || content.length == 0) {
            throw new IllegalArgumentException("content must not be empty");
        }

        Path directory = root.resolve("uploads").resolve(assetId).normalize();
        Path output = directory.resolve(assetId + "." + extension).normalize();
        ensurePathInsideRoot(output);

        Path temporary = directory.resolve(assetId + ".tmp-" + UUID.randomUUID()).normalize();
        ensurePathInsideRoot(temporary);
        boolean outputReserved = false;
        boolean completed = false;
        try {
            Files.createDirectories(directory);
            Files.createFile(output);
            outputReserved = true;
            Files.write(temporary, content, StandardOpenOption.CREATE_NEW);
            moveIntoPlace(temporary, output);
            completed = true;
            return new StoredFile(output, content.length);
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to save accepted image " + assetId, exception);
        } finally {
            deleteTemporaryFile(temporary);
            if (outputReserved && !completed) {
                deleteTemporaryFile(output);
            }
        }
    }

    private void requireSafeComponent(String value, Pattern pattern, String name) {
        if (value == null || !pattern.matcher(value).matches()) {
            throw new IllegalArgumentException(name + " contains unsupported characters");
        }
    }

    private void moveIntoPlace(Path temporary, Path output) throws IOException {
        try {
            Files.move(
                    temporary,
                    output,
                    StandardCopyOption.ATOMIC_MOVE,
                    StandardCopyOption.REPLACE_EXISTING);
        } catch (java.nio.file.AtomicMoveNotSupportedException exception) {
            Files.move(temporary, output, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    private void deleteTemporaryFile(Path temporary) {
        try {
            Files.deleteIfExists(temporary);
        } catch (IOException ignored) {
            // A failed cleanup is less harmful than masking the original storage error.
        }
    }

    private void ensurePathInsideRoot(Path output) {
        if (!output.startsWith(root)) {
            throw new IllegalArgumentException("Resolved upload path escapes storage root");
        }
    }
}
