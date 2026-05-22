import { motion } from 'framer-motion';
import styles from './ForensicMark.module.css';

export interface ForensicMarkProps {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  confidence: number;
  active?: boolean;
}

export function ForensicMark({ x, y, w, h, label, confidence, active = false }: ForensicMarkProps) {
  return (
    <motion.div
      className={`${styles.mark} ${active ? styles.active : ''}`}
      style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <motion.span
        className={styles.label}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.2 }}
      >
        {label} · {confidence.toFixed(2)}
      </motion.span>
    </motion.div>
  );
}
