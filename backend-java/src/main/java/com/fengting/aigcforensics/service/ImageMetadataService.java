package com.fengting.aigcforensics.service;

import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Path;

import javax.imageio.ImageIO;

import org.springframework.stereotype.Service;

@Service
public class ImageMetadataService {

    public ImageMetadata read(Path imagePath) {
        try {
            BufferedImage image = ImageIO.read(imagePath.toFile());
            if (image == null) {
                throw new IllegalArgumentException("Unsupported or unreadable image: " + imagePath);
            }
            return new ImageMetadata(image.getWidth(), image.getHeight());
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to read image metadata for " + imagePath, exception);
        }
    }

    public record ImageMetadata(int width, int height) {
    }
}
