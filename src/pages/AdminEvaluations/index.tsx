import { useEffect, useMemo, useState } from 'react';
import { Button, Input, PageContainer, TextArea } from '@/components/primitives';
import {
  createEvaluation,
  getEvaluation,
  listEvaluations,
  retryEvaluation,
  runEvaluation,
  type EvaluationDetailResponse,
  type EvaluationRunResponse,
} from '@/api/backend';
import { formatDate, formatPercent, labelText, statusTone } from '@/pages/adminFormat';
import styles from './AdminEvaluations.module.css';

const sampleManifest = `filename,groundTruthLabel
real_001.jpg,AUTHENTIC
fake_001.jpg,SYNTHETIC`;

function Metric({ label, value }: { label: string; value?: number | null }) {
  return (
    <div className={styles.metric}>
      <span>{label}</span>
      <strong>{formatPercent(value)}</strong>
    </div>
  );
}

export function AdminEvaluations() {
  const [runs, setRuns] = useState<EvaluationRunResponse[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EvaluationDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: 'Interview Eval Smoke',
    datasetName: 'sample-v1',
    modelId: 'nonescape-mini',
    manifest: sampleManifest,
  });

  const selectedRun = useMemo(() => runs.find((run) => run.evaluationId === selectedId) ?? runs[0] ?? null, [runs, selectedId]);
  const wrongSamples = detail?.samples.filter((sample) => sample.correct === false || sample.failureReason) ?? [];

  const refresh = async (nextSelectedId = selectedId) => {
    setLoading(true);
    setError(null);
    try {
      const nextRuns = await listEvaluations();
      setRuns(nextRuns);
      const targetId = nextSelectedId ?? nextRuns[0]?.evaluationId ?? null;
      setSelectedId(targetId);
      setDetail(targetId ? await getEvaluation(targetId) : null);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : 'Failed to load evaluations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    listEvaluations()
      .then(async (nextRuns) => {
        if (!active) return;
        setRuns(nextRuns);
        const targetId = nextRuns[0]?.evaluationId ?? null;
        setSelectedId(targetId);
        if (targetId) {
          const nextDetail = await getEvaluation(targetId);
          if (active) setDetail(nextDetail);
        }
      })
      .catch((apiError) => {
        if (active) setError(apiError instanceof Error ? apiError.message : 'Failed to load evaluations.');
      });
    return () => {
      active = false;
    };
  }, []);

  const selectRun = async (evaluationId: string) => {
    setSelectedId(evaluationId);
    setError(null);
    try {
      setDetail(await getEvaluation(evaluationId));
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : 'Failed to load evaluation detail.');
    }
  };

  const submitEvaluation = async () => {
    setLoading(true);
    setError(null);
    try {
      const created = await createEvaluation(form);
      await refresh(created.evaluationId);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : 'Failed to create evaluation.');
    } finally {
      setLoading(false);
    }
  };

  const execute = async (mode: 'run' | 'retry') => {
    if (!selectedRun) return;
    setLoading(true);
    setError(null);
    try {
      const nextDetail = mode === 'run' ? await runEvaluation(selectedRun.evaluationId) : await retryEvaluation(selectedRun.evaluationId);
      setDetail(nextDetail);
      await refresh(nextDetail.evaluationId);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : 'Failed to execute evaluation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer width="wide">
      <div className={styles.page}>
        <header className="pageHeader">
          <p className="italic-quote">- Measure the model before trusting it -</p>
          <h1 className="pageTitle">Evaluation</h1>
          <p className="pageEnglish">METRICS</p>
        </header>

        {error ? <p className={styles.error}>{error}</p> : null}

        <section className={styles.shell}>
          <div className={styles.mainPanel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>Runs</span>
                <h2>Evaluation Queue</h2>
              </div>
              <Button variant="text" onClick={() => void refresh()}>Refresh</Button>
            </div>

            <div className={styles.table}>
              <div className={styles.tableHead}>
                <span>Name</span>
                <span>Status</span>
                <span>Samples</span>
                <span>F1</span>
                <span>Attempts</span>
              </div>
              {runs.map((run) => (
                <button
                  className={`${styles.row} ${selectedRun?.evaluationId === run.evaluationId ? styles.selected : ''}`}
                  key={run.evaluationId}
                  onClick={() => void selectRun(run.evaluationId)}
                  type="button"
                >
                  <span>
                    <strong>{run.name}</strong>
                    <em>{run.datasetName}</em>
                  </span>
                  <span className={`${styles.status} ${styles[statusTone(run.status)]}`}>{run.status}</span>
                  <span>{run.completedSamples}/{run.totalSamples}</span>
                  <span>{formatPercent(run.f1)}</span>
                  <span>{run.attemptCount}/{run.maxAttempts}</span>
                </button>
              ))}
              {!runs.length ? <p className={styles.empty}>No evaluations yet. Paste a manifest to create one.</p> : null}
            </div>
          </div>

          <aside className={styles.sidePanel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>Create</span>
                <h2>Manifest</h2>
              </div>
            </div>
            <label>Name<Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label>Dataset<Input value={form.datasetName} onChange={(event) => setForm({ ...form, datasetName: event.target.value })} /></label>
            <label>Model<Input value={form.modelId} onChange={(event) => setForm({ ...form, modelId: event.target.value })} /></label>
            <label>CSV Manifest<TextArea value={form.manifest} onChange={(event) => setForm({ ...form, manifest: event.target.value })} rows={8} /></label>
            <Button onClick={submitEvaluation} disabled={loading} fullWidth>Create Evaluation</Button>
          </aside>
        </section>

        <section className={styles.detail}>
          <div className={styles.detailHeader}>
            <div>
              <span className={styles.eyebrow}>Selected Run</span>
              <h2>{detail?.name ?? selectedRun?.name ?? 'No evaluation selected'}</h2>
              <p>{detail ? `${detail.modelId} - ${formatDate(detail.createdAt)}` : 'Create or select an evaluation to inspect metrics.'}</p>
            </div>
            <div className={styles.actions}>
              <Button variant="secondary" onClick={() => void execute('run')} disabled={!selectedRun || loading}>Run</Button>
              <Button variant="secondary" onClick={() => void execute('retry')} disabled={!selectedRun || loading}>Retry</Button>
            </div>
          </div>

          <div className={styles.metrics}>
            <Metric label="Accuracy" value={detail?.accuracy} />
            <Metric label="Precision" value={detail?.precision} />
            <Metric label="Recall" value={detail?.recall} />
            <Metric label="F1" value={detail?.f1} />
          </div>

          <div className={styles.sampleTable}>
            <div className={styles.sampleHead}>
              <span>Filename</span>
              <span>Truth</span>
              <span>Prediction</span>
              <span>Score</span>
              <span>Latency</span>
            </div>
            {wrongSamples.map((sample) => (
              <div className={styles.sampleRow} key={sample.sampleId}>
                <span>
                  <strong>{sample.filename}</strong>
                  {sample.failureReason ? <em>{sample.failureReason}</em> : null}
                </span>
                <span>{labelText(sample.groundTruthLabel)}</span>
                <span>{labelText(sample.predictedLabel)}</span>
                <span>{sample.score === null ? 'N/A' : sample.score.toFixed(3)}</span>
                <span>{sample.latencyMs === null ? 'N/A' : `${sample.latencyMs}ms`}</span>
              </div>
            ))}
            {!wrongSamples.length ? <p className={styles.empty}>No wrong or failed samples for the selected run.</p> : null}
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
