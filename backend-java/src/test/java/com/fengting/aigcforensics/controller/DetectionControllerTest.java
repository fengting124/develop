package com.fengting.aigcforensics.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.fengting.aigcforensics.domain.DetectionStatus;
import com.fengting.aigcforensics.repository.DetectionTaskRepository;
import com.fengting.aigcforensics.repository.MediaAssetRepository;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate",
        "app.storage.root=target/test-storage"
})
class DetectionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MediaAssetRepository mediaAssetRepository;

    @Autowired
    private DetectionTaskRepository detectionTaskRepository;

    @Test
    void createImageDetectionStoresAssetAndQueuedTask() throws Exception {
        MockMultipartFile image = new MockMultipartFile(
                "file",
                "sample.png",
                "image/png",
                onePixelPng());

        String response = mockMvc.perform(multipart("/api/detections/images").file(image))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.assetId").isString())
                .andExpect(jsonPath("$.taskId").isString())
                .andExpect(jsonPath("$.status").value("QUEUED"))
                .andExpect(jsonPath("$.filename").value("sample.png"))
                .andExpect(jsonPath("$.contentType").value("image/png"))
                .andExpect(jsonPath("$.width").value(1))
                .andExpect(jsonPath("$.height").value(1))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String assetId = response.replaceAll(".*\"assetId\":\"([^\"]+)\".*", "$1");
        String taskId = response.replaceAll(".*\"taskId\":\"([^\"]+)\".*", "$1");

        assertThat(mediaAssetRepository.findByAssetId(assetId)).isPresent();
        assertThat(detectionTaskRepository.findByTaskId(taskId))
                .isPresent()
                .get()
                .extracting(task -> task.getStatus())
                .isEqualTo(DetectionStatus.QUEUED);
    }

    @Test
    void createImageDetectionRejectsNonImageUpload() throws Exception {
        MockMultipartFile text = new MockMultipartFile(
                "file",
                "note.txt",
                "text/plain",
                "hello".getBytes());

        mockMvc.perform(multipart("/api/detections/images").file(text))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Only JPEG, PNG, and WebP images are supported"));
    }

    private byte[] onePixelPng() throws IOException {
        BufferedImage image = new BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB);
        image.setRGB(0, 0, Color.WHITE.getRGB());

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        ImageIO.write(image, "png", outputStream);
        return outputStream.toByteArray();
    }
}
