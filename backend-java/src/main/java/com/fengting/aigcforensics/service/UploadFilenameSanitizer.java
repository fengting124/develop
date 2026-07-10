package com.fengting.aigcforensics.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.fengting.aigcforensics.config.UploadPolicyProperties;

@Component
public class UploadFilenameSanitizer {

    private static final String FALLBACK_FILENAME = "upload.bin";

    private final int maxLength;

    @Autowired
    public UploadFilenameSanitizer(UploadPolicyProperties policy) {
        this(policy.maxFilenameLength());
    }

    UploadFilenameSanitizer(int maxLength) {
        if (maxLength <= 0) {
            throw new IllegalArgumentException("maxLength must be positive");
        }
        this.maxLength = maxLength;
    }

    public String sanitize(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            return FALLBACK_FILENAME;
        }

        int separator = Math.max(originalFilename.lastIndexOf('/'), originalFilename.lastIndexOf('\\'));
        String leaf = originalFilename.substring(separator + 1).trim();
        if (leaf.isBlank() || leaf.equals(".") || leaf.equals("..")) {
            return FALLBACK_FILENAME;
        }

        StringBuilder sanitized = new StringBuilder(leaf.length());
        leaf.codePoints().forEach(codePoint -> sanitized.appendCodePoint(isControl(codePoint) ? '_' : codePoint));
        String result = sanitized.toString();
        int codePointCount = result.codePointCount(0, result.length());
        if (codePointCount > maxLength) {
            result = result.substring(0, result.offsetByCodePoints(0, maxLength));
        }
        return result.isBlank() ? FALLBACK_FILENAME : result;
    }

    private boolean isControl(int codePoint) {
        int type = Character.getType(codePoint);
        return Character.isISOControl(codePoint)
                || type == Character.LINE_SEPARATOR
                || type == Character.PARAGRAPH_SEPARATOR;
    }
}
