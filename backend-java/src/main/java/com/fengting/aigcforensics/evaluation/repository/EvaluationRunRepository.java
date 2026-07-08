package com.fengting.aigcforensics.evaluation.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.fengting.aigcforensics.evaluation.domain.EvaluationRun;

public interface EvaluationRunRepository extends JpaRepository<EvaluationRun, Long> {

    Optional<EvaluationRun> findByEvaluationId(String evaluationId);

    List<EvaluationRun> findAllByOrderByCreatedAtDesc();
}
