import type { ModelLabel } from '@/api/backend';

export function formatPercent(value?: number | null) {
  if (value === null || value === undefined) return 'N/A';
  return `${Math.round(value * 100)}%`;
}

export function formatDate(value?: string | null) {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function statusTone(status: string) {
  if (status === 'COMPLETED') return 'good';
  if (status === 'FAILED') return 'bad';
  if (status === 'QUEUED' || status === 'RUNNING' || status === 'INFERENCING') return 'warn';
  return 'neutral';
}

export function labelText(label?: ModelLabel | null) {
  if (label === 'AUTHENTIC') return 'Authentic';
  if (label === 'SYNTHETIC') return 'Synthetic';
  if (label === 'UNCERTAIN') return 'Uncertain';
  return 'N/A';
}
