package com.fengting.aigcforensics.evaluation.client;

import java.nio.charset.StandardCharsets;
import java.util.zip.CRC32;

import org.springframework.stereotype.Component;

import com.fengting.aigcforensics.domain.ModelLabel;

@Component
public class DeterministicEvaluationModelClient implements EvaluationModelClient {

    @Override
    public EvaluationModelResult predict(EvaluationModelRequest request) {
        double score = stableScore(request.modelId() + ":" + request.filename());
        ModelLabel label = score >= 0.5 ? ModelLabel.SYNTHETIC : ModelLabel.AUTHENTIC;
        int latencyMs = 10 + (int) Math.round(score * 20);
        return new EvaluationModelResult(label, score, latencyMs);
    }

    private double stableScore(String value) {
        CRC32 crc32 = new CRC32();
        crc32.update(value.getBytes(StandardCharsets.UTF_8));
        return crc32.getValue() / (double) 0xffffffffL;
    }
}

