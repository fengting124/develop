import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from '@/components/icons';
import styles from './EntryCards.module.css';

interface EntryCardProps {
  title: string;
  english: string;
  description: string;
  to: string;
}

function EntryCard({ title, english, description, to }: EntryCardProps) {
  return (
    <Link className={styles.card} to={to}>
      <span className={styles.top}>
        <strong>{title}</strong>
        <span>{english}</span>
      </span>
      <span className={styles.bottom}>
        <span>{description}</span>
        <span className={styles.enter}>
          ─ Enter <ArrowRight />
        </span>
      </span>
    </Link>
  );
}

export function EntryCards({ active }: { active: boolean }) {
  return (
    <motion.div
      className={styles.entries}
      initial={{ y: 24, opacity: 0 }}
      animate={active ? { y: 0, opacity: 1 } : { y: 24, opacity: 0 }}
      transition={{ duration: 0.4, delay: active ? 1.1 : 0, ease: 'easeOut' }}
    >
      <EntryCard title="鉴别" english="DETECT" description="为创作者与审核者" to="/detect" />
      <EntryCard title="治理" english="GOVERN" description="为系统建设者" to="/admin" />
    </motion.div>
  );
}
