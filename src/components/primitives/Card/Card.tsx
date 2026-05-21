import type { ReactNode } from 'react';
import styles from './Card.module.css';

export interface CardProps {
  children: ReactNode;
  hoverable?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Card({ children, hoverable = false, padding = 'md', className = '' }: CardProps) {
  return (
    <section
      className={`${styles.card} ${styles[padding]} ${hoverable ? styles.hoverable : ''} ${className}`}
    >
      {children}
    </section>
  );
}
