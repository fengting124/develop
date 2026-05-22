import { ArrowRight } from '@/components/icons';
import styles from './ExpertCard.module.css';

export interface ExpertCardProps {
  type: 'core' | 'lora';
  name: string;
  english: string;
  status: 'online' | 'training' | 'pending';
  trainingProgress?: number;
  iconType?: 'texture' | 'frequency' | 'style' | 'semantic' | 'lora';
}

function ExpertIcon({ type = 'lora' }: { type?: ExpertCardProps['iconType'] }) {
  return (
    <svg className={styles.symbol} viewBox="0 0 40 40" aria-hidden="true">
      {type === 'texture' ? [8, 13, 18, 23, 28].map((x) => <path key={x} d={`M${x} 30 26 ${x - 2}`} />) : null}
      {type === 'frequency' ? <><circle cx="20" cy="20" r="5" /><circle cx="20" cy="20" r="10" /><circle cx="20" cy="20" r="15" /></> : null}
      {type === 'style' ? <path d="M8 24c8-18 10 12 24-4" /> : null}
      {type === 'semantic' ? <><path d="M9 25 16 12l8 6 7-8" /><circle cx="9" cy="25" r="1.8" /><circle cx="16" cy="12" r="1.8" /><circle cx="24" cy="18" r="1.8" /><circle cx="31" cy="10" r="1.8" /><circle cx="22" cy="29" r="1.8" /></> : null}
      {type === 'lora' ? <><path d="m20 5 13 7v16l-13 7-13-7V12z" /><path d="m17 16 8 4-8 4z" /></> : null}
    </svg>
  );
}

export function ExpertCard({ name, english, status, trainingProgress = 0, iconType }: ExpertCardProps) {
  const statusText = status === 'online' ? '在线' : status === 'training' ? '训练' : '待激活';
  return (
    <article className={styles.card}>
      <span className={`${styles.status} ${styles[status]}`}>{status === 'online' ? '●' : status === 'training' ? '◐' : '◯'} {statusText}</span>
      <ExpertIcon type={iconType} />
      <div>
        <h3>{name}</h3>
        <p>{english}</p>
      </div>
      <ArrowRight className={styles.arrow} />
      {status === 'training' ? <span className={styles.progress}><i style={{ width: `${trainingProgress * 100}%` }} /></span> : null}
    </article>
  );
}
