import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Close } from '@/components/icons';
import styles from './SideSheet.module.css';

export interface SideSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  showClose?: boolean;
}

export function SideSheet({ isOpen, onClose, children, width = 480, showClose = true }: SideSheetProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.aside
            className={styles.sheet}
            style={{ width }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.65, 0, 0.35, 1] }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {showClose ? (
              <button className={styles.close} onClick={onClose} type="button" aria-label="关闭">
                <Close />
              </button>
            ) : null}
            {children}
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
