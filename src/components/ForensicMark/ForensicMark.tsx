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
  tooltip?: string;
}

export function ForensicMark({ x, y, w, h, label, confidence, active = false, tooltip }: ForensicMarkProps) {
  return (
    <motion.div
      className={`${styles.markWrapper} ${active ? styles.active : ''} ${tooltip ? 'hasTooltip' : ''}`}
      style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` }}
      initial="hidden"
      animate="visible"
      exit="hidden"
    >
      {tooltip && (
        <div className="tooltipContent" style={{ bottom: 'calc(100% + 20px)' }}>
          {tooltip}
        </div>
      )}
      {/* 科技感边角 */}
      <motion.div className={styles.cornerTL} variants={{ hidden: { opacity: 0, scale: 0.5 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } } }} />
      <motion.div className={styles.cornerTR} variants={{ hidden: { opacity: 0, scale: 0.5 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.3, delay: 0.1 } } }} />
      <motion.div className={styles.cornerBL} variants={{ hidden: { opacity: 0, scale: 0.5 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.3, delay: 0.1 } } }} />
      <motion.div className={styles.cornerBR} variants={{ hidden: { opacity: 0, scale: 0.5 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.3, delay: 0.2 } } }} />

      {/* 中心呼吸焦点 */}
      <div className={styles.centerHotspot}>
        <motion.div 
          className={styles.ripple} 
          variants={{
            hidden: { scale: 0.2, opacity: 0 },
            visible: { scale: 2.5, opacity: 0, transition: { repeat: Infinity, duration: 2, ease: "easeOut" } }
          }} 
        />
        <motion.div 
          className={styles.core}
          variants={{ hidden: { scale: 0 }, visible: { scale: 1, transition: { type: "spring", bounce: 0.5, delay: 0.3 } } }}
        />
      </div>

      {/* 引线与标签 */}
      <div className={styles.callout}>
        <motion.div 
          className={styles.calloutLineHorizontal}
          variants={{ hidden: { scaleX: 0 }, visible: { scaleX: 1, transition: { duration: 0.3, delay: 0.4 } } }}
        />
        <motion.div
          className={styles.labelWrapper}
          variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0, transition: { duration: 0.3, delay: 0.7 } } }}
        >
          <span className={styles.labelIcon}>◆</span>
          <strong className={styles.labelTitle}>{label}</strong>
          <span className={styles.labelConfidence}>{(confidence * 100).toFixed(0)}%</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
