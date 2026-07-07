package com.fengting.aigcforensics.service;

import java.nio.file.Path;

public interface StorageService {

    StoredFile saveUpload(String assetId, String originalFilename, byte[] content);

    record StoredFile(Path path, long size) {
    }
}
