import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Button, PageContainer } from '@/components/primitives';
import { ForensicMark } from '@/components/ForensicMark/ForensicMark';
import { UserTopbar } from '@/components/UserTopbar/UserTopbar';
import { VerdictCard } from '@/components/VerdictCard/VerdictCard';
import { marks, evidences, steps, type ProcessState } from './mock';
import styles from './DetectImage.module.css';

const demoImage = '/images/samples/image-demo-01.jpg';

function StepItem({
  index,
  name,
  english,
  status,
  time,
}: {
  index: string;
  name: string;
  english: string;
  status: 'done' | 'active' | 'pending';
  time?: string;
}) {
  return (
    <div className={`${styles.step} ${styles[status]}`}>
      <span className={styles.stepIndex}>{index}</span>
      <div>
        <strong>{name}</strong>
        <em>{english}</em>
        <span className={styles.stepState}>
          {status === 'done' ? `✓ ${time}` : status === 'active' ? '⋯ 进行中' : '○'}
        </span>
      </div>
    </div>
  );
}

export function DetectImage() {
  const [state, setState] = useState<ProcessState>('idle');
  const [imageSrc, setImageSrc] = useState(demoImage);
  const [elapsed, setElapsed] = useState(0);
  const [activeMark, setActiveMark] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const startProcessing = (src = demoImage) => {
    setImageSrc(src);
    setElapsed(0);
    setActiveMark(null);
    setState('processing');
  };

  useEffect(() => {
    if (state !== 'processing') return;

    const startedAt = Date.now();
    const interval = window.setInterval(() => setElapsed(Date.now() - startedAt), 100);
    const doneTimer = window.setTimeout(() => setState('done'), 7500);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(doneTimer);
    };
  }, [state]);

  const completedTime = steps.reduce<number[]>((acc, step, index) => {
    acc[index] = (acc[index - 1] ?? 0) + step.duration;
    return acc;
  }, []);
  const activeStep = completedTime.findIndex((time) => elapsed < time);
  const visibleMarks = marks.filter((mark) => elapsed >= mark.appearAt || state === 'done');
  const visibleEvidences = evidences.filter((evidence) => elapsed >= evidence.appearAt || state === 'done');

  const handleFile = (file?: File) => {
    if (!file) return;
    startProcessing(URL.createObjectURL(file));
  };

  return (
    <main className={styles.page}>
      <UserTopbar title="图片检测台" english="IMAGE FORENSICS" />
      <PageContainer width="wide">
      {state === 'idle' ? (
        <section className={styles.idle}>
          <button
            className={styles.dropzone}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              handleFile(event.dataTransfer.files[0]);
            }}
            type="button"
          >
            <span>拖入或点击选择一张图片</span>
            <em>─ Drop your image to begin ─</em>
            <strong>支持 JPG · PNG · WebP</strong>
          </button>
          <input
            ref={inputRef}
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          <Button variant="text" prefix="─" suffix="→" onClick={() => startProcessing(demoImage)}>
            使用示例图
          </Button>
        </section>
      ) : (
        <section className={styles.workbench}>
          <div className={styles.imagePanel}>
            <div className={styles.imageWrap}>
              <img src={imageSrc} alt="" />
              <AnimatePresence>
                {visibleMarks.map((mark) => (
                  <ForensicMark key={mark.label} {...mark} active={activeMark === mark.label} />
                ))}
              </AnimatePresence>
              {state === 'done' ? <span className={styles.imageBadge}>FAKE</span> : null}
            </div>
          </div>

          <aside className={styles.sidePanel}>
            {state === 'processing' ? (
              <>
                <header className={styles.panelTitle}>
                  <h2>正在显影</h2>
                  <p>─ Developing</p>
                </header>
                <div className={styles.steps}>
                  {steps.map((step, index) => (
                    <StepItem
                      key={step.name}
                      index={String(index + 1).padStart(2, '0')}
                      name={step.name}
                      english={step.english}
                      status={elapsed >= completedTime[index] ? 'done' : index === activeStep ? 'active' : 'pending'}
                      time={`${(step.duration / 1000).toFixed(1)}s`}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className={styles.donePanel}>
                <VerdictCard verdict="fake" confidence={0.93} />
                <h2>─ 三条关键线索 ─</h2>
                <div className={styles.clueList}>
                  {marks.map((mark) => (
                    <button
                      key={mark.label}
                      onMouseEnter={() => setActiveMark(mark.label)}
                      onMouseLeave={() => setActiveMark(null)}
                      type="button"
                    >
                      {mark.label} · {mark.clue}
                    </button>
                  ))}
                </div>
                <Link className={styles.reportLink} to="/detect/report/demo">─ 查看完整报告 →</Link>
              </div>
            )}
          </aside>

          <div className={styles.evidenceBar}>
            <h2>已发现的线索</h2>
            <div>
              {evidences.map((evidence) => {
                const visible = visibleEvidences.includes(evidence);
                return (
                  <motion.span
                    key={evidence.name}
                    className={visible ? styles.evidenceVisible : ''}
                    initial={false}
                    animate={visible ? { x: 0, opacity: 1 } : { x: 16, opacity: 0.45 }}
                  >
                    {visible ? '●' : '○'} {evidence.name}
                  </motion.span>
                );
              })}
            </div>
          </div>
        </section>
      )}
      </PageContainer>
    </main>
  );
}
