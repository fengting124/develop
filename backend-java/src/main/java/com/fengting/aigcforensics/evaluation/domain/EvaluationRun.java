package com.fengting.aigcforensics.evaluation.domain;

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
@Table(name = "evaluation_run")
public class EvaluationRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "evaluation_id", nullable = false, unique = true, length = 64)
    private String evaluationId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "dataset_name", nullable = false)
    private String datasetName;

    @Column(name = "model_id", nullable = false, length = 64)
    private String modelId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private EvaluationStatus status;

    @Column(name = "total_samples", nullable = false)
    private int totalSamples;

    @Column(name = "completed_samples", nullable = false)
    private int completedSamples;

    @Column(name = "accuracy")
    private Double accuracy;

    @Column(name = "precision_score")
    private Double precision;

    @Column(name = "recall_score")
    private Double recall;

    @Column(name = "f1_score")
    private Double f1;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "failure_reason", length = 2048)
    private String failureReason;

    protected EvaluationRun() {
    }

    public EvaluationRun(
            String evaluationId,
            String name,
            String datasetName,
            String modelId,
            EvaluationStatus status,
            int totalSamples,
            int completedSamples,
            Double accuracy,
            Double precision,
            Double recall,
            Double f1,
            Instant createdAt,
            Instant startedAt,
            Instant completedAt,
            String failureReason) {
        this.evaluationId = evaluationId;
        this.name = name;
        this.datasetName = datasetName;
        this.modelId = modelId;
        this.status = status;
        this.totalSamples = totalSamples;
        this.completedSamples = completedSamples;
        this.accuracy = accuracy;
        this.precision = precision;
        this.recall = recall;
        this.f1 = f1;
        this.createdAt = createdAt;
        this.startedAt = startedAt;
        this.completedAt = completedAt;
        this.failureReason = failureReason;
    }

    public Long getId() {
        return id;
    }

    public String getEvaluationId() {
        return evaluationId;
    }

    public String getName() {
        return name;
    }

    public String getDatasetName() {
        return datasetName;
    }

    public String getModelId() {
        return modelId;
    }

    public EvaluationStatus getStatus() {
        return status;
    }

    public int getTotalSamples() {
        return totalSamples;
    }

    public int getCompletedSamples() {
        return completedSamples;
    }

    public Double getAccuracy() {
        return accuracy;
    }

    public Double getPrecision() {
        return precision;
    }

    public Double getRecall() {
        return recall;
    }

    public Double getF1() {
        return f1;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public String getFailureReason() {
        return failureReason;
    }
}
