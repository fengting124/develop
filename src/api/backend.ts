export type DetectionStatus = 'QUEUED' | 'INFERENCING' | 'COMPLETED' | 'FAILED';
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

export function listModels() {
  return apiRequest<ModelSummaryResponse[]>('/api/models');
}
