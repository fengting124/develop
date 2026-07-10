package com.fengting.aigcforensics.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.fengting.aigcforensics.domain.JobOutboxEvent;
import com.fengting.aigcforensics.domain.JobOutboxEventType;
import com.fengting.aigcforensics.domain.JobOutboxStatus;

import jakarta.persistence.LockModeType;

public interface JobOutboxEventRepository extends JpaRepository<JobOutboxEvent, Long> {

    Optional<JobOutboxEvent> findByEventId(String eventId);

    Optional<JobOutboxEvent> findByEventTypeAndAggregateId(
            JobOutboxEventType eventType,
            String aggregateId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select event from JobOutboxEvent event where event.eventId = :eventId")
    Optional<JobOutboxEvent> findByEventIdForUpdate(@Param("eventId") String eventId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select event from JobOutboxEvent event
            where event.status = :status and event.availableAt <= :now
            order by event.createdAt asc
            """)
    List<JobOutboxEvent> findClaimable(
            @Param("status") JobOutboxStatus status,
            @Param("now") Instant now,
            Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select event from JobOutboxEvent event
            where event.status = :status and event.updatedAt <= :staleBefore
            order by event.updatedAt asc
            """)
    List<JobOutboxEvent> findStalePublishing(
            @Param("status") JobOutboxStatus status,
            @Param("staleBefore") Instant staleBefore,
            Pageable pageable);

    List<JobOutboxEvent> findByStatusOrderByCreatedAtDesc(
            JobOutboxStatus status,
            Pageable pageable);
}
