import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button, EdgeRule, Modal, PageContainer, useToast } from '@/components/primitives';
import { UserTopbar } from '@/components/UserTopbar/UserTopbar';
import { VerdictCard } from '@/components/VerdictCard/VerdictCard';
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

export function Report() {
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
            <Button variant="text" prefix="─" suffix="→" onClick={() => setModal('pdf')}>导出 PDF</Button>
            <Button variant="text" prefix="─" suffix="→" onClick={() => setModal('archive')}>归档</Button>
          </>
        }
      />
      <EdgeRule position="top" />

      <PageContainer width="narrow">
      <article className={styles.paper}>
        <p className={styles.italicQuote}>─ A report on visual authenticity ─</p>
        <h1>鉴 别 报 告</h1>
        <p className={styles.brand}>DEVELOP</p>
        <p className={styles.caseNo}>№ DV-2026-1121-003</p>

        <hr className={styles.sectionDivider} />

        <section>
          <h2>一. 送检材料</h2>
          <img src={imageDemo.src} className={styles.thumb} alt="" />
          <dl className={styles.meta}>
            <dt>类型</dt>
            <dd>图片</dd>
            <dt>尺寸</dt>
            <dd>1920 × 1080</dd>
            <dt>送检</dt>
            <dd>2026.11.21 14:23</dd>
          </dl>
        </section>

        <hr className={styles.sectionDivider} />

        <section>
          <h2>二. 鉴别结论</h2>
          <VerdictCard variant="large" verdict={imageDemo.verdict} confidence={imageDemo.confidence} />
        </section>

        <hr className={styles.sectionDivider} />

        <section>
          <h2>三. 三条关键证据</h2>
          <div className={styles.evidenceList}>
            {imageDemo.marks.map((mark) => (
              <EvidenceItem
                key={mark.label}
                code={mark.label}
                name={mark.name}
                thumb={imageDemo.src}
                description={`${mark.name} 区域与全局语义存在偏移，局部纹理、边缘过渡和光照响应不符合自然成像规律。`}
              />
            ))}
          </div>
        </section>

        <hr className={styles.sectionDivider} />

        <section>
          <h2>四. 显影过程</h2>
          <div className={styles.timelineLog}>
            {timelineEntries.map(([time, event, note]) => (
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
          <p>报告时间 ─ 2026.11.21 14:23:24</p>
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
