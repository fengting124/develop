package com.fengting.aigcforensics.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.fengting.aigcforensics.domain.DetectionTask;

public interface DetectionTaskRepository extends JpaRepository<DetectionTask, Long> {

    Optional<DetectionTask> findByTaskId(String taskId);

    List<DetectionTask> findAllByOrderByCreatedAtDesc();
}
