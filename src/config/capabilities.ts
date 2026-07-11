export type CapabilityStatus = 'implemented' | 'server-pending' | 'showcase' | 'non-goal';

export interface ProductCapability {
  id: string;
  name: string;
  status: CapabilityStatus;
  description: string;
  formalRoute?: string;
  showcaseRoute?: string;
  evidence: readonly string[];
}

export const productCapabilities = [
  {
    id: 'image-detection',
    name: 'Image detection',
    status: 'implemented',
    description: 'Validated image ingestion, durable dispatch, model-service execution, and reports.',
    formalRoute: '/detect/image',
    evidence: ['backend-java detection workflow', 'Redis outbox worker', 'frontend image detection flow'],
  },
  {
    id: 'evaluation',
    name: 'Model evaluation',
    status: 'implemented',
    description: 'Persisted evaluation runs, sample results, aggregate metrics, and error inspection.',
    formalRoute: '/admin/evaluations',
    evidence: ['evaluation_run and evaluation_sample tables', 'evaluation backend tests', 'admin evaluation UI'],
  },
  {
    id: 'model-registry',
    name: 'Model registry',
    status: 'implemented',
    description: 'Registered model endpoints, versions, thresholds, weights, and health checks.',
    formalRoute: '/admin/models',
    evidence: ['model_registry table', 'model registry service tests', 'admin model UI'],
  },
  {
    id: 'review-queue',
    name: 'Operational review view',
    status: 'implemented',
    description: 'Read-only aggregation of failed tasks, failed evaluations, and incorrect samples.',
    formalRoute: '/admin/review',
    evidence: ['AdminReview backend integration', 'detection failure records', 'evaluation sample results'],
  },
  {
    id: 'real-model-runtime',
    name: 'GPU model runtime',
    status: 'server-pending',
    description: 'The runtime adapter exists; real weights, CUDA, and benchmark evidence require the server.',
    evidence: [],
  },
  {
    id: 'video-detection',
    name: 'Video detection concept',
    status: 'showcase',
    description: 'Visual interaction concept without a production backend or model contract.',
    showcaseRoute: '/dev/showcase/video-detection',
    evidence: [],
  },
  {
    id: 'expert-lora',
    name: 'Expert and LoRA concepts',
    status: 'showcase',
    description: 'Visual model-ensemble concepts that are not formal product capabilities.',
    showcaseRoute: '/dev/showcase/image-pipeline',
    evidence: [],
  },
  {
    id: 'audio-detection',
    name: 'Audio detection',
    status: 'non-goal',
    description: 'Outside the image-only product boundary.',
    evidence: [],
  },
  {
    id: 'model-training',
    name: 'Model training',
    status: 'non-goal',
    description: 'The project integrates proven models and does not claim original model training.',
    evidence: [],
  },
] as const satisfies readonly ProductCapability[];

export const formalCapabilityIds = productCapabilities
  .filter((capability) => capability.status === 'implemented')
  .map((capability) => capability.id);

export const showcaseCapabilityIds = productCapabilities
  .filter((capability) => capability.status === 'showcase')
  .map((capability) => capability.id);
