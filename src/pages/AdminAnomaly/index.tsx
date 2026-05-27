import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PageContainer, SideSheet, useToast } from '@/components/primitives';
import { ArrowLeft, ArrowRight, Close } from '@/components/icons';
import { anomalyPool } from '@/data/mocks';
import styles from './AdminAnomaly.module.css';

// ─── 提交后联动数据（Mock） ───────────────────────────────
const linkedActions = {
  sampleExpand: {
    count: 3,
    label: '同源样本扩充',
    en: 'Source Expansion',
    desc: '系统将以该样本为锚点，自动生成相似风格的扩充样本',
  },
  expertQueue: {
    targetExpert: 'SD3 靶向专家',
    label: '靶向专家训练队列',
    en: 'Expert Training',
    initialProgress: 0.28,
    addedProgress: 0.05,
    desc: '该样本将被加入 SD3 靶向专家的下一轮训练批次',
  },
};

// ─── 提交后联动面板 ───────────────────────────────────────
function PostSubmitFeedback({ sampleId, judgement }: { sampleId: string; judgement: string }) {
  const [expandCount, setExpandCount] = useState(0);
  const [expertProg, setExpertProg] = useState(linkedActions.expertQueue.initialProgress);
  const countRef = useRef(0);

  // 数字从 0 动画到目标值
  useEffect(() => {
    let frame: number;
    const target = linkedActions.sampleExpand.count;
    const tick = () => {
      countRef.current += 0.08;
      const v = Math.min(Math.ceil(countRef.current), target);
      setExpandCount(v);
      if (v < target) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  // 专家进度从初始值动画到 +addedProgress
  useEffect(() => {
    const target = linkedActions.expertQueue.initialProgress + linkedActions.expertQueue.addedProgress;
    let start: number | null = null;
    const duration = 1200;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const t = Math.min((ts - start) / duration, 1);
      setExpertProg(linkedActions.expertQueue.initialProgress + t * linkedActions.expertQueue.addedProgress);
      if (t < 1) requestAnimationFrame(tick);
    };
    const delay = setTimeout(() => requestAnimationFrame(tick), 400);
    return () => clearTimeout(delay);
  }, []);

  const isFake = judgement === 'fake';

  return (
    <motion.div
      className={styles.postFeedback}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      {/* 确认结论徽章 */}
      <div className={styles.feedbackBadge}>
        <span className={`${styles.feedbackVerdict} ${isFake ? styles.feedbackVerdictFake : styles.feedbackVerdictReal}`}>
          {isFake ? 'AI 生成' : '真实内容'}
        </span>
        <span className={styles.feedbackId}>样本 {sampleId} · 已确认</span>
      </div>

      <div className={styles.feedbackDivider}>后续自动触发</div>

      {/* 同源样本扩充 */}
      <div className={styles.feedbackAction}>
        <div className={styles.feedbackActionHead}>
          <svg viewBox="0 0 16 16" className={styles.feedbackIcon} aria-hidden="true">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 5 L8 11 M5 8 L11 8" />
          </svg>
          <span className={styles.feedbackActionLabel}>{linkedActions.sampleExpand.label}</span>
          <span className={styles.feedbackActionEn}>{linkedActions.sampleExpand.en}</span>
        </div>
        <div className={styles.feedbackExpandRow}>
          <span className={styles.feedbackExpandNum}>+{expandCount}</span>
          <span className={styles.feedbackExpandUnit}>个同源样本</span>
          <div className={styles.feedbackExpandDots}>
            {Array.from({ length: linkedActions.sampleExpand.count }).map((_, i) => (
              <motion.span
                key={i}
                className={styles.feedbackExpandDot}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.18 + 0.2, type: 'spring', stiffness: 300 }}
              />
            ))}
          </div>
        </div>
        <p className={styles.feedbackActionDesc}>{linkedActions.sampleExpand.desc}</p>
      </div>

      {/* 专家训练队列 */}
      <div className={styles.feedbackAction}>
        <div className={styles.feedbackActionHead}>
          <svg viewBox="0 0 16 16" className={styles.feedbackIcon} aria-hidden="true">
            <path d="M8 2 L14 12 L2 12 Z" />
          </svg>
          <span className={styles.feedbackActionLabel}>{linkedActions.expertQueue.label}</span>
          <span className={styles.feedbackActionEn}>{linkedActions.expertQueue.en}</span>
        </div>
        <div className={styles.feedbackExpertRow}>
          <span className={styles.feedbackExpertName}>{linkedActions.expertQueue.targetExpert}</span>
          <span className={styles.feedbackExpertDelta}>+{Math.round(linkedActions.expertQueue.addedProgress * 100)}%</span>
        </div>
        <div className={styles.feedbackExpertBarWrap}>
          <div
            className={styles.feedbackExpertBarBase}
            style={{ width: `${linkedActions.expertQueue.initialProgress * 100}%` }}
          />
          <motion.div
            className={styles.feedbackExpertBarAdd}
            initial={{ width: 0 }}
            animate={{ width: `${linkedActions.expertQueue.addedProgress * 100}%` }}
            transition={{ duration: 1.2, delay: 0.4, ease: 'easeOut' }}
            style={{ left: `${linkedActions.expertQueue.initialProgress * 100}%` }}
          />
          <span
            className={styles.feedbackExpertBarLabel}
            style={{ left: `${expertProg * 100}%` }}
          >
            {Math.round(expertProg * 100)}%
          </span>
        </div>
        <p className={styles.feedbackActionDesc}>{linkedActions.expertQueue.desc}</p>
      </div>

      {/* 操作链路提示 */}
      <div className={styles.feedbackChain}>
        <span className={styles.feedbackChainItem}>异常确认</span>
        <span className={styles.feedbackChainArrow}>→</span>
        <span className={styles.feedbackChainItem}>样本扩充</span>
        <span className={styles.feedbackChainArrow}>→</span>
        <span className={styles.feedbackChainItem}>专家训练</span>
        <span className={styles.feedbackChainArrow}>→</span>
        <span className={`${styles.feedbackChainItem} ${styles.feedbackChainItemTarget}`}>能力更新</span>
      </div>
    </motion.div>
  );
}

// ─── 主页面 ──────────────────────────────────────────────
export function AdminAnomaly() {
  const [items, setItems] = useState(anomalyPool);
  const [index, setIndex] = useState<number | null>(null);
  const [judgement, setJudgement] = useState<string>('');
  const [submitted, setSubmitted] = useState<{ id: string; judgement: string } | null>(null);
  const { showToast } = useToast();
  const current = index === null ? null : items[index];

  // 切换样本时重置提交状态
  useEffect(() => {
    setSubmitted(null);
    setJudgement('');
  }, [index]);

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
    if (index === null || !current) return;
    const id = current.id;
    const j = judgement || 'unsure';

    // 先展示联动面板，再延迟移除
    setSubmitted({ id, judgement: j });

    setTimeout(() => {
      setIndex(null);
      setItems(prev => prev.filter(item => item.id !== id));
      showToast('已确认，样本扩充与专家训练已触发', 'success');
    }, 2800);
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
              <motion.button
                layout
                exit={{ opacity: 0, scale: 0.86 }}
                transition={{ duration: 0.3 }}
                className={styles.card}
                key={item.id}
                onClick={() => setIndex(i)}
                type="button"
              >
                <span>◐ 待您确认</span>
                <img src={item.src} alt="" />
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>

        <SideSheet isOpen={Boolean(current)} onClose={() => setIndex(null)} width={520} showClose={false}>
          {current ? (
            <div className={styles.sheet}>
              {/* 侧栏头部 */}
              <header className={styles.sideSheetHeader}>
                <div className={styles.sheetMeta}>
                  <p className={styles.sheetItalic}>─ Awaiting your judgement</p>
                  <p className={styles.sheetId}>样本 № {current.id}</p>
                </div>
                <div className={styles.sheetActions}>
                  <button
                    onClick={() => setIndex(Math.max((index ?? 0) - 1, 0))}
                    type="button"
                    aria-label="上一个样本"
                  >
                    <ArrowLeft />
                  </button>
                  <button
                    onClick={() => setIndex(Math.min((index ?? 0) + 1, items.length - 1))}
                    type="button"
                    aria-label="下一个样本"
                  >
                    <ArrowRight />
                  </button>
                  <button onClick={() => setIndex(null)} type="button" aria-label="关闭">
                    <Close />
                  </button>
                </div>
              </header>

              {/* 侧栏主体 */}
              <div className={styles.sideSheetBody}>
                <AnimatePresence mode="wait">
                  {!submitted ? (
                    /* ── 判断表单 ── */
                    <motion.div
                      key="form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                    >
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
                          {[
                            { value: 'fake',   label: '这是 AI 生成' },
                            { value: 'real',   label: '这是真实内容' },
                            { value: 'unsure', label: '我也无法判断' },
                          ].map(opt => (
                            <label key={opt.value} className={`${styles.radio} ${judgement === opt.value ? styles.radioSelected : ''}`}>
                              <input
                                className={styles.radioInput}
                                type="radio"
                                name="judgement"
                                value={opt.value}
                                checked={judgement === opt.value}
                                onChange={e => setJudgement(e.target.value)}
                              />
                              <span className={styles.radioMark} />
                              <span className={styles.radioLabel}>{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </section>

                      <section className={styles.sheetSection}>
                        <h3 className={styles.sectionLabel}>备注（选填）</h3>
                        <textarea className={styles.noteInput} placeholder="可以补充您的判断依据" />
                      </section>
                    </motion.div>
                  ) : (
                    /* ── 提交后联动 ── */
                    <motion.div
                      key="feedback"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <PostSubmitFeedback
                        sampleId={submitted.id}
                        judgement={submitted.judgement}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 侧栏底部 */}
              <footer className={styles.sideSheetFooter}>
                {!submitted ? (
                  <button
                    className={styles.submitBtn}
                    onClick={submit}
                    type="button"
                    disabled={!judgement}
                  >
                    <span>提交并触发同源样本扩充</span>
                    <span>→</span>
                  </button>
                ) : (
                  <div className={styles.submittedFooter}>
                    <span className={styles.submittedHint}>后续动作已触发，侧栏即将关闭…</span>
                    <div className={styles.submittedProgress} />
                  </div>
                )}
              </footer>
            </div>
          ) : null}
        </SideSheet>
      </div>
    </PageContainer>
  );
}
