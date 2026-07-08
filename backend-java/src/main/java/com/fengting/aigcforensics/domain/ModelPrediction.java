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
@Table(name = "model_prediction")
public class ModelPrediction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "prediction_id", nullable = false, unique = true, length = 64)
    private String predictionId;

    @Column(name = "task_id", nullable = false, length = 64)
    private String taskId;

    @Column(name = "model_id", nullable = false, length = 64)
    private String modelId;

    @Column(name = "model_version", nullable = false, length = 64)
    private String modelVersion;

    @Column(name = "raw_score", nullable = false)
    private double rawScore;

    @Column(name = "normalized_score", nullable = false)
    private double normalizedScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "label", nullable = false, length = 32)
    private ModelLabel label;

    @Column(name = "threshold_value", nullable = false)
    private double threshold;

    @Column(name = "latency_ms", nullable = false)
    private int latencyMs;

    @Column(name = "raw_response_json", nullable = false)
    private String rawResponseJson;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected ModelPrediction() {
    }

    public ModelPrediction(
            String predictionId,
            String taskId,
            String modelId,
            String modelVersion,
            double rawScore,
            double normalizedScore,
            ModelLabel label,
            double threshold,
            int latencyMs,
            String rawResponseJson,
            Instant createdAt) {
        this.predictionId = predictionId;
        this.taskId = taskId;
        this.modelId = modelId;
        this.modelVersion = modelVersion;
        this.rawScore = rawScore;
        this.normalizedScore = normalizedScore;
        this.label = label;
        this.threshold = threshold;
        this.latencyMs = latencyMs;
        this.rawResponseJson = rawResponseJson;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public String getPredictionId() {
        return predictionId;
    }

    public String getTaskId() {
        return taskId;
    }

    public String getModelId() {
        return modelId;
    }

    public String getModelVersion() {
        return modelVersion;
    }

    public double getRawScore() {
        return rawScore;
    }

    public double getNormalizedScore() {
        return normalizedScore;
    }

    public ModelLabel getLabel() {
        return label;
    }

    public double getThreshold() {
        return threshold;
    }

    public int getLatencyMs() {
        return latencyMs;
    }

    public String getRawResponseJson() {
        return rawResponseJson;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
