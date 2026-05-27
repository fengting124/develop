import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './BootSequence.module.css';

const BOOT_LOGS = [
  "> INITIATING OS_KERNEL_V4.2...",
  "> ESTABLISHING NEURAL LINK...",
  "> SYNCING GLOBAL THREAT DATABASE [██████████] 100%",
  "> DECRYPTING SECURE CHANNELS...",
  "> LOADING TACTICAL HUD...",
  "> ACCESS GRANTED. WELCOME, ADMIN."
];

export function BootSequence() {
  const [isVisible, setIsVisible] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    let delay = 200;
    BOOT_LOGS.forEach((log) => {
      setTimeout(() => {
        setLogs((prev) => [...prev, log]);
      }, delay);
      delay += Math.random() * 250 + 150;
    });

    setTimeout(() => {
      setIsVisible(false);
    }, delay + 600);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          className={styles.bootScreen}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(20px)", scale: 1.1 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          <div className={styles.terminal}>
            <div className={styles.logo}>ANTIGRAVITY OS</div>
            <div className={styles.logs}>
              {logs.map((log, i) => (
                <div key={i} className={styles.logLine}>{log}</div>
              ))}
              <div className={styles.cursor} />
            </div>
          </div>
          <div className={styles.scanline} />
          <div className={styles.gridOverlay} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
