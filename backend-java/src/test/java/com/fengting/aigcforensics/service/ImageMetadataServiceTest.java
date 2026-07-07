package com.fengting.aigcforensics.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.nio.file.Path;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class ImageMetadataServiceTest {

    private final ImageMetadataService imageMetadataService = new ImageMetadataService();

    @TempDir
    private Path tempDir;

    @Test
    void readsImageDimensions() throws Exception {
        Path imagePath = tempDir.resolve("sample.png");
        BufferedImage image = new BufferedImage(320, 180, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = image.createGraphics();
        graphics.setColor(Color.WHITE);
        graphics.fillRect(0, 0, 320, 180);
        graphics.dispose();
        ImageIO.write(image, "png", imagePath.toFile());

        ImageMetadataService.ImageMetadata metadata = imageMetadataService.read(imagePath);

        assertThat(metadata.width()).isEqualTo(320);
        assertThat(metadata.height()).isEqualTo(180);
    }
}
