import styles from './EdgeRule.module.css';

export interface EdgeRuleProps {
  position: 'top' | 'bottom';
}

export function EdgeRule({ position }: EdgeRuleProps) {
  return <div className={`${styles.rule} ${styles[position]}`} aria-hidden="true" />;
}
