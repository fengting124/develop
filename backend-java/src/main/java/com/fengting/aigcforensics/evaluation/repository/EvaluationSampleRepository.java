package com.fengting.aigcforensics.evaluation.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.fengting.aigcforensics.evaluation.domain.EvaluationSample;

public interface EvaluationSampleRepository extends JpaRepository<EvaluationSample, Long> {

    List<EvaluationSample> findByEvaluationIdOrderByCreatedAtAsc(String evaluationId);

    List<EvaluationSample> findByEvaluationIdAndCorrectOrderByCreatedAtAsc(String evaluationId, Boolean correct);
}
