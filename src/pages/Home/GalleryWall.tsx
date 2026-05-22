import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { galleryManifest } from './galleryManifest';
import type { GalleryManifestItem } from './galleryManifest';
import styles from './GalleryWall.module.css';

type Phase = 'intro' | 'end';

interface GalleryWallProps {
  phase: Phase;
  onReady: () => void;
}

const GRID_COLUMNS = 9;
const GRID_ROWS = 6;
const GRID_SIZE = GRID_COLUMNS * GRID_ROWS;
const GALLERY_PATH = '/samples';

function seeded(index: number, salt: number) {
  const x = Math.sin(index * 78.233 + salt * 37.719) * 43758.5453;
  return x - Math.floor(x);
}

export function GalleryWall({ phase, onReady }: GalleryWallProps) {
  const [items, setItems] = useState<GalleryManifestItem[]>(galleryManifest.slice(0, GRID_SIZE));
  const [hasImages, setHasImages] = useState(true);
  const [readySent, setReadySent] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(`${GALLERY_PATH}/manifest.json`)
      .then((response) => {
        if (!response.ok) throw new Error('manifest missing');
        return response.json() as Promise<GalleryManifestItem[]>;
      })
      .then((manifest) => {
        if (cancelled) return;
        const normalized = manifest.slice(0, GRID_SIZE);
        if (normalized.length) {
          setItems(normalized);
          setHasImages(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setItems(galleryManifest.slice(0, GRID_SIZE));
        setHasImages(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasImages) {
      const timer = window.setTimeout(() => {
        onReady();
        setReadySent(true);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    let cancelled = false;
    const tasks = items.map(
      (item) =>
        new Promise<void>((resolve) => {
          const image = new Image();
          image.onload = () => resolve();
          image.onerror = () => resolve();
          image.src = `${GALLERY_PATH}/${item.file}`;
        }),
    );

    Promise.all(tasks).then(() => {
      if (!cancelled) {
        onReady();
        setReadySent(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [hasImages, items, onReady]);

  const columns = GRID_COLUMNS;
  const rows = GRID_ROWS;
  const centerRow = (rows - 1) / 2;
  const centerCol = (columns - 1) / 2;

  const prepared = useMemo(
    () =>
      items.map((item, index) => {
        const row = Math.floor(index / columns);
        const col = index % columns;
        const gridSize = Math.max(items.length, 1);
        const appearDelay = 0.3 + (((row * 7 + col * 3) % gridSize) * 0.03);
        const stampDelay = 1.8 + seeded(index, 3) * 2.2;
        const rotate = -4 + seeded(index, 9) * 8;
        const distance = Math.hypot(row - centerRow, col - centerCol);
        const flipDelay = 4 + distance * 0.08;
        const gatherDelay = 3.25 + seeded(index, 14) * 0.12;
        const tint = 33 + Math.round(seeded(index, 21) * 28);

        return {
          item,
          row,
          col,
          appearDelay,
          stampDelay,
          rotate,
          flipDelay,
          gatherDelay,
          tint,
        };
      }),
    [centerCol, centerRow, columns, items],
  );

  return (
    <motion.div
      className={styles.wall}
      style={{ '--columns': columns, '--rows': rows } as CSSProperties}
      initial={{ opacity: 0 }}
      animate={{ opacity: phase === 'end' ? 0 : readySent ? 1 : 0 }}
      transition={{ duration: phase === 'end' ? 0.4 : 0.3 }}
      aria-hidden="true"
    >
      {prepared.map(({ item, appearDelay, stampDelay, rotate, flipDelay, gatherDelay, tint }, index) => (
        <motion.div
          className={styles.cell}
          key={item.file}
          initial={{ opacity: 0, scale: 0.95, x: 0, y: 0 }}
          animate={
            phase === 'end'
              ? { opacity: 0, scale: 0, x: '0vw', y: '0vh' }
              : { opacity: 1, scale: 1, x: 0, y: 0 }
          }
          transition={
            phase === 'end'
              ? { duration: 0.4, ease: [0.7, 0, 0.3, 1] }
              : { delay: appearDelay, duration: 0.6, ease: 'easeOut' }
          }
        >
          <motion.div
            className={styles.flipper}
            initial={{ rotateY: 0 }}
            animate={phase === 'end' ? { rotateY: 180 } : { rotateY: 180 }}
            transition={{ delay: phase === 'end' ? 0 : flipDelay, duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
          >
            <div className={styles.face}>
              {hasImages ? (
                <img
                  src={`${GALLERY_PATH}/${item.file}`}
                  alt=""
                  loading="eager"
                  decoding="async"
                  fetchPriority={index < 8 ? 'high' : 'auto'}
                  draggable="false"
                />
              ) : (
                <span className={styles.placeholder} style={{ backgroundColor: `rgb(${tint}, ${tint - 4}, ${tint - 10})` }} />
              )}
              <motion.span
                className={`${styles.stamp} ${item.type === 'fake' ? styles.fake : styles.real}`}
                style={{ rotate }}
                initial={{ opacity: 0, scale: 1.3 }}
                animate={phase === 'end' ? { opacity: 0, scale: 1 } : { opacity: 1, scale: 1 }}
                transition={
                  phase === 'end'
                    ? { duration: 0.2 }
                    : { delay: stampDelay, duration: 0.25, ease: 'easeOut' }
                }
              >
                {item.type}
              </motion.span>
            </div>
            <motion.div
              className={styles.back}
              animate={phase === 'end' ? { opacity: 0 } : { opacity: [1, 1, 0] }}
              transition={
                phase === 'end'
                  ? { duration: 0.25, ease: [0.7, 0, 0.3, 1] }
                  : { delay: gatherDelay, duration: 0.8, ease: [0.7, 0, 0.3, 1] }
              }
            />
          </motion.div>
        </motion.div>
      ))}
    </motion.div>
  );
}
