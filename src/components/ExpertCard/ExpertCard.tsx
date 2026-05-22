import { ArrowRight } from '@/components/icons';
import { SemanticIcon, SpectrumIcon, StyleIcon, TextureIcon } from '@/components/icons/ExpertIcons';
import styles from './ExpertCard.module.css';

export interface ExpertCardProps {
  type: 'core' | 'lora';
  name?: string;
  english?: string;
  id?: string;
  generatorName?: string;
  generatorShort?: string;
  logoSrc?: string;
  status: 'online' | 'training' | 'pending';
  trainingProgress?: number;
  iconType?: 'texture' | 'frequency' | 'style' | 'semantic' | 'lora';
}

const statusLabel = {
  online: '在线',
  training: '训练中',
  pending: '待激活',
};

function StatusIndicator({ status }: { status: ExpertCardProps['status'] }) {
  return (
    <span className={`${styles.statusRow} ${styles[status]}`}>
      <span className={styles.statusDot} />
      <span>{statusLabel[status]}</span>
    </span>
  );
}

function CoreIcon({ type }: { type?: ExpertCardProps['iconType'] }) {
  if (type === 'frequency') return <SpectrumIcon />;
  if (type === 'style') return <StyleIcon />;
  if (type === 'semantic') return <SemanticIcon />;
  return <TextureIcon />;
}

function CoreExpertCard({ name = '', english = '', status, iconType }: ExpertCardProps) {
  return (
    <article className={styles.coreExpertCard}>
      <StatusIndicator status={status} />
      <div className={styles.iconWrap}>
        <CoreIcon type={iconType} />
      </div>
      <div className={styles.nameWrap}>
        <h3 className={styles.nameCn}>{name}</h3>
        <p className={styles.nameEn}>{english}</p>
      </div>
      <ArrowRight className={styles.arrow} />
    </article>
  );
}

function LoraExpertCard({
  id = '',
  generatorName = '',
  generatorShort = '',
  logoSrc = '/images/generators/default.png',
  status,
  trainingProgress = 0,
}: ExpertCardProps) {
  return (
    <article className={`${styles.loraCard} ${styles[status]}`}>
      <StatusIndicator status={status} />
      <div className={styles.loraBody}>
        <div className={styles.logoWrap}>
          <img src={logoSrc} alt={generatorName} className={styles.logo} />
        </div>
        <div className={styles.loraIdBlock}>
          <p className={styles.loraId}>{id}</p>
          <p className={styles.loraTarget}>
            <span>─</span>
            <span>{generatorShort}</span>
          </p>
        </div>
      </div>
      <div className={styles.loraFooter}>
        <p className={styles.generatorName}>{generatorName}</p>
        {status === 'training' ? (
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${trainingProgress * 100}%` }} />
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function ExpertCard(props: ExpertCardProps) {
  return props.type === 'core' ? <CoreExpertCard {...props} /> : <LoraExpertCard {...props} />;
}
