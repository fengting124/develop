import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { PageContainer } from '@/components/primitives';
import styles from './ImageShowcase.module.css';

// ─── 五阶段流程数据 ───────────────────────────────────────
type StageKey = 'source' | 'prompt' | 'generate' | 'annotate' | 'archive';

interface Stage {
  key: StageKey;
  index: string;
  label: string;
  en: string;
  desc: string;
  duration: number; // ms，在此阶段停留时长
}

const stages: Stage[] = [
  {
    key: 'source',
    index: '01',
    label: '真实图像入库',
    en: 'SOURCE',
    desc: '采集来自 COCO / OpenImages 的真实照片，建立参照基准',
    duration: 2200,
  },
  {
    key: 'prompt',
    index: '02',
    label: '语义解析 · 提示词生成',
    en: 'PROMPT',
    desc: '大模型读取图像语义，自动改写生成引导提示词',
    duration: 2400,
  },
  {
    key: 'generate',
    index: '03',
    label: '多模型生成候选',
    en: 'GENERATE',
    desc: '向 SD3 / FLUX / DALL·E 3 / MJv6 并发生成候选样本',
    duration: 3000,
  },
  {
    key: 'annotate',
    index: '04',
    label: '区域标注 · 语义标签',
    en: 'ANNOTATE',
    desc: '自动检测可疑区域，附加取证坐标与异常类别标签',
    duration: 2600,
  },
  {
    key: 'archive',
    index: '05',
    label: '样本入库 · 归档',
    en: 'ARCHIVE',
    desc: '写入训练集，绑定案号，等待专家模型下一轮训练',
    duration: 1800,
  },
];

// ─── 示例图片 ─────────────────────────────────────────────
const sourceImage = '/images/图片检测示例图/image.png';

// 生成候选（用 pipeline-products 模拟多模型输出）
const candidateImages = [
  { src: '/images/pipeline-products/product-01.jpg', model: 'SD3',    conf: 0.91 },
  { src: '/images/pipeline-products/product-03.jpg', model: 'FLUX',   conf: 0.88 },
  { src: '/images/pipeline-products/product-05.jpg', model: 'DALL·E', conf: 0.85 },
  { src: '/images/pipeline-products/product-07.jpg', model: 'MJv6',   conf: 0.82 },
];

// 标注区域 mock（百分比坐标）
const annotationMarks = [
  { id: 'A-01', x: 34, y: 44, w: 36, h: 42, label: '物理逻辑矛盾',  type: 'semantic',  color: 'accent' },
  { id: 'A-02', x: 44, y: 44, w: 16, h: 16, label: '局部纹理异常',  type: 'texture',   color: 'low-conf' },
  { id: 'A-03', x: 24, y: 4,  w: 21, h: 26, label: '光影方向偏离',  type: 'style',     color: 'accent' },
];

// 入库后信息
const archiveInfo = {
  id: 'IMG-2026-1121-0047',
  source: 'COCO/val2017',
  generated: 4,
  annotated: 3,
  tags: ['物理矛盾', '纹理伪造', '光影异常', 'SD3指纹'],
  addedTo: '训练集 v3.1',
};

// 提示词示例
const promptLines = [
  { label: '原始描述', text: 'person cooking in kitchen, natural lighting, realistic' },
  { label: '改写方向', text: 'replace plastic basin with fire brazier, keep person' },
  { label: '最终提示词', text: 'A person standing by a fire brazier in a kitchen scene, the basin is made of stone, harsh dramatic lighting from below, photorealistic' },
];

// ─── 流程状态机 ───────────────────────────────────────────
function useStageAuto(stageList: Stage[]) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [progress, setProgress] = useState(0); // 0–1，当前阶段进度
  const [isPlaying, setIsPlaying] = useState(true);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(Date.now());
  const idxRef = useRef(0);

  useEffect(() => {
    idxRef.current = currentIdx;
  }, [currentIdx]);

  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    startRef.current = Date.now();

    const tick = () => {
      const idx = idxRef.current;
      const elapsed = Date.now() - startRef.current;
      const stageDuration = stageList[idx].duration;
      const p = Math.min(elapsed / stageDuration, 1);
      setProgress(p);

      if (p >= 1) {
        const nextIdx = (idx + 1) % stageList.length;
        setCurrentIdx(nextIdx);
        idxRef.current = nextIdx;
        startRef.current = Date.now();
        setProgress(0);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, stageList]);

  const jumpTo = (idx: number) => {
    setCurrentIdx(idx);
    idxRef.current = idx;
    startRef.current = Date.now();
    setProgress(0);
  };

  return { currentIdx, progress, isPlaying, setIsPlaying, jumpTo };
}

// ─── 阶段内容区域 ─────────────────────────────────────────

// 01 真实图像
function StageSource() {
  return (
    <div className={styles.stageContent}>
      <div className={styles.sourceFrame}>
        <img src={sourceImage} alt="源图像" className={styles.sourceImg} />
        <div className={styles.sourceOverlay}>
          <span className={styles.sourceTag}>REAL · 真实样本</span>
          <span className={styles.sourceId}>COCO_val2017_000000287545</span>
        </div>
        {/* 取证标尺 */}
        <div className={styles.rulerTop} />
        <div className={styles.rulerLeft} />
      </div>
      <div className={styles.stageMeta}>
        <div className={styles.metaRow}><span>来源数据集</span><em>COCO / OpenImages</em></div>
        <div className={styles.metaRow}><span>图像尺寸</span><em>1024 × 768 px</em></div>
        <div className={styles.metaRow}><span>EXIF 状态</span><em>完整</em></div>
        <div className={styles.metaRow}><span>语义类别</span><em>厨房 · 人物 · 烹饪</em></div>
      </div>
    </div>
  );
}

// 02 提示词生成
function StagePrompt({ progress }: { progress: number }) {
  const visibleLines = Math.floor(progress * (promptLines.length + 0.99));
  return (
    <div className={styles.stageContent}>
      <div className={styles.promptPanel}>
        <div className={styles.promptHeader}>
          <span className={styles.promptTitle}>语义解析 · Semantic Parse</span>
          <span className={styles.promptStatus}>
            {progress < 0.4 ? '读取图像...' : progress < 0.75 ? '生成提示词...' : '✓ 完成'}
          </span>
        </div>
        <div className={styles.promptLines}>
          {promptLines.map((line, i) => (
            <AnimatePresence key={i}>
              {i < visibleLines && (
                <motion.div
                  className={styles.promptLine}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  <span className={styles.promptLineLabel}>{line.label}</span>
                  <span className={styles.promptLineText}>{line.text}</span>
                </motion.div>
              )}
            </AnimatePresence>
          ))}
        </div>
        {/* 打字光标 */}
        {progress < 0.95 && <span className={styles.typeCursor}>▌</span>}
      </div>
      <div className={styles.sourceMini}>
        <img src={sourceImage} alt="" className={styles.sourceMiniImg} />
        <span className={styles.sourceMiniLabel}>参照图像</span>
      </div>
    </div>
  );
}

// 03 多模型生成候选（卡片堆叠展开）
function StageGenerate({ progress }: { progress: number }) {
  const visibleCount = Math.floor(progress * (candidateImages.length + 0.6));
  return (
    <div className={styles.stageContent}>
      <div className={styles.candidatesGrid}>
        {candidateImages.map((cand, i) => (
          <AnimatePresence key={cand.model}>
            {i < visibleCount && (
              <motion.div
                className={styles.candidateCard}
                initial={{ opacity: 0, y: 18, scale: 0.93 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.45, delay: i * 0.08, ease: 'easeOut' }}
              >
                <img src={cand.src} alt={cand.model} className={styles.candidateImg} />
                <div className={styles.candidateMeta}>
                  <span className={styles.candidateModel}>{cand.model}</span>
                  <span className={styles.candidateConf}>{Math.round(cand.conf * 100)}%</span>
                </div>
                {/* 生成标记 */}
                <span className={styles.candidateBadge}>AI 生成</span>
              </motion.div>
            )}
          </AnimatePresence>
        ))}
        {/* 加载中占位 */}
        {Array.from({ length: Math.max(0, candidateImages.length - visibleCount) }).map((_, i) => (
          <div key={`ph-${i}`} className={styles.candidatePending}>
            <div className={styles.pendingPulse} />
            <span className={styles.pendingLabel}>生成中…</span>
          </div>
        ))}
      </div>
      <div className={styles.generateStatus}>
        <span className={styles.generateCount}>
          {visibleCount} / {candidateImages.length} 模型完成
        </span>
        <div className={styles.generateBar}>
          <motion.div
            className={styles.generateBarFill}
            animate={{ width: `${(visibleCount / candidateImages.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </div>
  );
}

// 04 区域标注
function StageAnnotate({ progress }: { progress: number }) {
  const visibleMarks = annotationMarks.filter((_, i) => i < Math.floor(progress * (annotationMarks.length + 0.8)));
  return (
    <div className={styles.stageContent}>
      <div className={styles.annotateWrap}>
        <div className={styles.annotateImageBox}>
          <img src={sourceImage} alt="" className={styles.annotateImg} />
          {/* 扫描线（标注过程中） */}
          {progress < 0.9 && (
            <div
              className={styles.annotateScanLine}
              style={{ top: `${progress * 100}%` }}
            />
          )}
          {/* 标注框逐步浮现 */}
          <AnimatePresence>
            {visibleMarks.map(mark => (
              <motion.div
                key={mark.id}
                className={`${styles.annotateMark} ${styles[`annotateMark_${mark.color}`]}`}
                style={{ left: `${mark.x}%`, top: `${mark.y}%`, width: `${mark.w}%`, height: `${mark.h}%` }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35 }}
              >
                {/* 四角 */}
                <span className={styles.annotateCornerTL} />
                <span className={styles.annotateCornerTR} />
                <span className={styles.annotateCornerBL} />
                <span className={styles.annotateCornerBR} />
                <span className={styles.annotateLabel}>{mark.id}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* 标注列表 */}
        <div className={styles.annotateList}>
          <div className={styles.annotateListHeader}>标注结果</div>
          {annotationMarks.map((mark, i) => {
            const isVisible = i < visibleMarks.length;
            return (
              <motion.div
                key={mark.id}
                className={`${styles.annotateItem} ${isVisible ? styles.annotateItemVisible : ''}`}
                initial={false}
                animate={{ opacity: isVisible ? 1 : 0.3 }}
                transition={{ duration: 0.3 }}
              >
                <span className={styles.annotateItemId}>{mark.id}</span>
                <span className={styles.annotateItemLabel}>{mark.label}</span>
                <span className={styles.annotateItemType}>{mark.type}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 05 入库归档
function StageArchive({ progress }: { progress: number }) {
  const isComplete = progress > 0.6;
  return (
    <div className={styles.stageContent}>
      <div className={styles.archivePanel}>
        {/* 印章动画 */}
        <motion.div
          className={styles.archiveStampWrap}
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: isComplete ? 1 : 0, rotate: isComplete ? -8 : -15 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          <div className={styles.archiveStamp}>归 档</div>
        </motion.div>

        {/* 档案信息卡 */}
        <div className={styles.archiveCard}>
          <div className={styles.archiveCardHeader}>
            <span className={styles.archiveCardId}>{archiveInfo.id}</span>
            <span className={styles.archiveCardStatus}>{isComplete ? '✓ 已入库' : '⋯ 写入中'}</span>
          </div>
          <div className={styles.archiveFields}>
            <div className={styles.archiveField}><span>来源</span><em>{archiveInfo.source}</em></div>
            <div className={styles.archiveField}><span>生成样本</span><em>{archiveInfo.generated} 张</em></div>
            <div className={styles.archiveField}><span>标注区域</span><em>{archiveInfo.annotated} 处</em></div>
            <div className={styles.archiveField}><span>写入数据集</span><em>{archiveInfo.addedTo}</em></div>
          </div>
          <div className={styles.archiveTags}>
            {archiveInfo.tags.map(tag => (
              <span key={tag} className={styles.archiveTag}>{tag}</span>
            ))}
          </div>
        </div>

        {/* 进度写入动画 */}
        <div className={styles.archiveProgress}>
          <span className={styles.archiveProgressLabel}>写入进度</span>
          <div className={styles.archiveProgressBar}>
            <motion.div
              className={styles.archiveProgressFill}
              animate={{ width: `${Math.min(progress * 160, 100)}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
          <span className={styles.archiveProgressNum}>
            {Math.min(Math.round(progress * 160), 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── 顶部流程连接器（横向节点 + 流向线） ─────────────────
function PipelineHeader({
  currentIdx,
  onJump,
}: {
  currentIdx: number;
  onJump: (i: number) => void;
}) {
  return (
    <div className={styles.pipelineHeader}>
      {stages.map((stage, i) => {
        const isDone = i < currentIdx;
        const isActive = i === currentIdx;
        const isPending = i > currentIdx;

        return (
          <div key={stage.key} className={styles.pipelineStep}>
            {/* 连接线（左侧，首节点无） */}
            {i > 0 && (
              <div className={styles.pipelineConnector}>
                <svg viewBox="0 0 40 2" className={styles.pipelineConnectorSvg}>
                  <line x1="0" y1="1" x2="40" y2="1"
                    className={`${styles.connectorLine} ${isDone || isActive ? styles.connectorLineDone : ''}`}
                    strokeDasharray={isPending ? '4 3' : 'none'}
                  />
                  {(isDone || isActive) && (
                    <polygon points="34,−2 40,1 34,4" className={styles.connectorArrow} />
                  )}
                </svg>
              </div>
            )}

            {/* 节点按钮 */}
            <button
              type="button"
              className={`${styles.pipelineNode} ${isDone ? styles.nodesDone : ''} ${isActive ? styles.nodesActive : ''} ${isPending ? styles.nodesPending : ''}`}
              onClick={() => onJump(i)}
            >
              {/* 圆形状态指示 */}
              <span className={styles.nodeDot}>
                {isDone && (
                  <svg viewBox="0 0 10 10">
                    <polyline points="1.5,5 4,7.5 8.5,2.5" className={styles.nodeDotCheck} />
                  </svg>
                )}
                {isActive && <span className={styles.nodeDotActive} />}
              </span>
              <span className={styles.nodeIndex}>{stage.index}</span>
              <span className={styles.nodeLabel}>{stage.label}</span>
              <span className={styles.nodeEn}>{stage.en}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── 主页面 ──────────────────────────────────────────────
export function ImageShowcase() {
  const { currentIdx, progress, isPlaying, setIsPlaying, jumpTo } = useStageAuto(stages);
  const currentStage = stages[currentIdx];

  return (
    <PageContainer width="wide">
      <div className={styles.page}>
        <Link className={styles.backLink} to="/admin/pipeline">← 返回数据生成</Link>

        <header className={styles.showcaseHeader}>
          <p className={styles.headerQuote}>─ From raw image to annotated training sample ─</p>
          <h1 className={styles.headerTitle}>图片标注 · 完整工作流</h1>
          <p className={styles.headerEn}>IMAGE PIPELINE SHOWCASE</p>
        </header>

        {/* 顶部横向流程图 */}
        <PipelineHeader currentIdx={currentIdx} onJump={jumpTo} />

        {/* 主内容区 */}
        <div className={styles.showcaseBody}>
          {/* 左侧：阶段说明栏 */}
          <aside className={styles.stageInfo}>
            <div className={styles.stageInfoNum}>{currentStage.index}</div>
            <h2 className={styles.stageInfoTitle}>{currentStage.label}</h2>
            <p className={styles.stageInfoEn}>{currentStage.en}</p>
            <p className={styles.stageInfoDesc}>{currentStage.desc}</p>

            {/* 阶段进度条 */}
            <div className={styles.stageDuration}>
              <div className={styles.stageDurationBar}>
                <motion.div
                  className={styles.stageDurationFill}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <span className={styles.stageDurationLabel}>
                {Math.round(progress * 100)}%
              </span>
            </div>

            {/* 播放控制 */}
            <div className={styles.stageControls}>
              <button
                type="button"
                className={styles.controlBtn}
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  // 暂停图标
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <rect x="3" y="2" width="4" height="12" />
                    <rect x="9" y="2" width="4" height="12" />
                  </svg>
                ) : (
                  // 播放图标
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M4 2 L13 8 L4 14 Z" />
                  </svg>
                )}
                <span>{isPlaying ? '暂停' : '播放'}</span>
              </button>

              <div className={styles.stageNav}>
                <button
                  type="button"
                  className={styles.navBtn}
                  onClick={() => jumpTo(Math.max(0, currentIdx - 1))}
                  disabled={currentIdx === 0}
                >
                  ←
                </button>
                <span className={styles.navLabel}>
                  {currentIdx + 1} / {stages.length}
                </span>
                <button
                  type="button"
                  className={styles.navBtn}
                  onClick={() => jumpTo(Math.min(stages.length - 1, currentIdx + 1))}
                  disabled={currentIdx === stages.length - 1}
                >
                  →
                </button>
              </div>
            </div>
          </aside>

          {/* 右侧：动态演示区 */}
          <div className={styles.stageDisplay}>
            <div className={styles.stageDisplayInner}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIdx}
                  className={styles.stagePane}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  {currentIdx === 0 && <StageSource />}
                  {currentIdx === 1 && <StagePrompt progress={progress} />}
                  {currentIdx === 2 && <StageGenerate progress={progress} />}
                  {currentIdx === 3 && <StageAnnotate progress={progress} />}
                  {currentIdx === 4 && <StageArchive progress={progress} />}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* 阶段底部说明条 */}
            <div className={styles.stageFooterBar}>
              <span className={styles.stageFooterTag}>{currentStage.en}</span>
              <span className={styles.stageFooterDash}>─</span>
              <span className={styles.stageFooterDesc}>{currentStage.desc}</span>
            </div>
          </div>
        </div>

        {/* 底部全流程迷你管线（状态概览） */}
        <div className={styles.miniPipelineRow}>
          {stages.map((stage, i) => {
            const isDone = i < currentIdx;
            const isActive = i === currentIdx;
            return (
              <div key={stage.key} className={styles.miniStep}>
                {i > 0 && (
                  <div className={`${styles.miniConnector} ${isDone ? styles.miniConnectorDone : ''}`} />
                )}
                <button
                  type="button"
                  className={`${styles.miniNode} ${isDone ? styles.miniNodeDone : ''} ${isActive ? styles.miniNodeActive : ''}`}
                  onClick={() => jumpTo(i)}
                  title={stage.label}
                >
                  <MiniStageIcon stageKey={stage.key} />
                </button>
                <span className={styles.miniLabel}>{stage.index}</span>
              </div>
            );
          })}
        </div>
      </div>
    </PageContainer>
  );
}

// ─── 底部迷你图标 ─────────────────────────────────────────
function MiniStageIcon({ stageKey }: { stageKey: StageKey }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={styles.miniIcon}>
      {stageKey === 'source' && (
        <>
          <rect x="3" y="3" width="14" height="14" rx="1" />
          <circle cx="7" cy="7" r="1.5" />
          <path d="M3 13 L7 9 L11 12 L14 9 L17 13" />
        </>
      )}
      {stageKey === 'prompt' && (
        <>
          <line x1="4" y1="6" x2="16" y2="6" />
          <line x1="4" y1="10" x2="13" y2="10" />
          <line x1="4" y1="14" x2="10" y2="14" />
          <path d="M15 12 L18 10 L15 8" />
        </>
      )}
      {stageKey === 'generate' && (
        <>
          <rect x="2" y="2" width="7" height="7" rx="0.5" />
          <rect x="11" y="2" width="7" height="7" rx="0.5" />
          <rect x="2" y="11" width="7" height="7" rx="0.5" />
          <rect x="11" y="11" width="7" height="7" rx="0.5" />
        </>
      )}
      {stageKey === 'annotate' && (
        <>
          <rect x="3" y="3" width="14" height="14" />
          <rect x="5" y="5" width="6" height="6" />
          <line x1="5" y1="3" x2="5" y2="0" />
          <line x1="17" y1="3" x2="17" y2="0" />
          <line x1="3" y1="5" x2="0" y2="5" />
        </>
      )}
      {stageKey === 'archive' && (
        <>
          <rect x="3" y="6" width="14" height="11" rx="1" />
          <path d="M7 6 L7 3 L13 3 L13 6" />
          <line x1="7" y1="11" x2="13" y2="11" />
        </>
      )}
    </svg>
  );
}
