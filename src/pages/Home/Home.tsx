import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { EdgeRule } from '@/components/primitives';
import { GalleryWall } from './GalleryWall';
import { HeroTitle } from './HeroTitle';
import { EntryCards } from './EntryCards';
import { AboutOverlay } from './AboutOverlay';
import styles from './Home.module.css';

type Phase = 'intro' | 'end';

export function Home() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [imagesReady, setImagesReady] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const springConfig = { damping: 30, stiffness: 100, mass: 1.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const rotateX = useTransform(smoothY, [0, 1], [4, -4]);
  const rotateY = useTransform(smoothX, [0, 1], [-4, 4]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (phase !== 'end') return;
    const { clientX, clientY } = e;
    mouseX.set(clientX / window.innerWidth);
    mouseY.set(clientY / window.innerHeight);
  }, [phase, mouseX, mouseY]);

  const skipToEnd = useCallback(() => {
    setPhase('end');
  }, []);

  useEffect(() => {
    if (phase === 'end') return;

    const timer = window.setTimeout(() => setPhase('end'), 4500);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === ' ') {
        event.preventDefault();
        skipToEnd();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [phase, skipToEnd]);

  const homeClassName = useMemo(
    () => `${styles.home} ${phase === 'end' ? styles.endState : styles.introState}`,
    [phase],
  );

  return (
    <motion.main
      className={homeClassName}
      onClick={phase === 'intro' ? skipToEnd : undefined}
      onMouseMove={handleMouseMove}
      initial={false}
      animate={{
        backgroundColor: phase === 'end' ? 'var(--canvas)' : imagesReady ? 'var(--canvas)' : 'var(--ink-deep)',
      }}
      transition={{ duration: phase === 'end' ? 0.4 : 0.3 }}
      style={{ perspective: 1200 }}
    >
      <motion.div style={{ rotateX, rotateY, width: '100%', height: '100%', transformStyle: 'preserve-3d' }}>
        <GalleryWall phase={phase} onReady={() => setImagesReady(true)} />

        <section className={styles.content} aria-label="DEVELOP 首页" style={{ transform: 'translateZ(30px)' }}>
          <EdgeRule position="top" />
          <div className={styles.hero}>
            <HeroTitle active={phase === 'end'} />
            <EntryCards active={phase === 'end'} />
            {/* 功能导览触发按钮 — 在入口卡出现后 0.4s 渐显 */}
            <motion.button
              className={styles.overviewBtn}
              onClick={() => setOverlayOpen(true)}
              initial={{ opacity: 0 }}
              animate={phase === 'end' ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.4, delay: phase === 'end' ? 1.5 : 0, ease: 'easeOut' }}
              type="button"
              aria-label="打开功能导览"
            >
              ──{'  '}功能导览{'  '}OVERVIEW{'  '}──
            </motion.button>
          </div>
          <EdgeRule
            position="bottom"
            footerLeft="DEVELOP / 视觉生成内容可解释检测系统"
            footerRight="v1.0 / 2026"
          />
        </section>
      </motion.div>

      {/* 导览覆盖层放在旋转 div 外部，避免 3D perspective 传播 */}
      <AboutOverlay isOpen={overlayOpen} onClose={() => setOverlayOpen(false)} />
    </motion.main>
  );
}
