import type { ReactNode } from 'react';
import styles from './PageContainer.module.css';

interface PageContainerProps {
  children: ReactNode;
  width?: 'narrow' | 'normal' | 'wide';
  className?: string;
}

export function PageContainer({ children, width = 'normal', className }: PageContainerProps) {
  return <div className={`${styles.container} ${styles[width]}${className ? ` ${className}` : ''}`}>{children}</div>;
}
