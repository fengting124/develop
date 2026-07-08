import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/primitives';
import {
  getEvaluation,
  listDetections,
  listEvaluations,
  type DetectionHistoryItemResponse,
  type EvaluationDetailResponse,
  type EvaluationSampleResponse,
} from '@/api/backend';
import { formatDate, labelText } from '@/pages/adminFormat';
import styles from './AdminReview.module.css';

interface WrongSampleItem extends EvaluationSampleResponse {
  evaluationName: string;
  datasetName: string;
}

export function AdminReview() {
  const [failedDetections, setFailedDetections] = useState<DetectionHistoryItemResponse[]>([]);
  const [failedEvaluations, setFailedEvaluations] = useState<EvaluationDetailResponse[]>([]);
  const [wrongSamples, setWrongSamples] = useState<WrongSampleItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadReviewQueue() {
      try {
        const [detections, evaluations] = await Promise.all([listDetections(), listEvaluations()]);
        if (!active) return;
        setFailedDetections(detections.filter((item) => item.status === 'FAILED'));

        const detailResults = await Promise.allSettled(evaluations.slice(0, 6).map((run) => getEvaluation(run.evaluationId)));
        if (!active) return;
        const details = detailResults.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
        setFailedEvaluations(details.filter((detail) => detail.status === 'FAILED'));
        setWrongSamples(details.flatMap((detail) => detail.samples
          .filter((sample) => sample.correct === false || sample.failureReason)
          .map((sample) => ({
            ...sample,
            evaluationName: detail.name,
            datasetName: detail.datasetName,
          }))));
      } catch (apiError) {
        if (active) setError(apiError instanceof Error ? apiError.message : 'Failed to load review queue.');
      }
    }
    void loadReviewQueue();
    return () => {
      active = false;
    };
  }, []);

  return (
    <PageContainer width="wide">
      <div className={styles.page}>
        <header className="pageHeader">
          <p className="italic-quote">- Review is evidence, not retraining theater -</p>
          <h1 className="pageTitle">Review</h1>
          <p className="pageEnglish">QUEUE</p>
        </header>

        {error ? <p className={styles.error}>{error}</p> : null}

        <section className={styles.grid}>
          <article className={styles.panel}>
            <header>
              <span className={styles.eyebrow}>Detection Failures</span>
              <h2>{failedDetections.length} tasks</h2>
            </header>
            <div className={styles.list}>
              {failedDetections.map((item) => (
                <div className={styles.item} key={item.taskId}>
                  <strong>{item.filename}</strong>
                  <span>{item.failureReason ?? 'Detection failed'}</span>
                  <em>{formatDate(item.createdAt)}</em>
                  <Link to={`/detect/report/${item.taskId}`}>Inspect</Link>
                </div>
              ))}
              {!failedDetections.length ? <p className={styles.empty}>No failed detection tasks need review.</p> : null}
            </div>
          </article>

          <article className={styles.panel}>
            <header>
              <span className={styles.eyebrow}>Evaluation Failures</span>
              <h2>{failedEvaluations.length} runs</h2>
            </header>
            <div className={styles.list}>
              {failedEvaluations.map((item) => (
                <div className={styles.item} key={item.evaluationId}>
                  <strong>{item.name}</strong>
                  <span>{item.failureReason ?? 'Evaluation failed'}</span>
                  <em>{item.attemptCount}/{item.maxAttempts} attempts</em>
                </div>
              ))}
              {!failedEvaluations.length ? <p className={styles.empty}>No failed evaluation runs are waiting.</p> : null}
            </div>
          </article>
        </section>

        <section className={styles.samples}>
          <header>
            <span className={styles.eyebrow}>Wrong Samples</span>
            <h2>{wrongSamples.length} samples</h2>
          </header>
          <div className={styles.sampleHead}>
            <span>Filename</span>
            <span>Evaluation</span>
            <span>Truth</span>
            <span>Prediction</span>
            <span>Reason</span>
          </div>
          {wrongSamples.map((sample) => (
            <div className={styles.sampleRow} key={sample.sampleId}>
              <span>
                <strong>{sample.filename}</strong>
                <em>{sample.datasetName}</em>
              </span>
              <span>{sample.evaluationName}</span>
              <span>{labelText(sample.groundTruthLabel)}</span>
              <span>{labelText(sample.predictedLabel)}</span>
              <span>{sample.failureReason ?? 'Incorrect prediction'}</span>
            </div>
          ))}
          {!wrongSamples.length ? <p className={styles.empty}>No wrong samples found in the latest evaluation runs.</p> : null}
        </section>
      </div>
    </PageContainer>
  );
}

