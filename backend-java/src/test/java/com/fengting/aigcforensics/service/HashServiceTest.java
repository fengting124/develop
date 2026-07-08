package com.fengting.aigcforensics.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class HashServiceTest {

    private final HashService hashService = new HashService();

    @TempDir
    private Path tempDir;

    @Test
    void calculatesSha256ForBytes() {
        String hash = hashService.sha256("abc".getBytes(StandardCharsets.UTF_8));

        assertThat(hash).isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }

    @Test
    void calculatesSha256ForFile() throws Exception {
        Path file = tempDir.resolve("sample.txt");
        Files.writeString(file, "abc", StandardCharsets.UTF_8);

        String hash = hashService.sha256(file);

        assertThat(hash).isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }
}
