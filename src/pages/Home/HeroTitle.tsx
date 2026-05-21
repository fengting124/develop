import { motion } from 'framer-motion';
import styles from './HeroTitle.module.css';

interface HeroTitleProps {
  active: boolean;
}

export function HeroTitle({ active }: HeroTitleProps) {
  return (
    <div className={styles.wrap}>
      <motion.p
        className={styles.quote}
        initial={{ opacity: 0, y: 10 }}
        animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        ─ Every pixel tells. We just listen. ─
      </motion.p>

      <h1 className={styles.title}>
        {['显', '影'].map((char, index) => (
          <motion.span
            key={char}
            initial={{ opacity: 0, letterSpacing: '0em', scale: 0.9 }}
            animate={
              active
                ? { opacity: 1, letterSpacing: '0.2em', scale: 1 }
                : { opacity: 0, letterSpacing: '0em', scale: 0.9 }
            }
            transition={{ duration: 0.4, delay: index * 0.1, ease: 'easeOut' }}
          >
            {char}
          </motion.span>
        ))}
      </h1>

      <motion.p
        className={styles.brand}
        initial={{ y: 16, opacity: 0 }}
        animate={active ? { y: 0, opacity: 1 } : { y: 16, opacity: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        DEVELOP
      </motion.p>
    </div>
  );
}
