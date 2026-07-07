package com.fengting.aigcforensics.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.fengting.aigcforensics.domain.DetectionReport;

public interface DetectionReportRepository extends JpaRepository<DetectionReport, Long> {

    Optional<DetectionReport> findByReportId(String reportId);

    Optional<DetectionReport> findByTaskId(String taskId);
}
