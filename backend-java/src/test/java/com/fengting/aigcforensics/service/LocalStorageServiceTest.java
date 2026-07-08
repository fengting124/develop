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

        StorageService.StoredFile storedFile = storageService.saveUpload(
                "asset_001",
                "../unsafe name.png",
                new byte[] { 1, 2, 3 });

        assertThat(storedFile.size()).isEqualTo(3);
        assertThat(storedFile.path()).startsWith(tempDir.toAbsolutePath().normalize());
        assertThat(storedFile.path().getFileName().toString()).isEqualTo("unsafe_name.png");
        assertThat(Files.readAllBytes(storedFile.path())).containsExactly(1, 2, 3);
    }

    @Test
    void rejectsEmptyUpload() {
        LocalStorageService storageService = new LocalStorageService(tempDir);

        assertThatThrownBy(() -> storageService.saveUpload("asset_001", "sample.png", new byte[0]))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("content");
    }
}
