import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Button, EdgeRule, PageContainer } from '@/components/primitives';
import { UserTopbar } from '@/components/UserTopbar/UserTopbar';
import { getDetection, getReport, type DetectionDetailResponse } from '@/api/backend';
import { buildReportPresentation, type ReportEvidence } from './reportPresentation';
import styles from './Report.module.css';

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatDateTime(value?: string | null) {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date(value));
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function verdictLabel(verdict: string | null) {
  if (verdict === 'LIKELY_AUTHENTIC') return { cn: '可能真实', en: 'LIKELY AUTHENTIC' };
  if (verdict === 'LIKELY_SYNTHETIC') return { cn: '可能由 AI 生成', en: 'LIKELY SYNTHETIC' };
  if (verdict === 'UNCERTAIN') return { cn: '结果不确定', en: 'UNCERTAIN' };
  if (verdict === 'FAILED') return { cn: '检测失败', en: 'FAILED' };
  return { cn: '等待检测结果', en: 'PENDING' };
}

function EvidenceItem({ evidence }: { evidence: ReportEvidence }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.evidenceItem}>
      <button onClick={() => setOpen((value) => !value)} type="button">
        <span>{evidence.code}</span>{evidence.name}
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div className={styles.evidenceBody} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <p>{evidence.description}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function Report() {
  const [detail, setDetail] = useState<DetectionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { id } = useParams();
  const location = useLocation();
  const routeState = location.state as { imageSrc?: string } | null;
  const invalidId = !id || id === 'demo';

  useEffect(() => {
    if (!id || id === 'demo') return undefined;
    let active = true;
    getDetection(id)
      .catch(() => getReport(id))
      .then((nextDetail) => { if (active) setDetail(nextDetail); })
      .catch((error) => { if (active) setLoadError(error instanceof Error ? error.message : 'Report load failed.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const presentation = useMemo(() => buildReportPresentation(detail), [detail]);
  const verdict = verdictLabel(presentation.verdict);
  const preview = routeState?.imageSrc ?? (id ? window.sessionStorage.getItem(`detection-preview:${id}`) : null);
  const visibleError = invalidId ? 'A persisted detection or report id is required.' : loadError;

  return (
    <main className={styles.page}>
      <UserTopbar title="鉴别报告" english="REPORT" actions={<><Button variant="text" disabled>导出 PDF</Button><Button variant="text" disabled>归档</Button></>} />
      <EdgeRule position="top" />
      <PageContainer width="narrow">
        <article className={styles.paper}>
          <header className={styles.reportHeader}>
            <p className={styles.italicQuote}>- A report on visual authenticity -</p>
            <div className={styles.titleBlock}><h1 className={styles.reportTitle}>鉴别报告</h1></div>
            <p className={styles.brand}>DEVELOP</p>
            <div className={styles.caseNumberWrap}><span className={styles.caseNumberLine} /><span className={styles.caseNumber}>{id ?? 'UNKNOWN'}</span><span className={styles.caseNumberLine} /></div>
          </header>

          <hr className={styles.sectionDivider} />
          <section>
            <h2>一、送检材料</h2>
            {preview ? <img src={preview} className={styles.thumb} alt="Submitted evidence preview" /> : <div className={styles.mediaPlaceholder}>Preview unavailable after reload</div>}
            {detail ? <dl className={styles.meta}>
              <dt>文件</dt><dd>{detail.filename}</dd>
              <dt>类型</dt><dd>{detail.contentType}</dd>
              <dt>尺寸</dt><dd>{detail.width} x {detail.height}</dd>
              <dt>大小</dt><dd>{formatFileSize(detail.fileSize)}</dd>
              <dt>SHA-256</dt><dd>{detail.sha256}</dd>
            </dl> : null}
          </section>

          <hr className={styles.sectionDivider} />
          <section>
            <h2>二、鉴别结论</h2>
            {loading && !invalidId ? <p className={styles.footer}>Loading persisted report...</p> : null}
            {visibleError ? <p className={styles.footer}>{visibleError}</p> : null}
            {!loading && !visibleError ? <div className={styles.verdictCardLarge}>
              <p className={styles.verdictCardLargeCn}>{verdict.cn}</p>
              <p className={styles.verdictCardLargeEn}>{verdict.en}</p>
              {presentation.confidence !== null ? <p className={styles.verdictCardLargeConf}><span>{formatPercent(presentation.confidence)} confidence</span></p> : null}
              {presentation.summary ? <p>{presentation.summary}</p> : null}
            </div> : null}
          </section>

          <hr className={styles.sectionDivider} />
          <section>
            <h2>三、模型证据</h2>
            <div className={styles.evidenceList}>{presentation.evidence.map((item) => <EvidenceItem key={item.code} evidence={item} />)}</div>
            {!presentation.evidence.length ? <p className={styles.footer}>No persisted model predictions are available.</p> : null}
          </section>

          <hr className={styles.sectionDivider} />
          <section>
            <h2>四、处理过程</h2>
            <div className={styles.timelineLog}>{presentation.timeline.map((entry) => <p key={`${entry.timestamp}-${entry.event}`}><span>{formatDateTime(entry.timestamp)}</span><strong>- {entry.event}</strong>{entry.note ? <em>- {entry.note}</em> : null}</p>)}</div>
          </section>

          <hr className={styles.sectionDivider} />
          <footer className={styles.footer}><p>检测结果是辅助信号，不应作为高风险决策的唯一依据。</p><p>报告时间 - {formatDateTime(detail?.report?.createdAt ?? detail?.completedAt)}</p></footer>
        </article>
      </PageContainer>
      <EdgeRule position="bottom" />
    </main>
  );
}
