package com.fengting.aigcforensics.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.fengting.aigcforensics.domain.DetectionTask;

import jakarta.persistence.LockModeType;

public interface DetectionTaskRepository extends JpaRepository<DetectionTask, Long> {

    Optional<DetectionTask> findByTaskId(String taskId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select task from DetectionTask task where task.taskId = :taskId")
    Optional<DetectionTask> findByTaskIdForUpdate(@Param("taskId") String taskId);

    List<DetectionTask> findAllByOrderByCreatedAtDesc();
}
