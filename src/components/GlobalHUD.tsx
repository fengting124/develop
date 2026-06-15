import { useEffect, useState } from 'react';
import styles from './GlobalHUD.module.css';

export function GlobalHUD() {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      clearInterval(timer);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className={styles.hudOverlay}>
      {/* 4 Corners */}
      <div className={`${styles.corner} ${styles.tl}`} />
      <div className={`${styles.corner} ${styles.tr}`} />
      <div className={`${styles.corner} ${styles.bl}`} />
      <div className={`${styles.corner} ${styles.br}`} />

      {/* Top Status */}
      <div className={styles.topStatus}>
        <span className={styles.recordDot} />
        <span>LIVE SECURE CONNECTION</span>
        <span className={styles.time}>{time}</span>
      </div>

      {/* Right Edge Data Stream */}
      <div className={styles.dataStream}>
        <div className={styles.dataInner}>
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i}>{Math.random().toString(16).substr(2, 8).toUpperCase()}</div>
          ))}
        </div>
      </div>

      {/* Tactical Mouse Tracker */}
      <div 
        className={styles.tacticalCursor}
        style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}
      />
      
      {/* CRT Scanline Sweep */}
      <div className={styles.scanlineSweep} />
    </div>
  );
}
