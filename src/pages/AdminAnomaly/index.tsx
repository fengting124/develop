import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button, Input, SideSheet, useToast } from '@/components/primitives';
import { ArrowLeft, ArrowRight } from '@/components/icons';
import { anomalyPool } from '@/data/mocks';
import styles from './AdminAnomaly.module.css';

export function AdminAnomaly() {
  const [items, setItems] = useState(anomalyPool);
  const [index, setIndex] = useState<number | null>(null);
  const { showToast } = useToast();
  const current = index === null ? null : items[index];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (index === null) return;
      if (event.key === 'Escape') setIndex(null);
      if (event.key === 'ArrowRight') setIndex(Math.min(index + 1, items.length - 1));
      if (event.key === 'ArrowLeft') setIndex(Math.max(index - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, items.length]);

  const submit = () => {
    if (index === null) return;
    const id = items[index].id;
    setIndex(null);
    setItems((currentItems) => currentItems.filter((item) => item.id !== id));
    showToast('已确认，正在生成同源样本', 'success');
  };

  return (
    <div className={styles.page}>
      <p className={styles.quote}>─ Where the model honestly hesitates ─</p>
      <h1>异 常 池</h1>
      <p className={styles.brand}>ANOMALY</p>
      <hr />
      <p className={styles.count}>共有 {items.length} 个样本等待您的确认</p>
      <motion.div className={styles.grid} layout>
        <AnimatePresence>
          {items.map((item, i) => (
            <motion.button layout exit={{ opacity: 0, scale: 0.86 }} className={styles.card} key={item.id} onClick={() => setIndex(i)} type="button">
              <span>◐ 待您确认</span>
              <img src={item.src} alt="" />
            </motion.button>
          ))}
        </AnimatePresence>
      </motion.div>
      <SideSheet isOpen={Boolean(current)} onClose={() => setIndex(null)} width={480}>
        {current ? (
          <div className={styles.sheet}>
            <div className={styles.sheetNav}>
              <button onClick={() => setIndex(Math.max((index ?? 0) - 1, 0))} type="button"><ArrowLeft /></button>
              <button onClick={() => setIndex(Math.min((index ?? 0) + 1, items.length - 1))} type="button"><ArrowRight /></button>
            </div>
            <p>─ Awaiting your judgement ─</p>
            <h2>样本 № {current.id}</h2>
            <hr />
            <img src={current.src} alt="" />
            <hr />
            <h3>系统判断</h3>
            <em>⋯ 这张图像让系统犹豫了。专家给出了分歧的意见，系统选择不下结论。</em>
            <hr />
            <h3>您的判断</h3>
            <div className={styles.radio}><button type="button">○ 这是 AI 生成</button><button type="button">○ 这是真实内容</button><button type="button">○ 我也无法判断</button></div>
            <label>备注（选填）<Input /></label>
            <Button fullWidth onClick={submit}>提交并触发同源样本扩充 →</Button>
          </div>
        ) : null}
      </SideSheet>
    </div>
  );
}
