package com.fengting.aigcforensics.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;

import com.fengting.aigcforensics.config.UploadPolicyProperties;

class ImageUploadInspectorTest {

    @Test
    void detectsCanonicalPngTypeAndDimensionsFromContent() throws IOException {
        ImageUploadInspector inspector = inspector(1024, 1024, 1_000_000);

        InspectedImage image = inspector.inspect(imageBytes("png", 320, 180));

        assertThat(image.contentType()).isEqualTo("image/png");
        assertThat(image.extension()).isEqualTo("png");
        assertThat(image.width()).isEqualTo(320);
        assertThat(image.height()).isEqualTo(180);
    }

    @Test
    void detectsJpegFromBytesRegardlessOfRequestMetadata() throws IOException {
        ImageUploadInspector inspector = inspector(1024, 1024, 1_000_000);

        InspectedImage image = inspector.inspect(imageBytes("jpeg", 16, 12));

        assertThat(image.contentType()).isEqualTo("image/jpeg");
        assertThat(image.extension()).isEqualTo("jpg");
    }

    @Test
    void decodesWebpWithInstalledImageIoPlugin() {
        byte[] onePixelWebp = Base64.getDecoder().decode(
                "UklGRlYAAABXRUJQVlA4IDoAAADwAgCdASoBAAEAAEcIhYWIhYSIAgICdaoD+AP6"
                        + "Ag1NGAD+/vNYf/5gZt2KO//mBv/80F4SW6//zLwASUNNVAgAAAB0ZXN0MXgxAA==");

        InspectedImage image = inspector(1024, 1024, 1_000_000).inspect(onePixelWebp);

        assertThat(image.contentType()).isEqualTo("image/webp");
        assertThat(image.extension()).isEqualTo("webp");
        assertThat(image.width()).isEqualTo(1);
        assertThat(image.height()).isEqualTo(1);
    }

    @Test
    void rejectsUnknownSignatureBeforeDecode() {
        ImageUploadInspector inspector = inspector(1024, 1024, 1_000_000);

        assertThatThrownBy(() -> inspector.inspect("not an image".getBytes()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Only JPEG, PNG, and WebP image content is supported");
    }

    @Test
    void rejectsTruncatedImageWithValidSignature() {
        ImageUploadInspector inspector = inspector(1024, 1024, 1_000_000);
        byte[] truncatedPng = new byte[] {
                (byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
                0x00, 0x00, 0x00, 0x00
        };

        assertThatThrownBy(() -> inspector.inspect(truncatedPng))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Uploaded image is corrupt or unreadable");
    }

    @Test
    void rejectsEncodedContentOverByteLimit() throws IOException {
        byte[] content = imageBytes("png", 32, 32);
        UploadPolicyProperties policy = new UploadPolicyProperties(
                (long) content.length - 1,
                1024,
                1024,
                1_000_000L,
                255);

        assertThatThrownBy(() -> new ImageUploadInspector(policy).inspect(content))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Uploaded file exceeds the configured byte limit");
    }

    @Test
    void rejectsDimensionsBeforeFullImageIsAccepted() throws IOException {
        ImageUploadInspector inspector = inspector(100, 100, 10_000);

        assertThatThrownBy(() -> inspector.inspect(imageBytes("png", 101, 50)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Image dimensions exceed the 100 x 100 pixel limit");
    }

    @Test
    void rejectsDecodedPixelCount() throws IOException {
        ImageUploadInspector inspector = inspector(1000, 1000, 10_000);

        assertThatThrownBy(() -> inspector.inspect(imageBytes("png", 101, 100)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Image exceeds the 10000 decoded pixel limit");
    }

    private ImageUploadInspector inspector(int maxWidth, int maxHeight, long maxPixels) {
        return new ImageUploadInspector(new UploadPolicyProperties(
                10L * 1024 * 1024,
                maxWidth,
                maxHeight,
                maxPixels,
                255));
    }

    private byte[] imageBytes(String format, int width, int height) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        if (!ImageIO.write(image, format, output)) {
            throw new IllegalStateException("No image writer for " + format);
        }
        return output.toByteArray();
    }
}
