import { motion } from 'framer-motion';
import styles from './KeyframeStrip.module.css';

export interface KeyframeStripProps {
  frames: Array<{ src: string; time: number }>;
  fakeRanges: Array<{ start: number; end: number }>;
  currentTime?: number;
  activeRangeIndex?: number | null;
}

export function KeyframeStrip({ frames, fakeRanges, currentTime = 0, activeRangeIndex = null }: KeyframeStripProps) {
  return (
    <div className={styles.strip}>
      {frames.map((frame) => {
        const rangeIndex = fakeRanges.findIndex((range) => frame.time >= range.start && frame.time <= range.end);
        const flagged = rangeIndex >= 0 && currentTime >= frame.time;
        return (
          <motion.div
            className={`${styles.frame} ${flagged ? styles.flagged : ''} ${activeRangeIndex === rangeIndex ? styles.active : ''}`}
            key={`${frame.src}-${frame.time}`}
            animate={{ opacity: currentTime >= frame.time ? 1 : 0.72 }}
          >
            <img src={frame.src} alt="" loading="eager" />
          </motion.div>
        );
      })}
    </div>
  );
}
