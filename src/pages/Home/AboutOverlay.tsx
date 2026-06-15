import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './AboutOverlay.module.css';

// ── 接触印相纸纹理 ──
function ContactSheetTexture() {
  const frames = Array.from({ length: 12 }, (_, i) =>
    `/samples/frames/frame-${String(i + 1).padStart(2, '0')}.jpg`
  );
  return (
    <div className={styles.texture} aria-hidden="true">
      {frames.map((src) => (
        <img key={src} src={src} alt="" loading="lazy" draggable="false" />
      ))}
    </div>
  );
}

// ── SVG 图标（与项目既有 icons 同风格）──
function IconPipeline() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 6h16M4 11h16M4 16h10" />
      <polyline points="16,13 20,16 16,19" />
    </svg>
  );
}
function IconTrain() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="5" cy="14" r="2" />
      <circle cx="19" cy="14" r="2" />
      <circle cx="12" cy="6" r="2" />
      <line x1="6.7" y1="12.3" x2="10.4" y2="7.7" />
      <line x1="13.6" y1="7.7" x2="17.3" y2="12.3" />
      <line x1="7" y1="14" x2="17" y2="14" />
    </svg>
  );
}
function IconScan() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" />
      <circle cx="12" cy="12" r="3.5" />
      <line x1="12" y1="3" x2="12" y2="8.5" />
      <line x1="12" y1="15.5" x2="12" y2="21" />
      <line x1="3" y1="12" x2="8.5" y2="12" />
      <line x1="15.5" y1="12" x2="21" y2="12" />
    </svg>
  );
}
function IconFilm() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="6" width="20" height="12" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <line x1="2" y1="14" x2="22" y2="14" />
      <line x1="7" y1="6" x2="7" y2="18" />
      <line x1="17" y1="6" x2="17" y2="18" />
    </svg>
  );
}
function IconDoc() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="12" y2="17" />
      <polyline points="13,11 15.5,13.5 19.5,9" />
    </svg>
  );
}
function IconFunnel() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" />
    </svg>
  );
}
function IconLoop() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 2v6h-6" />
      <path d="M21 13a9 9 0 1 1-3-7.7L21 8" />
    </svg>
  );
}

// ── 路径分区标题 ──
function SectionBanner({
  side, cn, sub, isDetect = false,
}: {
  side: string; cn: string; sub: string; isDetect?: boolean;
}) {
  return (
    <motion.div
      className={`${styles.sectionBanner} ${isDetect ? styles.sectionBannerDetect : ''}`}
      initial={{ opacity: 0, x: -8 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
    >
      <span className={styles.sectionBannerBar} aria-hidden="true" />
      <div className={styles.sectionBannerBody}>
        <div className={styles.sectionBannerRow}>
          <span className={styles.sectionBannerSide}>{side}</span>
          <span className={styles.sectionBannerCn}>{cn}</span>
        </div>
        <p className={styles.sectionBannerSub}>{sub}</p>
      </div>
    </motion.div>
  );
}

// ── 节点间连接线 ──
function Connector({ label, loopBack = false }: { label: string; loopBack?: boolean }) {
  return (
    <div className={`${styles.connector} ${loopBack ? styles.connectorLoop : ''}`}>
      <span className={styles.connectorLine} />
      {label ? <span className={styles.connectorLabel}>{label}</span> : null}
      {loopBack
        ? <span className={styles.connectorLoopArrow}>↑ 回到步骤 01，开始新一轮取证校准</span>
        : <span className={styles.connectorArrow}>↓</span>
      }
    </div>
  );
}

// ── 单个流程卡片 ──
function FlowCard({
  step, badge, icon, cn, en, desc, bullets, route, onClose,
}: {
  step: string;
  badge: 'GOVERN' | 'DETECT';
  icon: JSX.Element;
  cn: string;
  en: string;
  desc: string;
  bullets: string[];
  route: string;
  onClose: () => void;
}) {
  const isDetect = badge === 'DETECT';
  return (
    <motion.div
      className={`${styles.flowCard} ${isDetect ? styles.flowCardDetect : ''}`}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <Link to={route} className={styles.cardLink} onClick={onClose}>
        <div className={styles.cardTop}>
          <div className={styles.cardIconBox}>{icon}</div>
          <div className={styles.cardTitleGroup}>
            <div className={styles.cardMeta}>
              <span className={styles.cardStep}>{step}</span>
              <span className={`${styles.cardBadge} ${isDetect ? styles.cardBadgeDetect : ''}`}>
                {badge}
              </span>
            </div>
            <h3 className={styles.cardCn}>{cn}</h3>
            <span className={styles.cardEn}>{en}</span>
          </div>
          <span className={styles.cardEnter}>→</span>
        </div>
        <p className={styles.cardDesc}>{desc}</p>
        <ul className={styles.cardBullets}>
          {bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      </Link>
    </motion.div>
  );
}

// ── 主组件 ──
interface AboutOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutOverlay({ isOpen, onClose }: AboutOverlayProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label="功能导览"
          initial={{ clipPath: 'inset(100% 0% 0% 0%)' }}
          animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
          exit={{ clipPath: 'inset(100% 0% 0% 0%)' }}
          transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
        >
          <ContactSheetTexture />

          <div className={styles.scrollBody}>

            {/* Header */}
            <motion.header
              className={styles.header}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3, ease: 'easeOut' }}
            >
              <span className={styles.headerBrand}>显影 · DEVELOP</span>
              <span className={styles.headerVersion}>v1.0 / 2026</span>
              <button className={styles.closeBtn} onClick={onClose} type="button" aria-label="关闭导览">
                <span className={styles.escHint}>ESC</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </motion.header>

            {/* Hero */}
            <motion.section
              className={styles.heroSection}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.4, ease: 'easeOut' }}
            >
              <h2 className={styles.heroHeadline}>一套面向视觉生成内容的可解释取证系统</h2>
              <p className={styles.heroSub}>─ Every pixel tells. We just listen. ─</p>
            </motion.section>

            {/* ════ 系统闭环流程 ════ */}
            <div className={styles.systemFlow}>

              {/* ─── GOVERN 治理侧 ─── */}
              <SectionBanner
                side="GOVERN"
                cn="治理侧"
                sub="为系统建设者 · 构建检测基础设施、管理专家模型"
              />

              <FlowCard
                step="01" badge="GOVERN" icon={<IconPipeline />}
                cn="数据流水线" en="DATA PIPELINE"
                desc="从真实图片/视频出发，通过局部区域篡改或全图生成，自动产生包含伪造区域/片段的标注样本，构建结构化训练数据集。"
                bullets={[
                  '四层结构化标注：图像级 · 区域级 · 内容级 · 过程级',
                  '覆盖 13 种主流生成模型，视频数据集 12,000 条',
                ]}
                route="/admin/pipeline"
                onClose={onClose}
              />

              <Connector label="结构化标注训练集" />

              <FlowCard
                step="02" badge="GOVERN" icon={<IconTrain />}
                cn="专家训练" en="EXPERT TRAINING"
                desc="构建异构混合专家架构：通用专家覆盖共性生成痕迹，靶向 LoRA 专家针对特定生成模型的检测盲区进行增量适配。"
                bullets={[
                  '通用专家：空域 / 频域 / 风格 / 语义  ·  靶向专家：LoRA 低秩适配',
                  '门控路由动态分配权重  ·  夏普利值专家贡献归因',
                ]}
                route="/admin/experts"
                onClose={onClose}
              />

              <Connector label="专家推理服务下发" />

              {/* ─── DETECT 鉴别侧 ─── */}
              <SectionBanner
                side="DETECT"
                cn="鉴别侧"
                sub="为创作者与审核者 · 上传内容，获取可解释取证报告"
                isDetect
              />

              {/* 03 + 04 双列检测节点 */}
              <motion.div
                className={styles.flowDual}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <Link to="/detect/image" className={styles.flowDualCard} onClick={onClose}>
                  <div className={styles.cardTop}>
                    <div className={styles.cardIconBox}><IconScan /></div>
                    <div className={styles.cardTitleGroup}>
                      <div className={styles.cardMeta}>
                        <span className={styles.cardStep}>03</span>
                        <span className={`${styles.cardBadge} ${styles.cardBadgeDetect}`}>DETECT</span>
                      </div>
                      <h3 className={styles.cardCn}>图像取证</h3>
                      <span className={styles.cardEn}>IMAGE FORENSICS</span>
                    </div>
                    <span className={styles.cardEnter}>→</span>
                  </div>
                  <p className={styles.cardDesc}>
                    多专家联合推理，语义思维链三阶段分析（全局场景→实体解析→逻辑一致性），精确定位图像篡改区域。
                  </p>
                  <ul className={styles.cardBullets}>
                    <li>Grounding DINO 区域定位 · 知识图谱冲突推理</li>
                    <li>输出：可疑区域掩码 · 伪影线索 · 语义解释</li>
                  </ul>
                </Link>

                <div className={styles.flowDualDivider} aria-hidden="true" />

                <Link to="/detect/video" className={styles.flowDualCard} onClick={onClose}>
                  <div className={styles.cardTop}>
                    <div className={styles.cardIconBox}><IconFilm /></div>
                    <div className={styles.cardTitleGroup}>
                      <div className={styles.cardMeta}>
                        <span className={styles.cardStep}>04</span>
                        <span className={`${styles.cardBadge} ${styles.cardBadgeDetect}`}>DETECT</span>
                      </div>
                      <h3 className={styles.cardCn}>视频检测台</h3>
                      <span className={styles.cardEn}>VIDEO FORENSICS</span>
                    </div>
                    <span className={styles.cardEnter}>→</span>
                  </div>
                  <p className={styles.cardDesc}>
                    时序建模精确定位视频中的伪造片段，逐帧输出异常时间段，支持音视频联合检测。
                  </p>
                  <ul className={styles.cardBullets}>
                    <li>Transformer + GCN + BMN 时序定位，精确到帧级</li>
                    <li>输出：异常时段 · 关键帧 · 谱纹可视化</li>
                  </ul>
                </Link>
              </motion.div>

              <Connector label="空间证据 / 时序证据融合" />

              <FlowCard
                step="05" badge="DETECT" icon={<IconDoc />}
                cn="鉴别报告" en="FORENSIC REPORT"
                desc="将图像区域证据、视频时序证据、语义推理链与专家贡献归因整合为结构化取证报告，支持导出存档与后续复核。"
                bullets={[
                  '区域证据 · 片段边界 · 语义推理链 · 专家贡献归因',
                  '案例编号 · 检测时间线 · 可复核取证包',
                ]}
                route="/detect/report/demo"
                onClose={onClose}
              />

              <Connector label="低置信样本自动沉淀" />

              {/* ─── GOVERN 闭环反馈 ─── */}
              <SectionBanner
                side="GOVERN"
                cn="闭环反馈"
                sub="检测结果驱动系统持续自我校准 · 对新型生成模型形成靶向适配"
              />

              <FlowCard
                step="06" badge="GOVERN" icon={<IconFunnel />}
                cn="异常池" en="ANOMALY POOL"
                desc="系统自动汇聚置信度低于阈值的检测结果，按生成源归类，管理员人工确认后自动触发下游专家更新流程。"
                bullets={[
                  '低置信样本按生成模型来源自动归类汇聚',
                  '确权后自动触发数据扩充与 LoRA 增量微调',
                ]}
                route="/admin/anomaly"
                onClose={onClose}
              />

              <Connector label="管理员确权 · 同源样本扩充" />

              <FlowCard
                step="07" badge="GOVERN" icon={<IconLoop />}
                cn="数据扩充 · 专家更新" en="ITERATE"
                desc="利用确权样本扩充同源训练集，对对应 LoRA 专家进行增量微调。新专家上线后，系统对新型生成模型的识别能力持续扩展。"
                bullets={[
                  '同源样本扩充 → LoRA 专家增量微调 → 新模型上线',
                  '每轮迭代后检测精度持续提升，形成自我校准闭环',
                ]}
                route="/admin"
                onClose={onClose}
              />

              <Connector label="" loopBack />

            </div>

            {/* Footer CTA */}
            <motion.footer
              className={styles.overlayFooter}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.3, ease: 'easeOut' }}
            >
              <Link to="/detect" className={styles.ctaLink} onClick={onClose}>
                ──{'  '}开始使用{'  '}──
                <span className={styles.ctaArrow}>→</span>
              </Link>
            </motion.footer>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
