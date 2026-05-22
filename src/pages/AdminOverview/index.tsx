import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { PageContainer } from '@/components/primitives';
import { anomalyPool, expertsCore } from '@/data/mocks';
import styles from './AdminOverview.module.css';

const sectionDelays = [0, 0.08, 0.16, 0.24];

interface OverviewSectionProps {
  index: string;
  title: string;
  english: string;
  to: string | null;
  order: number;
  children: ReactNode;
}

interface StatusItemProps {
  type: 'real' | 'accent';
  label: string;
  detail: string;
}

function OverviewSection({ index, title, english, to, order, children }: OverviewSectionProps) {
  const navigate = useNavigate();

  return (
    <motion.section
      className={`${styles.section} ${to ? styles.clickable : ''}`}
      onClick={() => {
        if (to) navigate(to);
      }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: sectionDelays[order], ease: 'easeOut' }}
    >
      <header className={styles.sectionHeader}>
        <span className={styles.sectionIndex}>{index}</span>
        <span className={styles.sectionDash}>─</span>
        <div className={styles.sectionTitles}>
          <h2 className={styles.sectionTitle}>{title}</h2>
          <p className={styles.sectionEnglish}>{english}</p>
        </div>
      </header>

      <div className={styles.sectionBody}>{children}</div>

      {to ? (
        <footer className={styles.sectionFooter}>
          <span className={styles.viewMore}>
            <span className={styles.dash}>─</span>
            <span>查看详细</span>
            <span className={styles.arrow}>→</span>
          </span>
        </footer>
      ) : null}
    </motion.section>
  );
}

function StatusItem({ type, label, detail }: StatusItemProps) {
  return (
    <div className={styles.statusItem}>
      <span className={`${styles.statusDot} ${styles[type]}`} />
      <span className={styles.statusLabel}>{label}</span>
      <span className={styles.statusDash}>──</span>
      <span className={styles.statusDetail}>{detail}</span>
    </div>
  );
}

function TodayStatusList() {
  return (
    <div className={styles.statusList}>
      <StatusItem type="real" label="系统持续运行" detail="自上次刷新 04:12" />
      <StatusItem type="real" label="新增样本" detail="在过去 1 小时内" />
      <StatusItem type="accent" label="待审样本" detail="需要您的关注" />
      <StatusItem type="real" label="专家在线" detail="运行正常" />
    </div>
  );
}

function PipelineThumbnail() {
  return (
    <div className={styles.miniPipeline}>
      {[0, 1, 2, 3, 4].map((node, index) => (
        <div className={styles.pipelineGroup} key={node}>
          <span
            className={`${styles.miniNode} ${index < 2 ? styles.done : ''} ${index === 2 ? styles.active : ''}`}
          >
            {index + 1}
          </span>
          {index < 4 ? <span className={`${styles.miniConnector} ${index <= 1 ? styles.active : ''}`} /> : null}
        </div>
      ))}
    </div>
  );
}

function MiniExpertIcon({ type }: { type?: string }) {
  return (
    <svg className={styles.expertIcon} viewBox="0 0 28 28" aria-hidden="true">
      {type === 'texture' ? (
        <>
          <path d="M8 20 20 8" />
          <path d="M5 16 16 5" />
          <path d="M12 23 23 12" />
        </>
      ) : null}
      {type === 'frequency' ? (
        <>
          <circle cx="14" cy="14" r="4" />
          <circle cx="14" cy="14" r="8" />
          <circle cx="14" cy="14" r="11" />
        </>
      ) : null}
      {type === 'style' ? <path d="M6 16c4-9 7 7 16-4" /> : null}
      {type === 'semantic' ? (
        <>
          <path d="M7 18 12 8l6 5 4-6" />
          <circle cx="7" cy="18" r="1.6" />
          <circle cx="12" cy="8" r="1.6" />
          <circle cx="18" cy="13" r="1.6" />
          <circle cx="22" cy="7" r="1.6" />
        </>
      ) : null}
    </svg>
  );
}

function ExpertsThumbnail() {
  return (
    <div className={styles.expertsGrid}>
      {expertsCore.map((expert) => (
        <div className={styles.expertMini} key={expert.name}>
          <MiniExpertIcon type={expert.iconType} />
          <span className={styles.expertName}>{expert.name}</span>
          <span className={styles.expertStatus} />
        </div>
      ))}
    </div>
  );
}

function AnomalyThumbnail() {
  return (
    <div className={styles.anomalyPreview}>
      <div className={styles.anomalyImages}>
        {anomalyPool.slice(0, 3).map((item) => (
          <div className={styles.anomalyThumb} key={item.id}>
            <img src={item.src} alt="" />
            <span className={styles.anomalyMark}>◐</span>
          </div>
        ))}
      </div>
      <p className={styles.anomalyHint}>
        <span className={styles.anomalyCount}>{anomalyPool.length}</span>
        <span className={styles.anomalyDash}>──</span>
        <span>个样本等待您的确认</span>
      </p>
    </div>
  );
}

export function AdminOverview() {
  return (
    <PageContainer width="normal">
      <div className={styles.page}>
        <header className="pageHeader">
          <p className="italic-quote">─ A workshop for keeping models honest ─</p>
          <h1 className="pageTitle">治 理 中 心</h1>
          <p className="pageEnglish">GOVERN</p>
        </header>

        <div className={styles.grid}>
          <OverviewSection index="01" title="今日动态" english="Today" to={null} order={0}>
            <TodayStatusList />
          </OverviewSection>
          <OverviewSection index="02" title="数据流动" english="Pipeline" to="/admin/pipeline" order={1}>
            <PipelineThumbnail />
          </OverviewSection>
          <OverviewSection index="03" title="专家状态" english="Experts" to="/admin/experts" order={2}>
            <ExpertsThumbnail />
          </OverviewSection>
          <OverviewSection index="04" title="异常关注" english="Anomaly" to="/admin/anomaly" order={3}>
            <AnomalyThumbnail />
          </OverviewSection>
        </div>
      </div>
    </PageContainer>
  );
}
