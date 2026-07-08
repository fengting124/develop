import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/primitives';
import {
  checkModelHealth,
  listDetections,
  listEvaluations,
  listModels,
  type DetectionHistoryItemResponse,
  type EvaluationRunResponse,
  type ModelHealthResponse,
  type ModelSummaryResponse,
} from '@/api/backend';
import { formatDate, formatPercent, statusTone } from '@/pages/adminFormat';
import styles from './AdminOverview.module.css';

function StatusPill({ status }: { status: string }) {
  return <span className={`${styles.status} ${styles[statusTone(status)]}`}>{status}</span>;
}

function StatCard({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <article className={styles.statCard}>
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{detail}</em>
    </article>
  );
}

export function AdminOverview() {
  const [detections, setDetections] = useState<DetectionHistoryItemResponse[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationRunResponse[]>([]);
  const [models, setModels] = useState<ModelSummaryResponse[]>([]);
  const [health, setHealth] = useState<Record<string, ModelHealthResponse>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadOverview() {
      try {
        const [nextDetections, nextEvaluations, nextModels] = await Promise.all([
          listDetections(),
          listEvaluations(),
          listModels(),
        ]);
        if (!active) return;
        setDetections(nextDetections);
        setEvaluations(nextEvaluations);
        setModels(nextModels);
        const healthResults = await Promise.allSettled(nextModels.map((model) => checkModelHealth(model.modelId)));
        if (!active) return;
        const nextHealth: Record<string, ModelHealthResponse> = {};
        healthResults.forEach((result) => {
          if (result.status === 'fulfilled') nextHealth[result.value.modelId] = result.value;
        });
        setHealth(nextHealth);
      } catch (apiError) {
        if (active) setError(apiError instanceof Error ? apiError.message : 'Failed to load workbench overview.');
      }
    }
    void loadOverview();
    return () => {
      active = false;
    };
  }, []);

  const completedDetections = detections.filter((item) => item.status === 'COMPLETED').length;
  const failedDetections = detections.filter((item) => item.status === 'FAILED').length;
  const latestEvaluation = evaluations.find((item) => item.status === 'COMPLETED') ?? evaluations[0];
  const failedEvaluations = evaluations.filter((item) => item.status === 'FAILED').length;
  const healthyModels = useMemo(() => models.filter((model) => health[model.modelId]?.healthy).length, [health, models]);
  const reviewCount = failedDetections + failedEvaluations;

  return (
    <PageContainer width="wide">
      <div className={styles.page}>
        <header className="pageHeader">
          <p className="italic-quote">- A workbench for measurable image authenticity -</p>
          <h1 className="pageTitle">Workbench</h1>
          <p className="pageEnglish">OVERVIEW</p>
        </header>

        {error ? <p className={styles.error}>{error}</p> : null}

        <section className={styles.stats}>
          <StatCard label="Detections" value={detections.length} detail={`${completedDetections} completed, ${failedDetections} failed`} />
          <StatCard label="Evaluations" value={evaluations.length} detail={latestEvaluation ? `Latest F1 ${formatPercent(latestEvaluation.f1)}` : 'No evaluation run'} />
          <StatCard label="Models" value={`${healthyModels}/${models.length}`} detail="healthy model endpoints" />
          <StatCard label="Review Queue" value={reviewCount} detail="failed or uncertain items" />
        </section>

        <section className={styles.grid}>
          <article className={styles.panel}>
            <header className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>Recent</span>
                <h2>Detection Tasks</h2>
              </div>
              <Link to="/admin/detections">Open</Link>
            </header>
            <div className={styles.list}>
              {detections.slice(0, 5).map((item) => (
                <div className={styles.listRow} key={item.taskId}>
                  <span>
                    <strong>{item.filename}</strong>
                    <em>{formatDate(item.createdAt)}</em>
                  </span>
                  <StatusPill status={item.status} />
                </div>
              ))}
              {!detections.length ? <p className={styles.empty}>No detection history yet.</p> : null}
            </div>
          </article>

          <article className={styles.panel}>
            <header className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>Quality</span>
                <h2>Evaluation Runs</h2>
              </div>
              <Link to="/admin/evaluations">Open</Link>
            </header>
            <div className={styles.list}>
              {evaluations.slice(0, 5).map((item) => (
                <div className={styles.listRow} key={item.evaluationId}>
                  <span>
                    <strong>{item.name}</strong>
                    <em>{item.datasetName} - F1 {formatPercent(item.f1)}</em>
                  </span>
                  <StatusPill status={item.status} />
                </div>
              ))}
              {!evaluations.length ? <p className={styles.empty}>No evaluations yet. Create one from a manifest.</p> : null}
            </div>
          </article>

          <article className={styles.panel}>
            <header className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>Runtime</span>
                <h2>Model Health</h2>
              </div>
              <Link to="/admin/models">Open</Link>
            </header>
            <div className={styles.list}>
              {models.map((model) => (
                <div className={styles.listRow} key={model.modelId}>
                  <span>
                    <strong>{model.displayName}</strong>
                    <em>{model.version} - threshold {model.defaultThreshold.toFixed(2)}</em>
                  </span>
                  <span className={`${styles.status} ${health[model.modelId]?.healthy ? styles.good : styles.bad}`}>
                    {health[model.modelId]?.status ?? 'UNKNOWN'}
                  </span>
                </div>
              ))}
              {!models.length ? <p className={styles.empty}>No model registry data available.</p> : null}
            </div>
          </article>

          <article className={styles.panel}>
            <header className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>Attention</span>
                <h2>Review Queue</h2>
              </div>
              <Link to="/admin/review">Open</Link>
            </header>
            <div className={styles.reviewBox}>
              <strong>{reviewCount}</strong>
              <span>items need inspection</span>
              <p>Failed detections and failed evaluation runs are grouped here so the system does not hide uncertainty.</p>
            </div>
          </article>
        </section>
      </div>
    </PageContainer>
  );
}
