import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { EdgeRule } from '@/components/primitives';
import { GalleryWall } from './GalleryWall';
import { HeroTitle } from './HeroTitle';
import { EntryCards } from './EntryCards';
import styles from './Home.module.css';

type Phase = 'intro' | 'end';

export function Home() {
  const [phase, setPhase] = useState<Phase>(() =>
    sessionStorage.getItem('home-visited') ? 'end' : 'intro',
  );
  const [imagesReady, setImagesReady] = useState(false);

  const skipToEnd = useCallback(() => {
    setPhase('end');
    sessionStorage.setItem('home-visited', '1');
  }, []);

  useEffect(() => {
    if (phase === 'end') return;

    sessionStorage.setItem('home-visited', '1');
    const timer = window.setTimeout(() => setPhase('end'), 7000);

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
      initial={false}
      animate={{
        backgroundColor: phase === 'end' ? 'var(--canvas)' : imagesReady ? 'var(--canvas)' : 'var(--ink-deep)',
      }}
      transition={{ duration: phase === 'end' ? 0.4 : 0.3 }}
    >
      <GalleryWall phase={phase} onReady={() => setImagesReady(true)} />

      <section className={styles.content} aria-label="DEVELOP 首页">
        <EdgeRule position="top" />
        <div className={styles.hero}>
          <HeroTitle active={phase === 'end'} />
          <EntryCards active={phase === 'end'} />
        </div>
        <EdgeRule
          position="bottom"
          footerLeft="DEVELOP / 视觉生成内容可解释检测系统"
          footerRight="v1.0 / 2026"
        />
      </section>
    </motion.main>
  );
}
