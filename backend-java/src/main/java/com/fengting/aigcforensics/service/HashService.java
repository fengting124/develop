package com.fengting.aigcforensics.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

import org.springframework.stereotype.Service;

@Service
public class HashService {

    private static final int BUFFER_SIZE = 8192;

    public String sha256(byte[] content) {
        MessageDigest digest = newSha256Digest();
        return HexFormat.of().formatHex(digest.digest(content));
    }

    public String sha256(Path file) {
        MessageDigest digest = newSha256Digest();
        try (InputStream inputStream = Files.newInputStream(file);
                DigestInputStream digestInputStream = new DigestInputStream(inputStream, digest)) {
            byte[] buffer = new byte[BUFFER_SIZE];
            while (digestInputStream.read(buffer) != -1) {
                // Reading through DigestInputStream updates the digest.
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to calculate SHA-256 for " + file, exception);
        }
    }

    private MessageDigest newSha256Digest() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }
}
