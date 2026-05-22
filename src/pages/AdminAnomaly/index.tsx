import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PageContainer, SideSheet, useToast } from '@/components/primitives';
import { ArrowLeft, ArrowRight, Close } from '@/components/icons';
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
    <PageContainer width="normal">
    <div className={styles.page}>
      <header className="pageHeader">
        <p className="italic-quote">─ Where the model honestly hesitates ─</p>
        <h1 className="pageTitle">异 常 池</h1>
        <p className="pageEnglish">ANOMALY</p>
      </header>
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
      <SideSheet isOpen={Boolean(current)} onClose={() => setIndex(null)} width={520} showClose={false}>
        {current ? (
          <div className={styles.sheet}>
            <header className={styles.sideSheetHeader}>
              <div className={styles.sheetMeta}>
                <p className={styles.sheetItalic}>─ Awaiting your judgement</p>
                <p className={styles.sheetId}>样本 № {current.id}</p>
              </div>
              <div className={styles.sheetActions}>
                <button onClick={() => setIndex(Math.max((index ?? 0) - 1, 0))} type="button" aria-label="上一个样本"><ArrowLeft /></button>
                <button onClick={() => setIndex(Math.min((index ?? 0) + 1, items.length - 1))} type="button" aria-label="下一个样本"><ArrowRight /></button>
                <button onClick={() => setIndex(null)} type="button" aria-label="关闭"><Close /></button>
              </div>
            </header>
            <div className={styles.sideSheetBody}>
              <div className={styles.sampleImage}>
                <img src={current.src} alt="" />
              </div>
              <section className={styles.sheetSection}>
                <h3 className={styles.sectionLabel}>系统判断</h3>
                <p className={styles.systemThought}>
                  ⋯ 这张图像让系统犹豫了。<br />
                  专家给出了分歧的意见，<br />
                  系统选择不下结论。
                </p>
              </section>
              <section className={styles.sheetSection}>
                <h3 className={styles.sectionLabel}>您的判断</h3>
                <div className={styles.choices}>
                  <label className={styles.radio}>
                    <input className={styles.radioInput} type="radio" name="judgement" value="fake" />
                    <span className={styles.radioMark} />
                    <span className={styles.radioLabel}>这是 AI 生成</span>
                  </label>
                  <label className={styles.radio}>
                    <input className={styles.radioInput} type="radio" name="judgement" value="real" />
                    <span className={styles.radioMark} />
                    <span className={styles.radioLabel}>这是真实内容</span>
                  </label>
                  <label className={styles.radio}>
                    <input className={styles.radioInput} type="radio" name="judgement" value="unsure" />
                    <span className={styles.radioMark} />
                    <span className={styles.radioLabel}>我也无法判断</span>
                  </label>
                </div>
              </section>
              <section className={styles.sheetSection}>
                <h3 className={styles.sectionLabel}>备注（选填）</h3>
                <textarea className={styles.noteInput} placeholder="可以补充您的判断依据" />
              </section>
            </div>
            <footer className={styles.sideSheetFooter}>
              <button className={styles.submitBtn} onClick={submit} type="button">
                <span>提交并触发同源样本扩充</span>
                <span>→</span>
              </button>
            </footer>
          </div>
        ) : null}
      </SideSheet>
    </div>
    </PageContainer>
  );
}
