package com.fengting.aigcforensics.service;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.fengting.aigcforensics.domain.JobOutboxEvent;

@Service
@ConditionalOnProperty(
        prefix = "app.jobs.outbox",
        name = "dispatcher-enabled",
        havingValue = "true",
        matchIfMissing = true)
public class JobOutboxDispatcher {

    private final JobOutboxService outboxService;
    private final JobOutboxPublisher publisher;

    public JobOutboxDispatcher(JobOutboxService outboxService, JobOutboxPublisher publisher) {
        this.outboxService = outboxService;
        this.publisher = publisher;
    }

    @Scheduled(fixedDelayString = "${app.jobs.outbox.poll-delay-ms:500}")
    public void pollOnce() {
        outboxService.claimNext().ifPresent(this::publish);
    }

    private void publish(JobOutboxEvent event) {
        try {
            publisher.publish(event);
            outboxService.markPublished(event.getEventId());
        } catch (RuntimeException exception) {
            outboxService.markPublishFailed(event.getEventId(), failureMessage(exception));
        }
    }

    private String failureMessage(RuntimeException exception) {
        if (exception.getMessage() == null || exception.getMessage().isBlank()) {
            return exception.getClass().getSimpleName();
        }
        return exception.getMessage();
    }
}
