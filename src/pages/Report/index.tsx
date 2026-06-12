import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button, EdgeRule, Modal, PageContainer, useToast } from '@/components/primitives';
import { UserTopbar } from '@/components/UserTopbar/UserTopbar';
import {
  readReport,
  type DetectionReport,
  type ReportEvidence,
  type ReportExpertNode,
  type ReportSemanticNode,
} from '@/data/reportStore';
import styles from './Report.module.css';

function DecodedText({ text, duration = 1200 }: { text: string; duration?: number }) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
    const totalFrames = duration / 30;
    let frame = 0;

    const interval = window.setInterval(() => {
      frame += 1;
      const progress = Math.min(frame / totalFrames, 1);
      const revealedLength = Math.floor(text.length * progress);
      const scrambledLength = text.length - revealedLength;
      let scrambled = '';

      for (let index = 0; index < scrambledLength; index += 1) {
        scrambled += chars[Math.floor(Math.random() * chars.length)];
      }

      setDisplayed(text.substring(0, revealedLength) + scrambled);
      if (progress >= 1) window.clearInterval(interval);
    }, 30);

    return () => window.clearInterval(interval);
  }, [text, duration]);

  return <>{displayed}</>;
}

function verdictCn(verdict: DetectionReport['verdict']) {
  return verdict === 'fake' ? 'AI 生成 / 篡改' : '真实内容';
}

function verdictEn(verdict: DetectionReport['verdict']) {
  return verdict === 'fake' ? 'FAKE' : 'REAL';
}

function formatReportDate(createdAt: string) {
  return createdAt.replaceAll('-', ' / ').replace(' ', '   ');
}

function EvidenceItem({ item, fallbackThumb }: { item: ReportEvidence; fallbackThumb: string }) {
  return (
    <motion.div className={styles.evidenceItem} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className={styles.evidenceHead}>
        <span>{item.code}</span>
        <div>
          <strong>{item.name}</strong>
          {item.timeRange ? <em>{item.timeRange}</em> : null}
        </div>
      </div>
      <div className={styles.evidenceBody}>
        <img src={item.thumb || fallbackThumb} alt="" />
        <p>
          {item.description}
          {typeof item.confidence === 'number' ? (
            <small>CONF {Math.round(item.confidence * 100)}%</small>
          ) : null}
        </p>
      </div>
    </motion.div>
  );
}

function MaterialPreview({ report }: { report: DetectionReport }) {
  if (report.kind === 'video') {
    return (
      <video
        className={styles.thumb}
        src={report.sourceSrc}
        poster={report.posterSrc}
        controls
        muted
        playsInline
      />
    );
  }

  return <img src={report.sourceSrc} className={styles.thumb} alt={report.sourceName} />;
}

function SemanticChainSection({ nodes }: { nodes: ReportSemanticNode[] }) {
  return (
    <section className={styles.dashboardSection}>
      <h2>语义链</h2>
      <div className={styles.chainList}>
        {nodes.map((node) => (
          <motion.article
            key={node.index}
            className={styles.chainCard}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={styles.chainHead}>
              <span className={styles.chainIndex}>{node.index}</span>
              <strong>{node.label}</strong>
              <em>{node.english}</em>
            </div>
            <p>{node.result}</p>
            {node.danger ? <small>{node.danger}</small> : null}
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function ExpertNetworkSection({ experts }: { experts: ReportExpertNode[] }) {
  const points = experts.map((expert, index) => {
    const angle = -Math.PI / 2 + (index / experts.length) * Math.PI * 2;
    const radius = 42 * expert.weight;
    return {
      expert,
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius,
      axisX: 50 + Math.cos(angle) * 42,
      axisY: 50 + Math.sin(angle) * 42,
    };
  });
  const polygon = points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <section className={styles.dashboardSection}>
      <h2>专家网络</h2>
      <div className={styles.expertSummary}>
        <svg viewBox="0 0 100 100" className={styles.expertRadar} aria-label="专家网络贡献雷达图">
          {[0.35, 0.68, 1].map((scale) => (
            <polygon
              key={scale}
              points={points.map((point) => `${50 + (point.axisX - 50) * scale},${50 + (point.axisY - 50) * scale}`).join(' ')}
              className={styles.radarGrid}
            />
          ))}
          {points.map((point) => (
            <line key={point.expert.key} x1="50" y1="50" x2={point.axisX} y2={point.axisY} className={styles.radarAxis} />
          ))}
          <polygon points={polygon} className={styles.radarFill} />
          {points.map((point) => (
            <circle
              key={point.expert.key}
              cx={point.x}
              cy={point.y}
              r={point.expert.target ? 3 : 2.2}
              className={point.expert.target ? styles.radarPointTarget : styles.radarPoint}
            />
          ))}
        </svg>
        <div className={styles.expertRows}>
          {experts.map((expert) => (
            <article key={expert.key} className={expert.target ? styles.expertRowTarget : styles.expertRow}>
              <div className={styles.expertRowHead}>
                <strong>{expert.label}</strong>
                <span>{Math.round(expert.weight * 100)}%</span>
              </div>
              <div className={styles.expertBar}>
                <span style={{ width: `${Math.round(expert.weight * 100)}%` }} />
              </div>
              <p>{expert.summary}</p>
              <em>{expert.english}</em>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Report() {
  const { id } = useParams();
  const report = useMemo(() => readReport(id), [id]);
  const [modal, setModal] = useState<'pdf' | 'archive' | null>(null);
  const { showToast } = useToast();

  const completeAction = () => {
    showToast(modal === 'pdf' ? 'PDF 导出任务已创建' : '报告已归档', 'success');
    setModal(null);
  };

  return (
    <main className={styles.page}>
      <UserTopbar
        title="鉴别报告"
        english="Report"
        actions={
          <>
            <Button variant="text" prefix="-" suffix=">" onClick={() => setModal('pdf')}>
              导出 PDF
            </Button>
            <Button variant="text" prefix="-" suffix=">" onClick={() => setModal('archive')}>
              归档
            </Button>
          </>
        }
      />
      <EdgeRule position="top" />

      <PageContainer width="normal">
        <div className={styles.dashboard}>
          <div className={styles.leftPanel}>
            <header className={styles.reportHeader}>
              <p className={styles.italicQuote}>A report on visual authenticity</p>
              <div className={styles.titleBlock}>
                <span className={styles.ornamentLeft}>*</span>
                <h1 className={styles.reportTitle}>鉴别报告</h1>
                <span className={styles.ornamentRight}>*</span>
              </div>
              <p className={styles.brand}>DEVELOP</p>
              <div className={styles.caseNumberWrap}>
                <span className={styles.caseNumberLine} />
                <span className={styles.caseNumber}>No. {report.caseNumber}</span>
                <span className={styles.caseNumberLine} />
              </div>
              <div className={styles.dateSeal}>
                <span className={styles.dateSealLine} />
                <span className={styles.dateSealText}>{formatReportDate(report.createdAt)}</span>
                <span className={styles.dateSealLine} />
              </div>
            </header>

            <hr className={styles.sectionDivider} />

            <section>
              <h2>一. 送检材料</h2>
              <MaterialPreview report={report} />
              <dl className={styles.meta}>
                {report.materialMeta.map(([key, value]) => (
                  <div key={key} className={styles.metaRow}>
                    <dt>{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <hr className={styles.sectionDivider} />

            <section>
              <h2>二. 鉴别结论</h2>
              <div className={styles.verdictCardLarge} data-verdict={report.verdict}>
                <p className={styles.verdictCardLargeCn}>{verdictCn(report.verdict)}</p>
                <p className={styles.verdictCardLargeEn}>
                  <DecodedText text={verdictEn(report.verdict)} duration={1500} />
                </p>
                <p className={styles.verdictCardLargeConf}>
                  <span className={styles.verdictConfDash} />
                  <span>
                    <span className={styles.verdictConfValue}>{Math.round(report.confidence * 100)}%</span> confidence
                  </span>
                  <span className={styles.verdictConfDash} />
                </p>
              </div>
            </section>

            <footer className={styles.footer}>
              <p>DEVELOP / 系统自动生成</p>
              <p>{report.createdAt}</p>
            </footer>
          </div>

          <div className={styles.rightPanel}>
            {report.kind === 'image' && report.semanticChain?.length ? (
              <SemanticChainSection nodes={report.semanticChain} />
            ) : null}

            {report.kind === 'image' && report.expertNetwork?.length ? (
              <ExpertNetworkSection experts={report.expertNetwork} />
            ) : null}

            <section className={styles.dashboardSection}>
              <h2>关键证据</h2>
              <div className={styles.evidenceList}>
                {report.evidence.map((item) => (
                  <EvidenceItem
                    key={item.code}
                    item={item}
                    fallbackThumb={report.posterSrc || report.sourceSrc}
                  />
                ))}
              </div>
            </section>

            <section className={styles.dashboardSection}>
              <h2>显影过程</h2>
              <div className={styles.timelineLog}>
                {report.timeline.map(([time, event, note]) => (
                  <p key={`${time}-${event}`}>
                    <span>{time}</span>
                    <strong>{event}</strong>
                    {note ? <em>{note}</em> : null}
                  </p>
                ))}
              </div>
            </section>
          </div>
        </div>
      </PageContainer>

      <EdgeRule position="bottom" />

      <Modal isOpen={modal !== null} onClose={() => setModal(null)}>
        <div className={styles.confirm}>
          <h2>{modal === 'pdf' ? '确认导出 PDF' : '确认归档报告'}</h2>
          <p>{modal === 'pdf' ? '系统将生成当前报告的 PDF 文件。' : '报告将进入治理归档池。'}</p>
          <Button variant="primary" onClick={completeAction}>
            确认
          </Button>
        </div>
      </Modal>
    </main>
  );
}
