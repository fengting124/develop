package com.fengting.aigcforensics.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class LocalStorageServiceTest {

    @TempDir
    private Path tempDir;

    @Test
    void savesUploadUnderAssetDirectory() throws Exception {
        LocalStorageService storageService = new LocalStorageService(tempDir);

        StorageService.StoredFile storedFile = storageService.saveAcceptedImage(
                "asset_001",
                "png",
                new byte[] { 1, 2, 3 });

        assertThat(storedFile.size()).isEqualTo(3);
        assertThat(storedFile.path()).startsWith(tempDir.toAbsolutePath().normalize());
        assertThat(storedFile.path().getFileName().toString()).isEqualTo("asset_001.png");
        assertThat(Files.readAllBytes(storedFile.path())).containsExactly(1, 2, 3);
    }

    @Test
    void rejectsEmptyUpload() {
        LocalStorageService storageService = new LocalStorageService(tempDir);

        assertThatThrownBy(() -> storageService.saveAcceptedImage("asset_001", "png", new byte[0]))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("content");
    }

    @Test
    void rejectsUntrustedAssetIdAndExtension() {
        LocalStorageService storageService = new LocalStorageService(tempDir);

        assertThatThrownBy(() -> storageService.saveAcceptedImage("../escape", "png", new byte[] { 1 }))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("assetId contains unsupported characters");
        assertThatThrownBy(() -> storageService.saveAcceptedImage("asset_001", "../exe", new byte[] { 1 }))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("extension contains unsupported characters");
    }

    @Test
    void neverOverwritesPreviouslyAcceptedEvidence() throws Exception {
        LocalStorageService storageService = new LocalStorageService(tempDir);
        StorageService.StoredFile original = storageService.saveAcceptedImage(
                "asset_001",
                "png",
                new byte[] { 1, 2, 3 });

        assertThatThrownBy(() -> storageService.saveAcceptedImage(
                "asset_001",
                "png",
                new byte[] { 9, 9, 9 }))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Failed to save accepted image");
        assertThat(Files.readAllBytes(original.path())).containsExactly(1, 2, 3);
    }
}
