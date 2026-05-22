import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PipelineNode } from '@/components/PipelineNode/PipelineNode';
import { pipelineProducts } from '@/data/mocks';
import styles from './AdminPipeline.module.css';

const nodes = [
  ['音轨', 'audio'],
  ['文本', 'text'],
  ['合成', 'synthesis'],
  ['生成', 'generation'],
  ['标注', 'annotation'],
] as const;

export function AdminPipeline() {
  const [phase, setPhase] = useState(0);
  const [plus, setPlus] = useState(false);
  const [phaseProgress, setPhaseProgress] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const progressTimer = window.setInterval(() => {
      setPhaseProgress(((Date.now() - startedAt) % 2500) / 2500);
    }, 120);
    const timer = window.setInterval(() => {
      setPhase((value) => {
        const next = (value + 1) % 6;
        if (next === 0) {
          setPlus(true);
          window.setTimeout(() => setPlus(false), 900);
        }
        return next;
      });
    }, 2500);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(progressTimer);
    };
  }, []);

  const activeIndex = Math.min(phase, 4);
  const progress = phase >= 5 ? 100 : phaseProgress * 100;

  return (
    <div className={styles.page}>
      <p className={styles.quote}>─ The workshop runs day and night ─</p>
      <h1>数 据 生 成</h1>
      <p className={styles.brand}>PIPELINE</p>
      <hr />
      <section className={styles.flow}>
        {nodes.map(([name, type], index) => (
          <div className={styles.nodeSlot} key={name}>
            <PipelineNode
              index={index + 1}
              name={name}
              iconType={type}
              status={phase > index ? 'done' : phase === index ? 'active' : 'idle'}
            />
            {index < nodes.length - 1 ? <svg className={`${styles.line} ${phase === index ? styles.lineActive : ''}`} viewBox="0 0 90 8"><path d="M0 4h90" /></svg> : null}
          </div>
        ))}
        <AnimatePresence>{plus ? <motion.span className={styles.plus} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>+1</motion.span> : null}</AnimatePresence>
      </section>
      <hr />
      <section>
        <h2>当前正在处理</h2>
        <div className={styles.current}>
          <img src={pipelineProducts[activeIndex % pipelineProducts.length].src} alt="" />
          <div>
            <p>当前阶段 ─ {nodes[activeIndex][0]}</p>
            <span><i style={{ width: `${progress}%` }} /></span>
          </div>
        </div>
      </section>
      <hr />
      <section>
        <h2>产出物</h2>
        <div className={styles.products}>
          {pipelineProducts.map((item) => (
            <article key={item.src}>
              <img src={item.src} alt="" />
              <span>{item.createdAgo}<br />时长 ─ {item.duration}<br />类型 ─ {item.type}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
