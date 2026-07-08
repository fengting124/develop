package com.fengting.aigcforensics.controller;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.fengting.aigcforensics.domain.DetectionStatus;
import com.fengting.aigcforensics.dto.detection.DetectionDetailResponse;
import com.fengting.aigcforensics.service.DetectionExecutionService;
import com.fengting.aigcforensics.service.DetectionJobService;
import com.fengting.aigcforensics.service.DetectionWorkflowService;

@WebMvcTest(DetectionController.class)
class DetectionAsyncControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DetectionWorkflowService detectionWorkflowService;

    @MockitoBean
    private DetectionExecutionService detectionExecutionService;

    @MockitoBean
    private DetectionJobService detectionJobService;

    @Test
    void runDetectionAsyncSubmitsJobAndReturnsAcceptedTaskSnapshot() throws Exception {
        DetectionDetailResponse detail = new DetectionDetailResponse(
                "task-001",
                "asset-001",
                DetectionStatus.QUEUED,
                null,
                "sample.png",
                "image/png",
                1024,
                "sha256",
                1,
                1,
                Instant.parse("2026-07-07T00:00:00Z"),
                null,
                null,
                List.of(),
                null);
        when(detectionWorkflowService.getDetection("task-001")).thenReturn(detail);

        mockMvc.perform(post("/api/detections/{taskId}/run-async", "task-001"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.taskId").value("task-001"))
                .andExpect(jsonPath("$.status").value("QUEUED"));

        verify(detectionJobService).submit("task-001");
    }
}
