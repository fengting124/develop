import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Button, EdgeRule, Modal, PageContainer, useToast } from '@/components/primitives';
import { UserTopbar } from '@/components/UserTopbar/UserTopbar';
import { getDetection, getReport, type DetectionDetailResponse } from '@/api/backend';
import { imageDemo } from '@/data/mocks';
import styles from './Report.module.css';

interface EvidenceItemProps {
  code: string;
  name: string;
  description: string;
  thumb: string;
}

function EvidenceItem({ code, name, description, thumb }: EvidenceItemProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.evidenceItem}>
      <button onClick={() => setOpen((value) => !value)} type="button">
        <span>{code}</span>
        {name}
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            className={styles.evidenceBody}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <img src={thumb} alt="" />
            <p>{description}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

const timelineEntries = [
  ['14:23:08', '材料登记', ''],
  ['14:23:11', '全局语义读取', '场景判定: 街景'],
  ['14:23:13', '局部细节核查', '识别 7 个实体'],
  ['14:23:18', '异构专家协同', ''],
  ['14:23:22', '证据汇总', ''],
  ['14:23:23', '出具结论', ''],
];

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatDateTime(value?: string | null) {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatClock(value?: string | null) {
  if (!value) return '--:--:--';
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function verdictText(detail: DetectionDetailResponse | null) {
  if (detail?.status === 'FAILED') return { cn: '检测失败', en: 'FAILED', confidence: 0 };
  if (detail?.report?.verdict === 'LIKELY_AUTHENTIC') return { cn: '可能真实', en: 'REAL', confidence: detail.report.confidence };
  if (detail?.report?.verdict === 'UNCERTAIN') return { cn: '结果不确定', en: 'UNCERTAIN', confidence: detail.report.confidence };
  return { cn: 'AI 生成', en: 'FAKE', confidence: detail?.report?.confidence ?? imageDemo.confidence };
}

export function Report() {
  const [modal, setModal] = useState<'pdf' | 'archive' | null>(null);
  const [detail, setDetail] = useState<DetectionDetailResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { showToast } = useToast();
  const { id } = useParams();
  const location = useLocation();
  const routeState = location.state as { imageSrc?: string } | null;

  useEffect(() => {
    if (!id || id === 'demo') return undefined;
    let active = true;
    getDetection(id)
      .catch(() => getReport(id))
      .then((nextDetail) => {
        if (active) setDetail(nextDetail);
      })
      .catch((error) => {
        if (active) setLoadError(error instanceof Error ? error.message : 'Report load failed.');
      });
    return () => {
      active = false;
    };
  }, [id]);

  const reportVerdict = verdictText(detail);
  const reportImageSrc = routeState?.imageSrc ?? (id ? window.sessionStorage.getItem(`detection-preview:${id}`) : null) ?? imageDemo.src;
  const evidenceItems = useMemo(() => {
    if (!detail?.predictions.length) {
      return imageDemo.marks.map((mark) => ({
        code: mark.label,
        name: mark.name,
        description: `${mark.name} region shows visual inconsistency with the surrounding image.`,
      }));
    }
    return detail.predictions.map((prediction, index) => ({
      code: `M-${String(index + 1).padStart(2, '0')}`,
      name: prediction.modelId,
      description: `${prediction.modelId} ${prediction.modelVersion} returned ${prediction.label} with score ${formatPercent(prediction.normalizedScore)}, threshold ${prediction.threshold.toFixed(2)}, latency ${prediction.latencyMs}ms.`,
    }));
  }, [detail]);

  const timeline = useMemo(() => {
    if (!detail) return timelineEntries;
    return [
      [formatClock(detail.createdAt), '任务创建', detail.filename],
      [formatClock(detail.startedAt), '模型推理', detail.status],
      [formatClock(detail.completedAt), '报告生成', detail.report?.riskLevel ?? detail.failureReason ?? '等待结果'],
    ];
  }, [detail]);

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
            <Button variant="text" prefix="─" suffix="→" onClick={() => setModal('pdf')}>导出 PDF</Button>
            <Button variant="text" prefix="─" suffix="→" onClick={() => setModal('archive')}>归档</Button>
          </>
        }
      />
      <EdgeRule position="top" />

      <PageContainer width="narrow">
      <article className={styles.paper}>
        <header className={styles.reportHeader}>
          <p className={styles.italicQuote}>─ A report on visual authenticity ─</p>
          <div className={styles.titleBlock}>
            <span className={styles.ornamentLeft}>❡</span>
            <h1 className={styles.reportTitle}>鉴 别 报 告</h1>
            <span className={styles.ornamentRight}>❡</span>
          </div>
          <p className={styles.brand}>DEVELOP</p>
          <div className={styles.caseNumberWrap}>
            <span className={styles.caseNumberLine} />
            <span className={styles.caseNumber}>№ DV-2026-1121-003</span>
            <span className={styles.caseNumberLine} />
          </div>
          <div className={styles.dateSeal}>
            <span className={styles.dateSealLine} />
            <span className={styles.dateSealText}>2026 · 11 · 21</span>
            <span className={styles.dateSealLine} />
          </div>
        </header>

        <hr className={styles.sectionDivider} />

        <section>
          <h2>一. 送检材料</h2>
          <img src={reportImageSrc} className={styles.thumb} alt="" />
          <dl className={styles.meta}>
            <dt>类型</dt>
            <dd>图片</dd>
            <dt>尺寸</dt>
            <dd>1920 × 1080</dd>
            <dt>送检</dt>
            <dd>2026.11.21 14:23</dd>
          </dl>
          {detail ? (
            <dl className={styles.meta}>
              <dt>API Type</dt>
              <dd>{detail.contentType}</dd>
              <dt>API Size</dt>
              <dd>{detail.width} × {detail.height}</dd>
              <dt>SHA-256</dt>
              <dd>{detail.sha256.slice(0, 16)}...</dd>
              <dt>File</dt>
              <dd>{formatFileSize(detail.fileSize)}</dd>
            </dl>
          ) : null}
        </section>

        <hr className={styles.sectionDivider} />

        <section>
          <h2>二. 鉴别结论</h2>
          {detail ? (
            <div className={styles.verdictCardLarge}>
              <p className={styles.verdictCardLargeCn}>{reportVerdict.cn}</p>
              <p className={styles.verdictCardLargeEn}>{reportVerdict.en}</p>
              <p className={styles.verdictCardLargeConf}>
                <span className={styles.verdictConfDash} />
                <span><span className={styles.verdictConfValue}>{formatPercent(reportVerdict.confidence)}</span> confidence</span>
                <span className={styles.verdictConfDash} />
              </p>
            </div>
          ) : null}
          {loadError ? <p className={styles.footer}>{loadError}</p> : null}
          {!detail ? (
          <div className={styles.verdictCardLarge}>
            <p className={styles.verdictCardLargeCn}>AI 生成</p>
            <p className={styles.verdictCardLargeEn}>FAKE</p>
            <p className={styles.verdictCardLargeConf}>
              <span className={styles.verdictConfDash} />
              <span><span className={styles.verdictConfValue}>{Math.round(imageDemo.confidence * 100)}%</span> confidence</span>
              <span className={styles.verdictConfDash} />
            </p>
          </div>
          ) : null}
        </section>

        <hr className={styles.sectionDivider} />

        <section>
          <h2>三. 三条关键证据</h2>
          <div className={styles.evidenceList}>
            {evidenceItems.map((mark) => (
              <EvidenceItem
                key={mark.code}
                code={mark.code}
                name={mark.name}
                thumb={reportImageSrc}
                description={mark.description}
              />
            ))}
          </div>
        </section>

        <hr className={styles.sectionDivider} />

        <section>
          <h2>四. 显影过程</h2>
          <div className={styles.timelineLog}>
            {timeline.map(([time, event, note]) => (
              <p key={`${time}-${event}`}>
                <span>{time}</span>
                <strong>─ {event}</strong>
                {note ? <em>─ {note}</em> : null}
              </p>
            ))}
          </div>
        </section>

        <hr className={styles.sectionDivider} />

        <footer className={styles.footer}>
          <p>DEVELOP · 由系统自动生成 · 仅供参考</p>
          <p>报告时间 ─ {formatDateTime(detail?.report?.createdAt ?? detail?.completedAt)}</p>
        </footer>
      </article>
      </PageContainer>

      <EdgeRule position="bottom" />

      <Modal isOpen={modal !== null} onClose={() => setModal(null)}>
        <div className={styles.confirm}>
          <h2>{modal === 'pdf' ? '确认导出 PDF' : '确认归档报告'}</h2>
          <p>{modal === 'pdf' ? '系统将生成当前报告的 PDF 文件。' : '报告将进入治理归档池。'}</p>
          <Button variant="primary" onClick={completeAction}>确认</Button>
        </div>
      </Modal>
    </main>
  );
}
