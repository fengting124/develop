import type { ReactNode } from 'react';
import styles from './Button.module.css';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'text';
  children: ReactNode;
  prefix?: ReactNode;
  suffix?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  children,
  prefix,
  suffix,
  onClick,
  disabled = false,
  fullWidth = false,
}: ButtonProps) {
  return (
    <button
      className={`${styles.button} ${styles[variant]} ${fullWidth ? styles.fullWidth : ''}`}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      {prefix ? <span className={styles.affix}>{prefix}</span> : null}
      <span>{children}</span>
      {suffix ? <span className={styles.affix}>{suffix}</span> : null}
    </button>
  );
}
