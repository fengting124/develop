package com.fengting.aigcforensics.service;

import java.nio.file.Path;

public interface StorageService {

    StoredFile saveAcceptedImage(String assetId, String extension, byte[] content);

    record StoredFile(Path path, long size) {
    }
}
