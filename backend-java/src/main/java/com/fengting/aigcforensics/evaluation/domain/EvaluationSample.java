package com.fengting.aigcforensics.evaluation.domain;

import java.time.Instant;

import com.fengting.aigcforensics.domain.ModelLabel;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "evaluation_sample")
public class EvaluationSample {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sample_id", nullable = false, unique = true, length = 64)
    private String sampleId;

    @Column(name = "evaluation_id", nullable = false, length = 64)
    private String evaluationId;

    @Column(name = "filename", nullable = false)
    private String filename;

    @Enumerated(EnumType.STRING)
    @Column(name = "ground_truth_label", nullable = false, length = 32)
    private ModelLabel groundTruthLabel;

    @Enumerated(EnumType.STRING)
    @Column(name = "predicted_label", length = 32)
    private ModelLabel predictedLabel;

    @Column(name = "score")
    private Double score;

    @Column(name = "latency_ms")
    private Integer latencyMs;

    @Column(name = "correct")
    private Boolean correct;

    @Column(name = "failure_reason", length = 2048)
    private String failureReason;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected EvaluationSample() {
    }

    public EvaluationSample(
            String sampleId,
            String evaluationId,
            String filename,
            ModelLabel groundTruthLabel,
            ModelLabel predictedLabel,
            Double score,
            Integer latencyMs,
            Boolean correct,
            String failureReason,
            Instant createdAt) {
        this.sampleId = sampleId;
        this.evaluationId = evaluationId;
        this.filename = filename;
        this.groundTruthLabel = groundTruthLabel;
        this.predictedLabel = predictedLabel;
        this.score = score;
        this.latencyMs = latencyMs;
        this.correct = correct;
        this.failureReason = failureReason;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public String getSampleId() {
        return sampleId;
    }

    public String getEvaluationId() {
        return evaluationId;
    }

    public String getFilename() {
        return filename;
    }

    public ModelLabel getGroundTruthLabel() {
        return groundTruthLabel;
    }

    public ModelLabel getPredictedLabel() {
        return predictedLabel;
    }

    public Double getScore() {
        return score;
    }

    public Integer getLatencyMs() {
        return latencyMs;
    }

    public Boolean getCorrect() {
        return correct;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void markPredicted(ModelLabel predictedLabel, Double score, Integer latencyMs) {
        this.predictedLabel = predictedLabel;
        this.score = score;
        this.latencyMs = latencyMs;
        this.correct = predictedLabel == groundTruthLabel;
        this.failureReason = null;
    }

    public void markFailed(String failureReason) {
        this.failureReason = failureReason;
    }
}
