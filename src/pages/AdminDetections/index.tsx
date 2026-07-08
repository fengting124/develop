import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/primitives';
import { listDetections, type DetectionHistoryItemResponse, type DetectionStatus } from '@/api/backend';
import { formatDate, formatFileSize, formatPercent, statusTone } from '@/pages/adminFormat';
import styles from './AdminDetections.module.css';

const filters: Array<'ALL' | DetectionStatus> = ['ALL', 'QUEUED', 'INFERENCING', 'COMPLETED', 'FAILED'];

function verdict(item: DetectionHistoryItemResponse) {
  if (item.status === 'FAILED') return item.failureReason ?? 'Failed';
  if (!item.report) return item.status;
  return `${item.report.verdict} ${formatPercent(item.report.confidence)}`;
}

export function AdminDetections() {
  const [items, setItems] = useState<DetectionHistoryItemResponse[]>([]);
  const [filter, setFilter] = useState<'ALL' | DetectionStatus>('ALL');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listDetections()
      .then((nextItems) => {
        if (active) setItems(nextItems);
      })
      .catch((apiError) => {
        if (active) setError(apiError instanceof Error ? apiError.message : 'Failed to load detections.');
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleItems = useMemo(() => (filter === 'ALL' ? items : items.filter((item) => item.status === filter)), [filter, items]);

  return (
    <PageContainer width="wide">
      <div className={styles.page}>
        <header className="pageHeader">
          <p className="italic-quote">- Every report starts as a traceable task -</p>
          <h1 className="pageTitle">Detections</h1>
          <p className="pageEnglish">HISTORY</p>
        </header>

        {error ? <p className={styles.error}>{error}</p> : null}

        <section className={styles.toolbar}>
          <div>
            <span className={styles.eyebrow}>Task Stream</span>
            <h2>{visibleItems.length} records</h2>
          </div>
          <div className={styles.filters}>
            {filters.map((nextFilter) => (
              <button
                className={filter === nextFilter ? styles.activeFilter : ''}
                key={nextFilter}
                onClick={() => setFilter(nextFilter)}
                type="button"
              >
                {nextFilter}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.table}>
          <div className={styles.head}>
            <span>File</span>
            <span>Status</span>
            <span>Verdict</span>
            <span>Size</span>
            <span>Created</span>
            <span>Report</span>
          </div>
          {visibleItems.map((item) => (
            <article className={styles.row} key={item.taskId}>
              <span>
                <strong>{item.filename}</strong>
                <em>{item.width} x {item.height} - {item.contentType}</em>
              </span>
              <span className={`${styles.status} ${styles[statusTone(item.status)]}`}>{item.status}</span>
              <span>{verdict(item)}</span>
              <span>{formatFileSize(item.fileSize)}</span>
              <span>{formatDate(item.createdAt)}</span>
              <span>
                {item.report ? <Link to={`/detect/report/${item.report.reportId}`}>Open</Link> : <em>N/A</em>}
              </span>
            </article>
          ))}
          {!visibleItems.length ? <p className={styles.empty}>No detection tasks match this filter.</p> : null}
        </section>
      </div>
    </PageContainer>
  );
}

