import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/primitives';
import { UserTopbar } from '@/components/UserTopbar/UserTopbar';
import { FilmReel } from '@/components/icons';
import styles from './DetectVideo.module.css';

const frames = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  risk: index % 5 === 0 || index === 11,
}));

export function DetectVideo() {
  const [running, setRunning] = useState(false);
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setCursor((value) => (value + 1) % frames.length);
    }, 420);
    return () => window.clearInterval(timer);
  }, [running]);

  return (
    <main className={styles.page}>
      <UserTopbar title="视频检测台" english="VIDEO FORENSICS" />
      <section className={styles.body}>
        <div className={styles.stage}>
          <div className={styles.viewer}>
            <FilmReel className={running ? styles.reelRunning : ''} />
            <h1>{running ? '沿时间轴显影中' : '等待视频材料'}</h1>
            <p>─ Temporal forensic reading ─</p>
            <Button variant="primary" onClick={() => setRunning((value) => !value)}>
              {running ? '暂停扫描' : '使用示例视频'}
            </Button>
          </div>
          <aside className={styles.panel}>
            <h2>时间线</h2>
            <p>风险帧会在扫描时被朱红色标出。</p>
            <div className={styles.timeline}>
              {frames.map((frame) => (
                <motion.span
                  key={frame.id}
                  className={`${frame.risk ? styles.risk : ''} ${cursor === frame.id ? styles.active : ''}`}
                  animate={cursor === frame.id ? { height: 64 } : { height: frame.risk ? 42 : 28 }}
                />
              ))}
            </div>
            <div className={styles.metrics}>
              <span>FRAME {String(cursor + 1).padStart(2, '0')}</span>
              <strong>{frames[cursor].risk ? '异常片段' : '稳定片段'}</strong>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
