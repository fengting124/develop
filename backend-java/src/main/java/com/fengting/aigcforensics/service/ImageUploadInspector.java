package com.fengting.aigcforensics.service;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.Locale;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;

import org.springframework.stereotype.Service;

import com.fengting.aigcforensics.config.UploadPolicyProperties;

@Service
public class ImageUploadInspector {

    private static final String UNSUPPORTED_MESSAGE =
            "Only JPEG, PNG, and WebP image content is supported";
    private static final String CORRUPT_MESSAGE = "Uploaded image is corrupt or unreadable";

    private final UploadPolicyProperties policy;

    public ImageUploadInspector(UploadPolicyProperties policy) {
        this.policy = policy;
    }

    public InspectedImage inspect(byte[] content) {
        if (content == null || content.length == 0) {
            throw new IllegalArgumentException("Uploaded file must not be empty");
        }
        if (content.length > policy.maxBytes()) {
            throw new IllegalArgumentException("Uploaded file exceeds the configured byte limit");
        }

        UploadImageFormat signatureFormat = UploadImageFormat.fromSignature(content);
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(content))) {
            if (input == null) {
                throw new IllegalArgumentException(CORRUPT_MESSAGE);
            }
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                throw new IllegalArgumentException(CORRUPT_MESSAGE);
            }
            return inspectWithReader(input, readers.next(), signatureFormat);
        } catch (IOException exception) {
            throw new IllegalArgumentException(CORRUPT_MESSAGE, exception);
        }
    }

    private InspectedImage inspectWithReader(
            ImageInputStream input,
            ImageReader reader,
            UploadImageFormat signatureFormat) {
        try {
            reader.setInput(input, false, true);
            UploadImageFormat readerFormat = UploadImageFormat.fromReaderName(reader.getFormatName());
            if (readerFormat != signatureFormat) {
                throw new IllegalArgumentException(CORRUPT_MESSAGE);
            }

            int width = reader.getWidth(0);
            int height = reader.getHeight(0);
            validateDimensions(width, height);

            BufferedImage decoded = reader.read(0);
            if (decoded == null || decoded.getWidth() != width || decoded.getHeight() != height) {
                throw new IllegalArgumentException(CORRUPT_MESSAGE);
            }
            return new InspectedImage(
                    signatureFormat.contentType,
                    signatureFormat.extension,
                    width,
                    height);
        } catch (IOException exception) {
            throw new IllegalArgumentException(CORRUPT_MESSAGE, exception);
        } finally {
            reader.dispose();
        }
    }

    private void validateDimensions(int width, int height) {
        if (width <= 0 || height <= 0) {
            throw new IllegalArgumentException(CORRUPT_MESSAGE);
        }
        if (width > policy.maxWidth() || height > policy.maxHeight()) {
            throw new IllegalArgumentException(
                    "Image dimensions exceed the " + policy.maxWidth() + " x "
                            + policy.maxHeight() + " pixel limit");
        }
        long pixels = (long) width * height;
        if (pixels > policy.maxPixels()) {
            throw new IllegalArgumentException(
                    "Image exceeds the " + policy.maxPixels() + " decoded pixel limit");
        }
    }

    private enum UploadImageFormat {
        JPEG("image/jpeg", "jpg"),
        PNG("image/png", "png"),
        WEBP("image/webp", "webp");

        private final String contentType;
        private final String extension;

        UploadImageFormat(String contentType, String extension) {
            this.contentType = contentType;
            this.extension = extension;
        }

        private static UploadImageFormat fromSignature(byte[] content) {
            if (startsWith(content, 0xFF, 0xD8, 0xFF)) {
                return JPEG;
            }
            if (startsWith(content, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)) {
                return PNG;
            }
            if (content.length >= 12
                    && asciiEquals(content, 0, "RIFF")
                    && asciiEquals(content, 8, "WEBP")) {
                return WEBP;
            }
            throw new IllegalArgumentException(UNSUPPORTED_MESSAGE);
        }

        private static UploadImageFormat fromReaderName(String readerName) {
            String normalized = readerName.toLowerCase(Locale.ROOT);
            return switch (normalized) {
                case "jpeg", "jpg" -> JPEG;
                case "png" -> PNG;
                case "webp" -> WEBP;
                default -> throw new IllegalArgumentException(UNSUPPORTED_MESSAGE);
            };
        }

        private static boolean startsWith(byte[] content, int... signature) {
            if (content.length < signature.length) {
                return false;
            }
            for (int index = 0; index < signature.length; index++) {
                if ((content[index] & 0xFF) != signature[index]) {
                    return false;
                }
            }
            return true;
        }

        private static boolean asciiEquals(byte[] content, int offset, String expected) {
            for (int index = 0; index < expected.length(); index++) {
                if (content[offset + index] != expected.charAt(index)) {
                    return false;
                }
            }
            return true;
        }
    }
}
