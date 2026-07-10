package com.fengting.aigcforensics.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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

import com.fengting.aigcforensics.domain.JobOutboxEvent;
import com.fengting.aigcforensics.domain.JobOutboxStatus;
import com.fengting.aigcforensics.domain.InvalidJobOutboxStateException;
import com.fengting.aigcforensics.service.JobOutboxService;
import com.fengting.aigcforensics.service.ResourceNotFoundException;

@WebMvcTest(JobOutboxOperationsController.class)
class JobOutboxOperationsControllerTest {

    private static final Instant CREATED_AT = Instant.parse("2026-07-11T00:00:00Z");

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JobOutboxService outboxService;

    @Test
    void listsBoundedOutboxMetadata() throws Exception {
        JobOutboxEvent event = event();
        event.claim(CREATED_AT);
        event.markPublishFailed("redis unavailable", CREATED_AT.plusSeconds(1), 1, CREATED_AT);
        when(outboxService.list(JobOutboxStatus.FAILED, 50)).thenReturn(List.of(event));

        mockMvc.perform(get("/api/operations/job-outbox").param("status", "FAILED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].eventId").value("event-001"))
                .andExpect(jsonPath("$[0].eventType").value("DETECTION_REQUESTED"))
                .andExpect(jsonPath("$[0].aggregateId").value("task-001"))
                .andExpect(jsonPath("$[0].status").value("FAILED"))
                .andExpect(jsonPath("$[0].lastError").value("redis unavailable"))
                .andExpect(jsonPath("$[0].payloadJson").doesNotExist());
    }

    @Test
    void rejectsListLimitAboveOneHundred() throws Exception {
        mockMvc.perform(get("/api/operations/job-outbox")
                        .param("status", "FAILED")
                        .param("limit", "101"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("limit must be between 1 and 100"));
    }

    @Test
    void replaysTerminalEvent() throws Exception {
        when(outboxService.replay("event-001")).thenReturn(event());

        mockMvc.perform(post("/api/operations/job-outbox/{eventId}/replay", "event-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eventId").value("event-001"))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void returnsNotFoundForMissingEvent() throws Exception {
        when(outboxService.replay("event-missing"))
                .thenThrow(new ResourceNotFoundException("Outbox event not found: event-missing"));

        mockMvc.perform(post("/api/operations/job-outbox/{eventId}/replay", "event-missing"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Outbox event not found: event-missing"));
    }

    @Test
    void returnsConflictForNonTerminalReplay() throws Exception {
        when(outboxService.replay(any()))
                .thenThrow(new InvalidJobOutboxStateException(
                        "Only terminal outbox events can be replayed: event-001"));

        mockMvc.perform(post("/api/operations/job-outbox/{eventId}/replay", "event-001"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Only terminal outbox events can be replayed: event-001"));
    }

    private JobOutboxEvent event() {
        return JobOutboxEvent.detectionRequested(
                "event-001",
                "task-001",
                "{\"taskId\":\"task-001\"}",
                CREATED_AT);
    }
}
