import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { EdgeRule } from '@/components/primitives';
import styles from './NotFound.module.css';

export function NotFound() {
  return (
    <div className={styles.notFoundPage}>
      <EdgeRule position="top" />
      <main className={styles.main}>
        <div className={styles.decorativeTiles}>
          {[0, 1, 2, 3].map((item) => (
            <motion.div
              key={item}
              className={styles.tile}
              initial={{ rotateY: 0 }}
              animate={{ rotateY: 180 }}
              transition={{
                duration: 0.8,
                delay: item * 0.15,
                repeat: Infinity,
                repeatType: 'reverse',
                repeatDelay: 2,
                ease: [0.65, 0, 0.35, 1],
              }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className={styles.tileFront} />
              <div className={styles.tileBack}>
                <span className={styles.tileDot} />
              </div>
            </motion.div>
          ))}
        </div>

        <p className={styles.italicQuote}>─ Lost in development ─</p>
        <h1 className={styles.notFoundTitle}>页 面 未 显 影</h1>
        <p className={styles.notFoundEn}>PAGE NOT DEVELOPED</p>
        <div className={styles.notFoundCase}>
          <span className={styles.caseLine} />
          <span className={styles.caseText}>DV-404</span>
          <span className={styles.caseLine} />
        </div>
        <p className={styles.notFoundDescription}>
          ⋯ 这页内容仍在显影液中，<br />
          或许它从未被冲洗出来。
        </p>
        <Link to="/" className={styles.backHome}>
          <span className={styles.backDash}>─</span>
          <span>回到首页</span>
          <span className={styles.backArrow}>→</span>
        </Link>
      </main>
      <EdgeRule position="bottom" />
    </div>
  );
}
