package com.fengting.aigcforensics.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.fengting.aigcforensics.domain.ModelPrediction;

public interface ModelPredictionRepository extends JpaRepository<ModelPrediction, Long> {

    Optional<ModelPrediction> findByPredictionId(String predictionId);

    List<ModelPrediction> findByTaskIdOrderByCreatedAtAsc(String taskId);
}
