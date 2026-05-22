import type { ReactNode } from 'react';
import styles from './PageContainer.module.css';

interface PageContainerProps {
  children: ReactNode;
  width?: 'narrow' | 'normal' | 'wide';
}

export function PageContainer({ children, width = 'normal' }: PageContainerProps) {
  return <div className={`${styles.container} ${styles[width]}`}>{children}</div>;
}
