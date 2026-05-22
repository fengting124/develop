import { motion } from 'framer-motion';
import styles from './VerdictCard.module.css';

export interface VerdictCardProps {
  verdict: 'fake' | 'real' | 'unsure';
  confidence: number;
  variant?: 'default' | 'large';
}

const copy = {
  fake: { zh: 'AI 生成', en: 'FAKE' },
  real: { zh: '真实影像', en: 'REAL' },
  unsure: { zh: '低置信度', en: 'UNSURE' },
};

export function VerdictCard({ verdict, confidence, variant = 'default' }: VerdictCardProps) {
  return (
    <motion.section
      className={`${styles.card} ${styles[verdict]} ${variant === 'large' ? styles.large : ''}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <h2>{copy[verdict].zh}</h2>
      <p>{copy[verdict].en}</p>
      <span>─ {Math.round(confidence * 100)}% confidence ─</span>
    </motion.section>
  );
}
