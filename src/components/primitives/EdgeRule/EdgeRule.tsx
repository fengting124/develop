import styles from './EdgeRule.module.css';

export interface EdgeRuleProps {
  position: 'top' | 'bottom';
  footerLeft?: string;
  footerRight?: string;
}

export function EdgeRule({ position, footerLeft, footerRight }: EdgeRuleProps) {
  const hasFooter = footerLeft || footerRight;

  return (
    <div className={`${styles.wrap} ${styles[position]}`}>
      <div className={styles.rule} aria-hidden="true" />
      {hasFooter ? (
        <div className={styles.footer}>
          <span>{footerLeft}</span>
          <span>{footerRight}</span>
        </div>
      ) : null}
    </div>
  );
}
