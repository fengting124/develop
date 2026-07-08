package com.fengting.aigcforensics.dto.detection;

import java.time.Instant;

import com.fengting.aigcforensics.domain.ReportVerdict;
import com.fengting.aigcforensics.domain.RiskLevel;

public record DetectionReportResponse(
        String reportId,
        ReportVerdict verdict,
        double confidence,
        String summary,
        RiskLevel riskLevel,
        Instant createdAt) {
}
