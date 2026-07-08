export type DetectionStatus = 'QUEUED' | 'INFERENCING' | 'COMPLETED' | 'FAILED';
export type EvaluationStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type ModelLabel = 'AUTHENTIC' | 'SYNTHETIC' | 'UNCERTAIN';
export type ReportVerdict = 'LIKELY_AUTHENTIC' | 'LIKELY_SYNTHETIC' | 'UNCERTAIN';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export interface CreateImageDetectionResponse {
  assetId: string;
  taskId: string;
  status: DetectionStatus;
  filename: string;
  contentType: string;
  fileSize: number;
  sha256: string;
  width: number;
  height: number;
}

export interface DetectionPredictionResponse {
  predictionId: string;
  modelId: string;
  modelVersion: string;
  rawScore: number;
  normalizedScore: number;
  label: ModelLabel;
  threshold: number;
  latencyMs: number;
  createdAt: string;
}

export interface DetectionReportResponse {
  reportId: string;
  verdict: ReportVerdict;
  confidence: number;
  summary: string;
  riskLevel: RiskLevel;
  createdAt: string;
}

export interface DetectionDetailResponse {
  taskId: string;
  assetId: string;
  status: DetectionStatus;
  failureReason: string | null;
  filename: string;
  contentType: string;
  fileSize: number;
  sha256: string;
  width: number;
  height: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  predictions: DetectionPredictionResponse[];
  report: DetectionReportResponse | null;
}

export interface DetectionHistoryItemResponse {
  taskId: string;
  assetId: string;
  status: DetectionStatus;
  failureReason: string | null;
  filename: string;
  contentType: string;
  fileSize: number;
  sha256: string;
  width: number;
  height: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  report: DetectionReportResponse | null;
}

export interface ModelSummaryResponse {
  modelId: string;
  displayName: string;
  modelType: string;
  version: string;
  endpointUrl: string;
  enabled: boolean;
  defaultThreshold: number;
  weight: number;
  description: string;
}

export interface ModelHealthResponse {
  modelId: string;
  endpointUrl: string;
  healthy: boolean;
  status: 'UP' | 'DOWN';
  message: string;
  checkedAt: string;
}

export interface EvaluationRunResponse {
  evaluationId: string;
  name: string;
  datasetName: string;
  modelId: string;
  status: EvaluationStatus;
  totalSamples: number;
  completedSamples: number;
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  attemptCount: number;
  maxAttempts: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failureReason: string | null;
}

export interface EvaluationSampleResponse {
  sampleId: string;
  evaluationId: string;
  filename: string;
  groundTruthLabel: ModelLabel;
  predictedLabel: ModelLabel | null;
  score: number | null;
  latencyMs: number | null;
  correct: boolean | null;
  failureReason: string | null;
  createdAt: string;
}

export interface EvaluationDetailResponse extends EvaluationRunResponse {
  samples: EvaluationSampleResponse[];
}

export interface CreateEvaluationRequest {
  name: string;
  datasetName: string;
  modelId: string;
  manifest: string;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new ApiError(message || `Request failed with status ${response.status}`, response.status);
  }

  return response.json() as Promise<T>;
}

export function createImageDetection(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return apiRequest<CreateImageDetectionResponse>('/api/detections/images', {
    method: 'POST',
    body: formData,
  });
}

export function runDetectionAsync(taskId: string) {
  return apiRequest<DetectionDetailResponse>(`/api/detections/${encodeURIComponent(taskId)}/run-async`, {
    method: 'POST',
  });
}

export function getDetection(taskId: string) {
  return apiRequest<DetectionDetailResponse>(`/api/detections/${encodeURIComponent(taskId)}`);
}

export function listDetections() {
  return apiRequest<DetectionHistoryItemResponse[]>('/api/detections');
}

export function getReport(reportId: string) {
  return apiRequest<DetectionDetailResponse>(`/api/reports/${encodeURIComponent(reportId)}`);
}

export function listModels() {
  return apiRequest<ModelSummaryResponse[]>('/api/models');
}

export function checkModelHealth(modelId: string) {
  return apiRequest<ModelHealthResponse>(`/api/models/${encodeURIComponent(modelId)}/health-check`, {
    method: 'POST',
  });
}

export function createEvaluation(request: CreateEvaluationRequest) {
  return apiRequest<EvaluationRunResponse>('/api/evaluations', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export function listEvaluations() {
  return apiRequest<EvaluationRunResponse[]>('/api/evaluations');
}

export function getEvaluation(evaluationId: string) {
  return apiRequest<EvaluationDetailResponse>(`/api/evaluations/${encodeURIComponent(evaluationId)}`);
}

export function runEvaluation(evaluationId: string) {
  return apiRequest<EvaluationDetailResponse>(`/api/evaluations/${encodeURIComponent(evaluationId)}/run`, {
    method: 'POST',
  });
}

export function retryEvaluation(evaluationId: string) {
  return apiRequest<EvaluationDetailResponse>(`/api/evaluations/${encodeURIComponent(evaluationId)}/retry`, {
    method: 'POST',
  });
}

export function listEvaluationSamples(evaluationId: string, correct?: boolean) {
  const query = typeof correct === 'boolean' ? `?correct=${String(correct)}` : '';
  return apiRequest<EvaluationSampleResponse[]>(`/api/evaluations/${encodeURIComponent(evaluationId)}/samples${query}`);
}
