import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { PageContainer } from '@/components/primitives';
import { KeyframeStrip } from '@/components/KeyframeStrip/KeyframeStrip';
import { Timeline } from '@/components/Timeline/Timeline';
import { UserTopbar } from '@/components/UserTopbar/UserTopbar';
import { VerdictCard } from '@/components/VerdictCard/VerdictCard';
import { FilmReel } from '@/components/icons';
import { videoDemo, videoFrames } from '@/data/mocks';
import styles from './DetectVideo.module.css';

const scanDuration = 9200;

export function DetectVideo() {
  const [running, setRunning] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeRange, setActiveRange] = useState<number | null>(null);

  useEffect(() => {
    if (!running) return;
    const startedAt = Date.now() - (currentTime / videoDemo.duration) * scanDuration;
    const timer = window.setInterval(() => {
      const next = Math.min(((Date.now() - startedAt) / scanDuration) * videoDemo.duration, videoDemo.duration);
      setCurrentTime(next);
      if (next >= videoDemo.duration) setRunning(false);
    }, 80);
    return () => window.clearInterval(timer);
  }, [currentTime, running]);

  const activeReason = useMemo(
    () => videoDemo.fakeRanges.find((range) => currentTime >= range.start && currentTime <= range.end)?.reason ?? '稳定片段',
    [currentTime],
  );

  return (
    <main className={styles.page}>
      <UserTopbar title="视频检测台" english="VIDEO FORENSICS" />
      <PageContainer width="wide">
      <section className={styles.body}>
        <div className={styles.player}>
          <div className={styles.videoBox}>
            <FilmReel className={running ? styles.reelRunning : ''} />
            <h1>{running ? '视频正在显影' : '扫描完成'}</h1>
            <p>─ Temporal forensic reading ─</p>
            <span>{activeReason}</span>
          </div>
        </div>

        <section className={styles.block}>
          <h2>── 关键帧 ────</h2>
          <KeyframeStrip
            frames={videoFrames}
            fakeRanges={videoDemo.fakeRanges}
            currentTime={currentTime}
            activeRangeIndex={activeRange}
          />
        </section>

        <section className={styles.block}>
          <h2>── 时间轴 ────</h2>
          <Timeline
            duration={videoDemo.duration}
            fakeRanges={videoDemo.fakeRanges}
            currentTime={currentTime}
            activeRangeIndex={activeRange}
          />
        </section>

        <section className={styles.result}>
          <div className={styles.progress}>
            <h2>{running ? '鉴定进展' : '鉴别结论'}</h2>
            <p>{running ? '红色区段正在被显影。' : '检测到两个高风险伪造时段。'}</p>
          </div>
          {!running ? <VerdictCard verdict="fake" confidence={0.91} /> : null}
          <div className={styles.ranges}>
            {videoDemo.fakeRanges.map((range, index) => (
              <motion.button
                key={`${range.start}-${range.end}`}
                onMouseEnter={() => {
                  setActiveRange(index);
                  setCurrentTime(range.start);
                }}
                onMouseLeave={() => setActiveRange(null)}
                type="button"
                whileHover={{ x: 6 }}
              >
                <span>
                  0:{String(Math.floor(range.start)).padStart(2, '0')} - 0:
                  {String(Math.floor(range.end)).padStart(2, '0')}
                </span>
                ─ {range.reason}
              </motion.button>
            ))}
          </div>
        </section>
      </section>
      </PageContainer>
    </main>
  );
}
