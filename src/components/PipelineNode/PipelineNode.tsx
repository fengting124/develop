import styles from './PipelineNode.module.css';

export interface PipelineNodeProps {
  index: number;
  name: string;
  status: 'idle' | 'active' | 'done';
  iconType: 'audio' | 'text' | 'synthesis' | 'generation' | 'annotation';
}

function NodeIcon({ type, active }: { type: PipelineNodeProps['iconType']; active: boolean }) {
  return (
    <svg className={`${styles.icon} ${active ? styles.iconActive : ''} ${styles[type]}`} viewBox="0 0 32 32" aria-hidden="true">
      {type === 'audio' ? [6, 11, 16, 21, 26].map((x, i) => <rect key={x} x={x} y={8 + (i % 2) * 4} width="2" height={16 - (i % 2) * 8} />) : null}
      {type === 'text' ? <><path d="M7 10h14" /><path d="M7 16h18" /><path d="M7 22h10" /><path className={styles.cursor} d="M25 8v16" /></> : null}
      {type === 'synthesis' ? <><path d="M5 18c4-8 8 8 12 0s6-2 10 0" /><path className={styles.star} d="m22 7 1.2 2.8L26 11l-2.8 1.2L22 15l-1.2-2.8L18 11l2.8-1.2z" /></> : null}
      {type === 'generation' ? <><rect x="7" y="7" width="7" height="7" /><rect x="18" y="7" width="7" height="7" /><rect x="7" y="18" width="7" height="7" /><rect x="18" y="18" width="7" height="7" /></> : null}
      {type === 'annotation' ? <><rect x="7" y="7" width="7" height="7" /><rect x="18" y="7" width="7" height="7" /><rect x="7" y="18" width="7" height="7" /><rect x="18" y="18" width="7" height="7" /></> : null}
    </svg>
  );
}

export function PipelineNode({ index, name, status, iconType }: PipelineNodeProps) {
  return (
    <div className={styles.wrap}>
      <div className={`${styles.node} ${styles[status]}`}>
        <span className={styles.index}>⟨{index}⟩</span>
        <NodeIcon type={iconType} active={status === 'active'} />
        {status === 'done' ? <span className={styles.check}>✓</span> : null}
      </div>
      <p>{name}</p>
    </div>
  );
}
