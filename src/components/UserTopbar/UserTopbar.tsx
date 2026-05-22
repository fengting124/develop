import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ArrowLeft } from '@/components/icons';
import styles from './UserTopbar.module.css';

interface UserTopbarProps {
  title: string;
  english: string;
  actions?: ReactNode;
}

export function UserTopbar({ title, english, actions }: UserTopbarProps) {
  const navigate = useNavigate();

  return (
    <header className={styles.topbar}>
      <button className={styles.back} onClick={() => navigate(-1)} type="button">
        <ArrowLeft />
        <span>返回</span>
      </button>
      <div className={styles.title}>
        <span>{title}</span>
        <strong>{english}</strong>
      </div>
      <div className={styles.actions}>
        {actions ?? <button className={styles.about} type="button">关于显影</button>}
      </div>
    </header>
  );
}
