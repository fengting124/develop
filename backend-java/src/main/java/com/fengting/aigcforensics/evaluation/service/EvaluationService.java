package com.fengting.aigcforensics.evaluation.service;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fengting.aigcforensics.domain.ModelLabel;
import com.fengting.aigcforensics.evaluation.domain.EvaluationRun;
import com.fengting.aigcforensics.evaluation.domain.EvaluationSample;
import com.fengting.aigcforensics.evaluation.domain.EvaluationStatus;
import com.fengting.aigcforensics.evaluation.dto.CreateEvaluationRequest;
import com.fengting.aigcforensics.evaluation.dto.EvaluationDetailResponse;
import com.fengting.aigcforensics.evaluation.dto.EvaluationRunResponse;
import com.fengting.aigcforensics.evaluation.dto.EvaluationSampleResponse;
import com.fengting.aigcforensics.evaluation.repository.EvaluationRunRepository;
import com.fengting.aigcforensics.evaluation.repository.EvaluationSampleRepository;
import com.fengting.aigcforensics.repository.ModelRegistryRepository;
import com.fengting.aigcforensics.service.ResourceNotFoundException;

@Service
public class EvaluationService {

    private final EvaluationRunRepository evaluationRunRepository;
    private final EvaluationSampleRepository evaluationSampleRepository;
    private final ModelRegistryRepository modelRegistryRepository;
    private final EvaluationMetricsCalculator metricsCalculator;
    private final Clock clock;

    @Autowired
    public EvaluationService(
            EvaluationRunRepository evaluationRunRepository,
            EvaluationSampleRepository evaluationSampleRepository,
            ModelRegistryRepository modelRegistryRepository,
            EvaluationMetricsCalculator metricsCalculator) {
        this(
                evaluationRunRepository,
                evaluationSampleRepository,
                modelRegistryRepository,
                metricsCalculator,
                Clock.systemUTC());
    }

    EvaluationService(
            EvaluationRunRepository evaluationRunRepository,
            EvaluationSampleRepository evaluationSampleRepository,
            ModelRegistryRepository modelRegistryRepository,
            EvaluationMetricsCalculator metricsCalculator,
            Clock clock) {
        this.evaluationRunRepository = evaluationRunRepository;
        this.evaluationSampleRepository = evaluationSampleRepository;
        this.modelRegistryRepository = modelRegistryRepository;
        this.metricsCalculator = metricsCalculator;
        this.clock = clock;
    }

    @Transactional
    public EvaluationRunResponse createEvaluation(CreateEvaluationRequest request) {
        modelRegistryRepository.findByModelId(request.modelId())
                .orElseThrow(() -> new ResourceNotFoundException("Model not found: " + request.modelId()));
        List<ManifestRow> rows = parseManifest(request.manifest());
        if (rows.isEmpty()) {
            throw new IllegalArgumentException("Manifest must contain at least one sample row");
        }

        Instant now = Instant.now(clock);
        String evaluationId = newExternalId("eval");
        List<EvaluationPredictionCase> completedCases = rows.stream()
                .filter(row -> row.predictedLabel() != null)
                .map(row -> new EvaluationPredictionCase(row.groundTruthLabel(), row.predictedLabel()))
                .toList();
        boolean completed = completedCases.size() == rows.size();
        EvaluationMetrics metrics = completed ? metricsCalculator.calculate(completedCases) : null;
        EvaluationRun run = evaluationRunRepository.save(new EvaluationRun(
                evaluationId,
                request.name(),
                request.datasetName(),
                request.modelId(),
                completed ? EvaluationStatus.COMPLETED : EvaluationStatus.QUEUED,
                rows.size(),
                completedCases.size(),
                metrics == null ? null : metrics.accuracy(),
                metrics == null ? null : metrics.precision(),
                metrics == null ? null : metrics.recall(),
                metrics == null ? null : metrics.f1(),
                0,
                3,
                now,
                completed ? now : null,
                completed ? now : null,
                null));
        for (ManifestRow row : rows) {
            evaluationSampleRepository.save(new EvaluationSample(
                    newExternalId("sample"),
                    evaluationId,
                    row.filename(),
                    row.groundTruthLabel(),
                    row.predictedLabel(),
                    row.score(),
                    row.latencyMs(),
                    row.predictedLabel() == null ? null : row.predictedLabel() == row.groundTruthLabel(),
                    null,
                    now));
        }
        return toRunResponse(run);
    }

    @Transactional(readOnly = true)
    public List<EvaluationRunResponse> listEvaluations() {
        return evaluationRunRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toRunResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public EvaluationDetailResponse getEvaluation(String evaluationId) {
        EvaluationRun run = findRun(evaluationId);
        List<EvaluationSampleResponse> samples = evaluationSampleRepository
                .findByEvaluationIdOrderByCreatedAtAsc(evaluationId)
                .stream()
                .map(this::toSampleResponse)
                .toList();
        return new EvaluationDetailResponse(
                run.getEvaluationId(),
                run.getName(),
                run.getDatasetName(),
                run.getModelId(),
                run.getStatus(),
                run.getTotalSamples(),
                run.getCompletedSamples(),
                run.getAccuracy(),
                run.getPrecision(),
                run.getRecall(),
                run.getF1(),
                run.getAttemptCount(),
                run.getMaxAttempts(),
                run.getCreatedAt(),
                run.getStartedAt(),
                run.getCompletedAt(),
                run.getFailureReason(),
                samples);
    }

    @Transactional(readOnly = true)
    public List<EvaluationSampleResponse> listSamples(String evaluationId, Boolean correct) {
        findRun(evaluationId);
        List<EvaluationSample> samples = correct == null
                ? evaluationSampleRepository.findByEvaluationIdOrderByCreatedAtAsc(evaluationId)
                : evaluationSampleRepository.findByEvaluationIdAndCorrectOrderByCreatedAtAsc(evaluationId, correct);
        return samples.stream().map(this::toSampleResponse).toList();
    }

    private EvaluationRun findRun(String evaluationId) {
        return evaluationRunRepository.findByEvaluationId(evaluationId)
                .orElseThrow(() -> new ResourceNotFoundException("Evaluation not found: " + evaluationId));
    }

    private List<ManifestRow> parseManifest(String manifest) {
        String[] lines = manifest.lines().filter(line -> !line.isBlank()).toArray(String[]::new);
        if (lines.length == 0) {
            return List.of();
        }
        Map<String, Integer> header = parseHeader(lines[0]);
        requireColumn(header, "filename");
        requireColumn(header, "groundTruthLabel");

        List<ManifestRow> rows = new ArrayList<>();
        for (int lineNumber = 2; lineNumber <= lines.length; lineNumber++) {
            String[] values = lines[lineNumber - 1].split(",", -1);
            String filename = value(values, header, "filename");
            if (filename.isBlank()) {
                throw new IllegalArgumentException("Missing filename at manifest line " + lineNumber);
            }
            ModelLabel groundTruth = parseBinaryLabel(value(values, header, "groundTruthLabel"), lineNumber);
            String predictedValue = value(values, header, "predictedLabel");
            ModelLabel predicted = predictedValue.isBlank() ? null : parseBinaryLabel(predictedValue, lineNumber);
            Double score = parseOptionalDouble(value(values, header, "score"), "score", lineNumber);
            Integer latencyMs = parseOptionalInteger(value(values, header, "latencyMs"), "latencyMs", lineNumber);
            rows.add(new ManifestRow(filename, groundTruth, predicted, score, latencyMs));
        }
        return rows;
    }

    private Map<String, Integer> parseHeader(String headerLine) {
        String[] columns = headerLine.split(",", -1);
        Map<String, Integer> header = new HashMap<>();
        for (int index = 0; index < columns.length; index++) {
            header.put(columns[index].trim(), index);
        }
        return header;
    }

    private void requireColumn(Map<String, Integer> header, String column) {
        if (!header.containsKey(column)) {
            throw new IllegalArgumentException("Manifest is missing required column: " + column);
        }
    }

    private String value(String[] values, Map<String, Integer> header, String column) {
        Integer index = header.get(column);
        if (index == null || index >= values.length) {
            return "";
        }
        return values[index].trim();
    }

    private ModelLabel parseBinaryLabel(String value, int lineNumber) {
        try {
            ModelLabel label = ModelLabel.valueOf(value);
            if (label == ModelLabel.AUTHENTIC || label == ModelLabel.SYNTHETIC) {
                return label;
            }
        } catch (IllegalArgumentException ignored) {
            // handled below with a stable API message
        }
        throw new IllegalArgumentException("Unsupported label at manifest line " + lineNumber + ": " + value);
    }

    private Double parseOptionalDouble(String value, String column, int lineNumber) {
        if (value.isBlank()) {
            return null;
        }
        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("Invalid " + column + " at manifest line " + lineNumber + ": " + value);
        }
    }

    private Integer parseOptionalInteger(String value, String column, int lineNumber) {
        if (value.isBlank()) {
            return null;
        }
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("Invalid " + column + " at manifest line " + lineNumber + ": " + value);
        }
    }

    private EvaluationRunResponse toRunResponse(EvaluationRun run) {
        return new EvaluationRunResponse(
                run.getEvaluationId(),
                run.getName(),
                run.getDatasetName(),
                run.getModelId(),
                run.getStatus(),
                run.getTotalSamples(),
                run.getCompletedSamples(),
                run.getAccuracy(),
                run.getPrecision(),
                run.getRecall(),
                run.getF1(),
                run.getAttemptCount(),
                run.getMaxAttempts(),
                run.getCreatedAt(),
                run.getStartedAt(),
                run.getCompletedAt(),
                run.getFailureReason());
    }

    private EvaluationSampleResponse toSampleResponse(EvaluationSample sample) {
        return new EvaluationSampleResponse(
                sample.getSampleId(),
                sample.getEvaluationId(),
                sample.getFilename(),
                sample.getGroundTruthLabel(),
                sample.getPredictedLabel(),
                sample.getScore(),
                sample.getLatencyMs(),
                sample.getCorrect(),
                sample.getFailureReason(),
                sample.getCreatedAt());
    }

    private String newExternalId(String prefix) {
        return prefix + "_" + UUID.randomUUID().toString().replace("-", "");
    }

    private record ManifestRow(
            String filename,
            ModelLabel groundTruthLabel,
            ModelLabel predictedLabel,
            Double score,
            Integer latencyMs) {
    }
}
