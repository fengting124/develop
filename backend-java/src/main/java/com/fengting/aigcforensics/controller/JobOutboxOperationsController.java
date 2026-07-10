package com.fengting.aigcforensics.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fengting.aigcforensics.domain.JobOutboxEvent;
import com.fengting.aigcforensics.domain.JobOutboxStatus;
import com.fengting.aigcforensics.dto.operations.JobOutboxEventResponse;
import com.fengting.aigcforensics.service.JobOutboxService;

@RestController
@RequestMapping("/api/operations/job-outbox")
public class JobOutboxOperationsController {

    private static final int DEFAULT_LIMIT = 50;
    private static final int MAX_LIMIT = 100;

    private final JobOutboxService outboxService;

    public JobOutboxOperationsController(JobOutboxService outboxService) {
        this.outboxService = outboxService;
    }

    @GetMapping
    public List<JobOutboxEventResponse> list(
            @RequestParam(defaultValue = "FAILED") JobOutboxStatus status,
            @RequestParam(defaultValue = "50") int limit) {
        validateLimit(limit);
        return outboxService.list(status, limit).stream()
                .map(this::toResponse)
                .toList();
    }

    @PostMapping("/{eventId}/replay")
    public JobOutboxEventResponse replay(@PathVariable String eventId) {
        return toResponse(outboxService.replay(eventId));
    }

    private void validateLimit(int limit) {
        if (limit < 1 || limit > MAX_LIMIT) {
            throw new IllegalArgumentException("limit must be between 1 and 100");
        }
    }

    private JobOutboxEventResponse toResponse(JobOutboxEvent event) {
        return new JobOutboxEventResponse(
                event.getEventId(),
                event.getEventType(),
                event.getAggregateType(),
                event.getAggregateId(),
                event.getStatus(),
                event.getAttemptCount(),
                event.getAvailableAt(),
                event.getLastError(),
                event.getCreatedAt(),
                event.getUpdatedAt(),
                event.getPublishedAt());
    }
}
