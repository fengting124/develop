import styles from './Timeline.module.css';

export interface TimelineProps {
  duration: number;
  fakeRanges: Array<{ start: number; end: number }>;
  currentTime?: number;
  activeRangeIndex?: number | null;
}

function formatTime(seconds: number) {
  return `0:${String(Math.round(seconds)).padStart(2, '0')}`;
}

export function Timeline({ duration, fakeRanges, currentTime = 0, activeRangeIndex = null }: TimelineProps) {
  const ticks = [0, 8, 16, 24, duration];

  return (
    <div className={styles.wrap}>
      <div className={styles.ticks}>
        {ticks.map((tick) => (
          <span key={tick}>{formatTime(tick)}</span>
        ))}
      </div>
      <div className={styles.track}>
        {fakeRanges.map((range, index) => (
          <span
            className={`${styles.range} ${activeRangeIndex === index ? styles.activeRange : ''}`}
            key={`${range.start}-${range.end}`}
            style={{
              left: `${(range.start / duration) * 100}%`,
              width: `${((range.end - range.start) / duration) * 100}%`,
              opacity: currentTime >= range.start ? 1 : 0,
            }}
          />
        ))}
        <span className={styles.cursor} style={{ left: `${Math.min(currentTime / duration, 1) * 100}%` }} />
      </div>
    </div>
  );
}
