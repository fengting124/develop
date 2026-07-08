package com.fengting.aigcforensics.evaluation.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import com.fengting.aigcforensics.domain.ModelLabel;
import com.fengting.aigcforensics.evaluation.domain.EvaluationRun;
import com.fengting.aigcforensics.evaluation.domain.EvaluationSample;
import com.fengting.aigcforensics.evaluation.domain.EvaluationStatus;

@DataJpaTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate"
})
class EvaluationRepositoryTest {

    @Autowired
    private EvaluationRunRepository evaluationRunRepository;

    @Autowired
    private EvaluationSampleRepository evaluationSampleRepository;

    @Test
    void persistsEvaluationRunAndSamples() {
        Instant now = Instant.parse("2026-07-08T00:00:00Z");
        evaluationRunRepository.save(new EvaluationRun(
                "eval_001",
                "Smoke Dataset",
                "sample-v1",
                "nonescape-mini",
                EvaluationStatus.COMPLETED,
                2,
                2,
                0.5,
                0.0,
                0.0,
                0.0,
                now,
                now,
                now,
                null));
        evaluationSampleRepository.save(new EvaluationSample(
                "sample_001",
                "eval_001",
                "real_001.jpg",
                ModelLabel.AUTHENTIC,
                ModelLabel.AUTHENTIC,
                0.12,
                31,
                true,
                null,
                now));
        evaluationSampleRepository.save(new EvaluationSample(
                "sample_002",
                "eval_001",
                "fake_001.jpg",
                ModelLabel.SYNTHETIC,
                ModelLabel.AUTHENTIC,
                0.44,
                28,
                false,
                null,
                now));

        assertThat(evaluationRunRepository.findByEvaluationId("eval_001"))
                .isPresent()
                .get()
                .extracting(EvaluationRun::getStatus)
                .isEqualTo(EvaluationStatus.COMPLETED);
        assertThat(evaluationSampleRepository.findByEvaluationIdOrderByCreatedAtAsc("eval_001"))
                .extracting(EvaluationSample::getFilename)
                .containsExactly("real_001.jpg", "fake_001.jpg");
        assertThat(evaluationSampleRepository.findByEvaluationIdAndCorrectOrderByCreatedAtAsc("eval_001", false))
                .extracting(EvaluationSample::getSampleId)
                .containsExactly("sample_002");
    }
}
