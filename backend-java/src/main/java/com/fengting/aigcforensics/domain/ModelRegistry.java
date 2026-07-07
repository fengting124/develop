package com.fengting.aigcforensics.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "model_registry")
public class ModelRegistry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "model_id", nullable = false, unique = true, length = 64)
    private String modelId;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "model_type", nullable = false, length = 64)
    private String modelType;

    @Column(name = "version", nullable = false, length = 64)
    private String version;

    @Column(name = "endpoint_url", nullable = false, length = 1024)
    private String endpointUrl;

    @Column(name = "enabled", nullable = false)
    private boolean enabled;

    @Column(name = "default_threshold", nullable = false)
    private double defaultThreshold;

    @Column(name = "weight", nullable = false)
    private double weight;

    @Column(name = "description", length = 2048)
    private String description;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ModelRegistry() {
    }

    public ModelRegistry(
            String modelId,
            String displayName,
            String modelType,
            String version,
            String endpointUrl,
            boolean enabled,
            double defaultThreshold,
            double weight,
            String description,
            Instant createdAt,
            Instant updatedAt) {
        this.modelId = modelId;
        this.displayName = displayName;
        this.modelType = modelType;
        this.version = version;
        this.endpointUrl = endpointUrl;
        this.enabled = enabled;
        this.defaultThreshold = defaultThreshold;
        this.weight = weight;
        this.description = description;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public Long getId() {
        return id;
    }

    public String getModelId() {
        return modelId;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getModelType() {
        return modelType;
    }

    public String getVersion() {
        return version;
    }

    public String getEndpointUrl() {
        return endpointUrl;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public double getDefaultThreshold() {
        return defaultThreshold;
    }

    public double getWeight() {
        return weight;
    }

    public String getDescription() {
        return description;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
