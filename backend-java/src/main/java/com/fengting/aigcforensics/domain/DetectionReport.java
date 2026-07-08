package com.fengting.aigcforensics.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "detection_report")
public class DetectionReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "report_id", nullable = false, unique = true, length = 64)
    private String reportId;

    @Column(name = "task_id", nullable = false, unique = true, length = 64)
    private String taskId;

    @Enumerated(EnumType.STRING)
    @Column(name = "verdict", nullable = false, length = 32)
    private ReportVerdict verdict;

    @Column(name = "confidence", nullable = false)
    private double confidence;

    @Column(name = "summary", nullable = false, length = 2048)
    private String summary;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level", nullable = false, length = 32)
    private RiskLevel riskLevel;

    @Column(name = "report_json", nullable = false)
    private String reportJson;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected DetectionReport() {
    }

    public DetectionReport(
            String reportId,
            String taskId,
            ReportVerdict verdict,
            double confidence,
            String summary,
            RiskLevel riskLevel,
            String reportJson,
            Instant createdAt) {
        this.reportId = reportId;
        this.taskId = taskId;
        this.verdict = verdict;
        this.confidence = confidence;
        this.summary = summary;
        this.riskLevel = riskLevel;
        this.reportJson = reportJson;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public String getReportId() {
        return reportId;
    }

    public String getTaskId() {
        return taskId;
    }

    public ReportVerdict getVerdict() {
        return verdict;
    }

    public double getConfidence() {
        return confidence;
    }

    public String getSummary() {
        return summary;
    }

    public RiskLevel getRiskLevel() {
        return riskLevel;
    }

    public String getReportJson() {
        return reportJson;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
