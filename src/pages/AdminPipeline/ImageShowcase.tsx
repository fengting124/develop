import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { PageContainer } from '@/components/primitives';
import { ForensicMark } from '@/components/ForensicMark/ForensicMark';
import styles from './ImageShowcase.module.css';

// ─── 七阶段流程数据 ───────────────────────────────────────
type StageKey = 'realIngest' | 'regionSelect' | 'localEdit' | 'maskVerify' | 'fullGen' | 'annotation' | 'archive';

// 每个阶段对应的样本路径类型
type PathType = 'real' | 'local' | 'full' | 'all';

interface Stage {
  key: StageKey;
  index: string;
  label: string;
  en: string;
  desc: string;
  duration: number;
  pathType: PathType;
}

const stages: Stage[] = [
  { key: 'realIngest',   index: '01', label: '真实图片入库',      en: 'REAL INGEST',     desc: '采集真实图片，建立负样本标签与可编辑基础图记录', duration: 4500, pathType: 'real' },
  { key: 'regionSelect', index: '02', label: '区域候选生成',      en: 'REGION SELECT',   desc: '通过语义分割、目标检测或随机掩码生成局部编辑候选区域', duration: 5000, pathType: 'local' },
  { key: 'localEdit',    index: '03', label: '局部编辑生成',      en: 'LOCAL EDIT',      desc: '基于掩码条件修复或语义编辑，重绘目标区域并保持外部不变', duration: 6000, pathType: 'local' },
  { key: 'maskVerify',   index: '04', label: '掩码校验与质量审核', en: 'MASK VERIFY',    desc: '计算面积比例、掩码内外变化强度，判定样本是否入库', duration: 5000, pathType: 'local' },
  { key: 'fullGen',      index: '05', label: '全图生成',          en: 'FULL GENERATION', desc: '多模型并发生成完整图片，绑定模型、提示词与采样参数', duration: 6000, pathType: 'full' },
  { key: 'annotation',   index: '06', label: '标注文件生成',      en: 'ANNOTATION',      desc: '自动生成四层 JSON 标注：图像级 · 区域级 · 内容级 · 过程级', duration: 5500, pathType: 'all' },
  { key: 'archive',      index: '07', label: '样本归档与导出',    en: 'ARCHIVE',         desc: '按任务类型导出分类清单、定位清单、生成源识别清单和复核清单', duration: 4000, pathType: 'all' },
];

// 三路路径信息
const pathInfo = {
  real:  { label: '负样本路径', color: 'var(--real)',     bgColor: 'var(--real-soft)',     badge: '真实图片',  en: 'NEGATIVE SAMPLE' },
  local: { label: '局部编辑路径', color: 'var(--accent)', bgColor: 'var(--accent-soft)',   badge: '局部编辑',  en: 'LOCAL EDIT' },
  full:  { label: '全图生成路径', color: 'var(--low-conf)', bgColor: 'var(--low-conf-soft)', badge: '全图生成', en: 'FULL GENERATION' },
  all:   { label: '三路汇合',   color: 'var(--ink-2)',   bgColor: 'var(--surface-2)',     badge: '全部类型',  en: 'ALL PATHS' },
};

// ─── 示例图片 ─────────────────────────────────────────────
const sourceImage = '/images/图片检测示例图/image.png';
const editedImage = '/images/pipeline-products/local_edited.png';
const candidateImages = [
  { src: '/images/pipeline-products/product-01.png', model: 'SD3',    conf: 0.91 },
  { src: '/images/pipeline-products/product-03.png', model: 'FLUX',   conf: 0.88 },
  { src: '/images/pipeline-products/product-05.png', model: 'DALL·E', conf: 0.85 },
  { src: '/images/pipeline-products/product-07.png', model: 'MJv6',   conf: 0.82 },
];

const regionCandidates = [
  { id: 'R-01', x: 56, y: 52, w: 38, h: 40, label: '车辆',  method: '目标检测', category: 'vehicle', color: 'accent' },
  { id: 'R-02', x: 40, y: 0,  w: 40, h: 20, label: '天空',  method: '语义分割', category: 'sky',     color: 'real' },
  { id: 'R-03', x: 32, y: 49, w: 15, h: 7,  label: '远景车', method: '目标检测', category: 'vehicle', color: 'low-conf' },
];

// ─── 方向一：阶段06的取证框数据 ─────────────────────────────
// 标注区域 → 映射为检测台 ForensicMark 的参数
const annotationMarksAsForensic = [
  {
    id: 'A-01',
    x: 34, y: 44, w: 36, h: 42,
    label: 'A-01 · 物理逻辑矛盾',
    confidence: 0.90,
    annotationType: 'semantic',
    annotationLabel: '语义级标注',
    color: 'accent',
    trainingNote: '训练依据：semantic 类样本 × 342',
    sourceDataset: 'COCO/val2017',
  },
  {
    id: 'A-02',
    x: 44, y: 44, w: 16, h: 16,
    label: 'A-02 · 局部纹理异常',
    confidence: 0.76,
    annotationType: 'texture',
    annotationLabel: '区域级标注',
    color: 'low-conf',
    trainingNote: '训练依据：texture inpaint 样本 × 218',
    sourceDataset: 'RAISE / OpenImages',
  },
  {
    id: 'A-03',
    x: 24, y: 4,  w: 21, h: 26,
    label: 'A-03 · 光影方向偏离',
    confidence: 0.83,
    annotationType: 'style',
    annotationLabel: '区域级标注',
    color: 'accent',
    trainingNote: '训练依据：style 类样本 × 156',
    sourceDataset: 'FODB / ImageNet',
  },
];

const verifyMetrics = {
  maskAreaRatio: 0.245, rMin: 0.05, rMax: 0.60,
  dIn: 58.2, tauIn: 15.0, dOut: 2.1, tauOut: 8.0,
  semanticLevel: 'high', passStatus: 'approved' as const,
};

const jsonAnnotation = `{
  "sample_id": "local_coco_street_000128",
  "is_fake": 1,
  "fake_type": "local_edit",
  "source_image": "images/original/local_coco_street_000128.png",
  "generated_image": "images/generated/local_coco_street_000128.png",
  "mask_path": "masks/local_coco_street_000128.png",
  "bbox": [573, 532, 962, 942],
  "mask_area_ratio": 0.245,
  "edit_instruction": "将路边车辆替换为消防车",
  "edit_model": "inpainting_model",
  "change_level": "high",
  "quality_status": "approved"
}`;

const exportLists = [
  { key: 'classify', label: '分类清单',   en: 'Classification', count: 12480, desc: '图片路径 + 真假标签' },
  { key: 'locate',   label: '定位清单',   en: 'Localization',   count: 5760,  desc: '图片 + 掩码 + 边界框' },
  { key: 'source',   label: '生成源清单', en: 'Source ID',      count: 8320,  desc: '额外导出模型类别' },
  { key: 'review',   label: '复核清单',   en: 'Review Queue',   count: 342,   desc: '异常样本 + 人工核验' },
];

const archiveInfo = {
  id: 'IMG-2026-0527-0047', source: 'COCO/val2017',
  real: 4160, fullGen: 8320, localEdit: 5760, review: 342,
  tags: ['物理矛盾', '纹理伪造', '光影异常', 'SD3指纹', '局部Inpaint'],
  addedTo: '训练集 v3.1',
};

// ─── 流程状态机 ───────────────────────────────────────────
function useStageAuto(stageList: Stage[]) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(Date.now());
  const idxRef = useRef(0);

  useEffect(() => { idxRef.current = currentIdx; }, [currentIdx]);

  useEffect(() => {
    if (!isPlaying) { cancelAnimationFrame(rafRef.current); return; }
    startRef.current = Date.now();
    const tick = () => {
      const idx = idxRef.current;
      const elapsed = Date.now() - startRef.current;
      const p = Math.min(elapsed / stageList[idx].duration, 1);
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
    setCurrentIdx(idx); idxRef.current = idx;
    startRef.current = Date.now(); setProgress(0);
  };

  return { currentIdx, progress, isPlaying, setIsPlaying, jumpTo };
}

// ─── 阶段 01：真实图片入库 ────────────────────────────────
function StageRealIngest({ progress }: { progress: number }) {
  const fields = [
    { label: 'sample_id',    value: 'real_coco_kitchen_000042' },
    { label: '来源数据集',   value: 'COCO / val2017' },
    { label: '图像尺寸',     value: '1024 × 768 px' },
    { label: '文件哈希',     value: 'a7f3c1…e82b' },
    { label: '语义类别',     value: '厨房 · 人物 · 烹饪' },
    { label: 'is_fake',      value: '0' },
    { label: '清洗状态',     value: '✓ 通过' },
    { label: '可编辑基础图', value: '是' },
  ];
  const visibleFields = Math.floor(progress * (fields.length + 0.5));
  return (
    <div className={styles.stageContent}>
      <div className={styles.sourceFrame}>
        <img src={sourceImage} alt="源图像" className={styles.sourceImg} />
        <div className={styles.sourceOverlay}>
          <span className={styles.sourceTag}>REAL · 负样本</span>
          <span className={styles.sourceId}>real_coco_kitchen_000042</span>
        </div>
        <div className={styles.rulerTop} /><div className={styles.rulerLeft} />
        {progress < 0.85 && <div className={styles.hashScanLine} style={{ top: `${progress * 100}%` }} />}
      </div>
      <div className={styles.stageMeta}>
        <div className={styles.metaHeader}>
          <span className={styles.metaHeaderTag}>入库记录</span>
          <span className={styles.metaHeaderStatus}>{progress < 0.4 ? '扫描中…' : progress < 0.8 ? '写入标签…' : '✓ 入库完成'}</span>
        </div>
        {fields.map((field, i) => (
          <motion.div key={field.label} className={styles.metaRow} initial={false}
            animate={{ opacity: i < visibleFields ? 1 : 0.2, y: i < visibleFields ? 0 : 4 }}
            transition={{ duration: 0.25 }}>
            <span>{field.label}</span>
            <em className={field.label === 'is_fake' ? styles.metaHighlight : ''}>{field.value}</em>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── 阶段 02：区域候选生成 ────────────────────────────────
function StageRegionSelect({ progress }: { progress: number }) {
  const visibleRegions = regionCandidates.filter((_, i) => i < Math.floor(progress * (regionCandidates.length + 0.6)));
  return (
    <div className={styles.stageContent}>
      <div className={styles.annotateImageBox}>
        <img src={sourceImage} alt="" className={styles.annotateImg} />
        {progress < 0.85 && <div className={styles.annotateScanLine} style={{ top: `${progress * 100}%` }} />}
        <AnimatePresence>
          {visibleRegions.map(region => (
            <motion.div key={region.id}
              className={`${styles.regionMark} ${styles[`regionMark_${region.color}`]}`}
              style={{ left: `${region.x}%`, top: `${region.y}%`, width: `${region.w}%`, height: `${region.h}%` }}
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
              <span className={styles.regionCornerTL} /><span className={styles.regionCornerTR} />
              <span className={styles.regionCornerBL} /><span className={styles.regionCornerBR} />
              <span className={styles.regionLabel}>{region.id} {region.label}</span>
              <span className={styles.regionMethod}>{region.method}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className={styles.regionList}>
        <div className={styles.regionListHeader}>候选区域</div>
        {regionCandidates.map((region, i) => {
          const isVisible = i < visibleRegions.length;
          return (
            <motion.div key={region.id}
              className={`${styles.regionItem} ${isVisible ? styles.regionItemVisible : ''}`}
              initial={false} animate={{ opacity: isVisible ? 1 : 0.25 }} transition={{ duration: 0.3 }}>
              <span className={styles.regionItemId}>{region.id}</span>
              <span className={styles.regionItemLabel}>{region.label}</span>
              <span className={styles.regionItemMeta}>{region.method} · {region.category}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 阶段 03：局部编辑生成 ────────────────────────────────
function StageLocalEdit({ progress }: { progress: number }) {
  const showEdited = progress > 0.35;
  const showDiff = progress > 0.65;
  return (
    <div className={`${styles.stageContent} ${styles.stageContentCol}`}>
      <div className={styles.editCompare}>
        <div className={styles.editPane}>
          <div className={styles.editPaneLabel}>
            <span className={styles.editPaneDot} style={{ background: 'var(--real)' }} />
            <span>原图 · Original</span>
          </div>
          <div className={styles.editImageWrap}>
            <img src={sourceImage} alt="原图" className={styles.editImage} />
            <div className={styles.maskOverlay} style={{ left: '56%', top: '52%', width: '38%', height: '40%' }}>
              <span className={styles.maskLabel}>编辑区域 M</span>
            </div>
          </div>
        </div>
        <div className={styles.editArrow}>
          <motion.div animate={{ opacity: showEdited ? 1 : 0.3 }} transition={{ duration: 0.3 }}>
            <svg viewBox="0 0 40 24" className={styles.editArrowSvg}>
              <line x1="4" y1="12" x2="30" y2="12" /><polygon points="28,6 36,12 28,18" />
            </svg>
            <span className={styles.editArrowLabel}>Inpainting</span>
          </motion.div>
        </div>
        <div className={styles.editPane}>
          <div className={styles.editPaneLabel}>
            <span className={styles.editPaneDot} style={{ background: 'var(--accent)' }} />
            <span>编辑图 · Generated</span>
          </div>
          <div className={styles.editImageWrap}>
            <AnimatePresence>
              {showEdited ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className={styles.editImageInner}>
                  <img src={editedImage} onError={(e) => { (e.target as HTMLImageElement).src = sourceImage; (e.target as HTMLImageElement).style.filter = 'hue-rotate(15deg) saturate(1.2)'; }} alt="编辑图" className={styles.editImage} />
                  <div className={styles.editedOverlay} style={{ left: '56%', top: '52%', width: '38%', height: '40%' }} />
                </motion.div>
              ) : (
                <div className={styles.editPending}>
                  <div className={styles.editPendingPulse} /><span>生成中…</span>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <div className={styles.editMeta}>
        <div className={styles.editInstruction}>
          <span className={styles.editInstructionLabel}>编辑指令</span>
          <span className={styles.editInstructionText}>将路边车辆替换为消防车</span>
        </div>
        <div className={styles.editInfoRow}>
          <span className={styles.editInfoItem}><span className={styles.editInfoKey}>edit_model</span><span className={styles.editInfoVal}>inpainting_model</span></span>
          <span className={styles.editInfoItem}><span className={styles.editInfoKey}>mask_area</span><span className={styles.editInfoVal}>24.5%</span></span>
          <span className={styles.editInfoItem}><span className={styles.editInfoKey}>fake_type</span><span className={styles.editInfoVal}>local_edit</span></span>
        </div>
        {showDiff && (
          <motion.div className={styles.diffBadge} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
            差异图已生成 · 原图-编辑图-掩码 三元组绑定完成
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── 阶段 04：掩码校验 ────────────────────────────────────
function StageMaskVerify({ progress }: { progress: number }) {
  const animatedProgress = Math.min(progress * 1.3, 1);
  const showResult = progress > 0.7;
  const gauges = [
    { label: '面积比例 r_M', value: verifyMetrics.maskAreaRatio, min: verifyMetrics.rMin, max: verifyMetrics.rMax, display: `${(verifyMetrics.maskAreaRatio * 100).toFixed(1)}%`, rangeLabel: `${(verifyMetrics.rMin * 100).toFixed(0)}%–${(verifyMetrics.rMax * 100).toFixed(0)}%`, pass: true },
    { label: '掩码内变化 d_in', value: verifyMetrics.dIn / 100, min: verifyMetrics.tauIn / 100, max: 1, display: verifyMetrics.dIn.toFixed(1), rangeLabel: `≥ ${verifyMetrics.tauIn.toFixed(1)}`, pass: true },
    { label: '掩码外泄漏 d_out', value: verifyMetrics.dOut / 100, min: 0, max: verifyMetrics.tauOut / 100, display: verifyMetrics.dOut.toFixed(1), rangeLabel: `≤ ${verifyMetrics.tauOut.toFixed(1)}`, pass: true },
  ];
  return (
    <div className={styles.stageContent}>
      <div className={styles.verifyPanel}>
        <div className={styles.verifyHeader}>
          <span className={styles.verifyTitle}>质量校验 · Quality Check</span>
          <span className={styles.verifyStatus}>{progress < 0.3 ? '计算中…' : progress < 0.7 ? '校验中…' : '✓ 校验完成'}</span>
        </div>
        <div className={styles.gaugeGrid}>
          {gauges.map((gauge) => (
            <div key={gauge.label} className={styles.gaugeItem}>
              <div className={styles.gaugeLabel}>{gauge.label}</div>
              <div className={styles.gaugeBarWrap}>
                <div className={styles.gaugeBar}>
                  <motion.div className={`${styles.gaugeBarFill} ${gauge.pass ? styles.gaugePass : styles.gaugeFail}`}
                    animate={{ width: `${gauge.value * animatedProgress * 100}%` }} transition={{ duration: 0.3 }} />
                  {gauge.min > 0 && <div className={styles.gaugeThreshold} style={{ left: `${gauge.min * 100}%` }}><span className={styles.gaugeThresholdLine} /></div>}
                  {gauge.max < 1 && <div className={styles.gaugeThreshold} style={{ left: `${gauge.max * 100}%` }}><span className={styles.gaugeThresholdLine} /></div>}
                </div>
                <span className={styles.gaugeValue}>{gauge.display}</span>
              </div>
              <div className={styles.gaugeRange}>
                <span className={styles.gaugeRangeLabel}>阈值: {gauge.rangeLabel}</span>
                {showResult && (
                  <motion.span className={gauge.pass ? styles.gaugePassBadge : styles.gaugeFailBadge}
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}>
                    {gauge.pass ? '✓ PASS' : '✗ FAIL'}
                  </motion.span>
                )}
              </div>
            </div>
          ))}
        </div>
        {showResult && (
          <motion.div className={styles.verifyConclusion} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <span className={styles.verifyConclusionIcon}>✓</span>
            <span className={styles.verifyConclusionText}>样本通过校验，标记为 <em>quality_status: approved</em>，可入库</span>
          </motion.div>
        )}
      </div>
      <div className={styles.verifySide}>
        <div className={styles.verifySideCard}><span className={styles.verifySideLabel}>语义变化级别</span><span className={styles.verifySideValue}>{verifyMetrics.semanticLevel}</span></div>
        <div className={styles.verifySideCard}><span className={styles.verifySideLabel}>掩码连通区域</span><span className={styles.verifySideValue}>1</span></div>
        <div className={styles.verifySideCard}><span className={styles.verifySideLabel}>边界框</span><span className={styles.verifySideValue}>[573, 532, 962, 942]</span></div>
        <div className={styles.verifySideCard}><span className={styles.verifySideLabel}>入库判定</span><span className={`${styles.verifySideValue} ${styles.verifySideApproved}`}>{showResult ? '可入库' : '—'}</span></div>
      </div>
    </div>
  );
}

// ─── 阶段 05：全图生成 ────────────────────────────────────
function StageFullGen({ progress }: { progress: number }) {
  const visibleCount = Math.floor(progress * (candidateImages.length + 0.6));
  return (
    <div className={styles.stageContent}>
      <div className={styles.candidatesGrid}>
        {candidateImages.map((cand, i) => (
          <AnimatePresence key={cand.model}>
            {i < visibleCount && (
              <motion.div className={styles.candidateCard}
                initial={{ opacity: 0, y: 18, scale: 0.93 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.45, delay: i * 0.08, ease: 'easeOut' }}>
                <img src={cand.src} alt={cand.model} className={styles.candidateImg} />
                <div className={styles.candidateMeta}>
                  <span className={styles.candidateModel}>{cand.model}</span>
                  <span className={styles.candidateConf}>{Math.round(cand.conf * 100)}%</span>
                </div>
                <span className={styles.candidateBadge}>AI 生成</span>
                <span className={styles.candidateType}>full_generation</span>
              </motion.div>
            )}
          </AnimatePresence>
        ))}
        {Array.from({ length: Math.max(0, candidateImages.length - visibleCount) }).map((_, i) => (
          <div key={`ph-${i}`} className={styles.candidatePending}>
            <div className={styles.pendingPulse} /><span className={styles.pendingLabel}>生成中…</span>
          </div>
        ))}
      </div>
      <div className={styles.generateMeta}>
        <div className={styles.generateStatus}>
          <span className={styles.generateCount}>{visibleCount} / {candidateImages.length} 模型完成</span>
          <div className={styles.generateBar}>
            <motion.div className={styles.generateBarFill} animate={{ width: `${(visibleCount / candidateImages.length) * 100}%` }} transition={{ duration: 0.3 }} />
          </div>
        </div>
        <div className={styles.generateFields}>
          <div className={styles.genFieldRow}><span>is_fake</span><em className={styles.metaHighlight}>1</em></div>
          <div className={styles.genFieldRow}><span>fake_type</span><em>full_generation</em></div>
          <div className={styles.genFieldRow}><span>seed</span><em>42</em></div>
          <div className={styles.genFieldRow}><span>sampler</span><em>DPM++ 2M</em></div>
        </div>
      </div>
    </div>
  );
}

// ─── 阶段 06：标注文件生成（方向一：含取证框转化视图）────────
function StageAnnotation({ progress }: { progress: number }) {
  const jsonLines = jsonAnnotation.split('\n');
  const visibleLines = Math.floor(progress * (jsonLines.length + 1));
  const [activeTab, setActiveTab] = useState(0);
  // 方向一：progress > 0.75 时切换到取证框转化视图
  const showForensicView = progress > 0.75;
  const [activeForensicId, setActiveForensicId] = useState<string | null>(null);
  const forensicRevealCount = showForensicView
    ? Math.min(annotationMarksAsForensic.length, Math.floor((progress - 0.75) / 0.08) + 1)
    : 0;

  const annotationLevels = [
    { label: '图像级', en: 'Image',   fields: ['id', 'is_fake', 'fake_type', '来源', '质量状态'] },
    { label: '区域级', en: 'Region',  fields: ['mask_path', 'bbox', '面积比例', '区域类别'] },
    { label: '内容级', en: 'Content', fields: ['原图路径', '生成图路径', '差异图路径', '编辑指令'] },
    { label: '过程级', en: 'Process', fields: ['模型名称', '模型版本', '提示词', '随机种子', '复核状态'] },
  ];

  return (
    <div className={styles.stageContent}>
      {/* 左侧：四层标注 Tab */}
      <div className={styles.annotationLevels}>
        <div className={styles.annotationLevelsHeader}>四层标注体系</div>
        <div className={styles.annotationTabs}>
          {annotationLevels.map((level, i) => (
            <button key={level.en} type="button"
              className={`${styles.annotationTab} ${i === activeTab ? styles.annotationTabActive : ''}`}
              onClick={() => setActiveTab(i)}>
              <span className={styles.annotationTabLabel}>{level.label}</span>
              <span className={styles.annotationTabEn}>{level.en}</span>
            </button>
          ))}
        </div>
        <div className={styles.annotationFields}>
          {annotationLevels[activeTab].fields.map(field => (
            <div key={field} className={styles.annotationField}>
              <span className={styles.annotationFieldDot} /><span>{field}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧：JSON 面板 → 取证框转化视图 */}
      <div className={styles.annotationRight}>
        <AnimatePresence mode="wait">
          {!showForensicView ? (
            /* JSON 打字展示 */
            <motion.div key="json" className={styles.jsonPanel}
              initial={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.4 }}>
              <div className={styles.jsonPanelHeader}>
                <span className={styles.jsonPanelTitle}>sample_annotation.json</span>
                <span className={styles.jsonPanelStatus}>{progress < 0.9 ? '写入中…' : '✓ 完成'}</span>
              </div>
              <div className={styles.jsonBody}>
                {jsonLines.map((line, i) => (
                  <div key={i} className={`${styles.jsonLine} ${i >= visibleLines ? styles.jsonLineHidden : ''}`}>
                    <span className={styles.jsonLineNum}>{i + 1}</span>
                    <span className={styles.jsonLineCode}>{colorizeJson(line)}</span>
                  </div>
                ))}
                {progress < 0.95 && <span className={styles.jsonCursor}>▌</span>}
              </div>
            </motion.div>
          ) : (
            /* ── 方向一：标注 → 取证框转化视图 ── */
            <motion.div key="forensic" className={styles.forensicTransView}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
              <div className={styles.forensicTransHeader}>
                <span className={styles.forensicTransTag}>标注 → 取证框</span>
                <span className={styles.forensicTransSubtitle}>标注区域已映射为检测台证据框</span>
              </div>
              <div className={styles.forensicImageWrap}>
                <img src={sourceImage} alt="" className={styles.forensicImg} />
                {/* 取证框叠层 */}
                <AnimatePresence>
                  {annotationMarksAsForensic.slice(0, forensicRevealCount).map(mark => (
                    <ForensicMark
                      key={mark.id}
                      x={mark.x} y={mark.y} w={mark.w} h={mark.h}
                      label={mark.label}
                      confidence={mark.confidence}
                      active={activeForensicId === mark.id}
                    />
                  ))}
                </AnimatePresence>
                {/* 扫描出现动效：框出现前有扫描线 */}
                {forensicRevealCount < annotationMarksAsForensic.length && (
                  <div className={styles.forensicScanLine}
                    style={{ top: `${((progress - 0.75) / 0.25) * 100}%` }} />
                )}
              </div>
              {/* 标注详情列表 */}
              <div className={styles.forensicMarkList}>
                {annotationMarksAsForensic.map((mark, i) => {
                  const isVisible = i < forensicRevealCount;
                  return (
                    <motion.div key={mark.id}
                      className={`${styles.forensicMarkItem} ${isVisible ? styles.forensicMarkItemVisible : ''} ${activeForensicId === mark.id ? styles.forensicMarkItemActive : ''}`}
                      initial={false}
                      animate={{ opacity: isVisible ? 1 : 0.2 }}
                      onMouseEnter={() => isVisible && setActiveForensicId(mark.id)}
                      onMouseLeave={() => setActiveForensicId(null)}>
                      <div className={styles.forensicMarkHead}>
                        <span className={styles.forensicMarkId}>{mark.id}</span>
                        <span className={styles.forensicMarkType}>{mark.annotationLabel}</span>
                        <span className={styles.forensicMarkConf}>{Math.round(mark.confidence * 100)}%</span>
                      </div>
                      {isVisible && (
                        <div className={styles.forensicMarkDetail}>
                          <span className={styles.forensicMarkNote}>{mark.trainingNote}</span>
                          <span className={styles.forensicMarkDataset}>{mark.sourceDataset}</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// JSON 语法高亮辅助
function colorizeJson(line: string) {
  const parts: React.ReactNode[] = [];
  const kvRegex = /("([^"]+)")\s*:\s*("([^"]*)"|([\d.]+|\[[\d, ]+\]))/g;
  let match; let lastIndex = 0; let keyIndex = 0;
  while ((match = kvRegex.exec(line)) !== null) {
    if (match.index > lastIndex) parts.push(<span key={`pre-${keyIndex}`}>{line.slice(lastIndex, match.index)}</span>);
    parts.push(<span key={`k-${keyIndex}`}><span className={styles.jsonKey}>"{match[2]}"</span><span>: </span><span className={styles.jsonValue}>{match[3]}</span></span>);
    lastIndex = match.index + match[0].length; keyIndex++;
  }
  if (lastIndex < line.length) parts.push(<span key={`rest-${keyIndex}`}>{line.slice(lastIndex)}</span>);
  return parts.length > 0 ? parts : line;
}

// ─── 阶段 07：样本归档 ────────────────────────────────────
function StageArchive({ progress }: { progress: number }) {
  const isComplete = progress > 0.6;
  return (
    <div className={styles.stageContent}>
      <div className={styles.archivePanel}>
        <motion.div className={styles.archiveStampWrap}
          initial={{ scale: 0, rotate: -15 }} animate={{ scale: isComplete ? 1 : 0, rotate: isComplete ? -8 : -15 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
          <div className={styles.archiveStamp}>归 档</div>
        </motion.div>
        <div className={styles.archiveCard}>
          <div className={styles.archiveCardHeader}>
            <span className={styles.archiveCardId}>{archiveInfo.id}</span>
            <span className={styles.archiveCardStatus}>{isComplete ? '✓ 已入库' : '⋯ 写入中'}</span>
          </div>
          <div className={styles.archiveFields}>
            <div className={styles.archiveField}><span>来源</span><em>{archiveInfo.source}</em></div>
            <div className={styles.archiveField}><span>真实样本</span><em>{archiveInfo.real.toLocaleString()} 张</em></div>
            <div className={styles.archiveField}><span>全图生成</span><em>{archiveInfo.fullGen.toLocaleString()} 张</em></div>
            <div className={styles.archiveField}><span>局部编辑</span><em>{archiveInfo.localEdit.toLocaleString()} 张</em></div>
            <div className={styles.archiveField}><span>待复核</span><em>{archiveInfo.review} 条</em></div>
            <div className={styles.archiveField}><span>写入数据集</span><em>{archiveInfo.addedTo}</em></div>
          </div>
          <div className={styles.archiveTags}>
            {archiveInfo.tags.map(tag => <span key={tag} className={styles.archiveTag}>{tag}</span>)}
          </div>
        </div>
        <div className={styles.archiveProgress}>
          <span className={styles.archiveProgressLabel}>写入进度</span>
          <div className={styles.archiveProgressBar}>
            <motion.div className={styles.archiveProgressFill} animate={{ width: `${Math.min(progress * 160, 100)}%` }} transition={{ duration: 0.2 }} />
          </div>
          <span className={styles.archiveProgressNum}>{Math.min(Math.round(progress * 160), 100)}%</span>
        </div>
      </div>
      <div className={styles.exportGrid}>
        <div className={styles.exportGridHeader}>导出清单</div>
        {exportLists.map((list, i) => (
          <motion.div key={list.key} className={styles.exportCard} initial={false}
            animate={{ opacity: progress > (i + 1) * 0.2 ? 1 : 0.25, y: progress > (i + 1) * 0.2 ? 0 : 6 }}
            transition={{ duration: 0.35 }}>
            <div className={styles.exportCardTop}>
              <span className={styles.exportCardLabel}>{list.label}</span>
              <span className={styles.exportCardEn}>{list.en}</span>
            </div>
            <span className={styles.exportCardCount}>{list.count.toLocaleString()}</span>
            <span className={styles.exportCardDesc}>{list.desc}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── 方向三：顶部三路分叉流程图 ─────────────────────────────
function PipelineHeader({ currentIdx, onJump }: { currentIdx: number; onJump: (i: number) => void }) {
  const currentPathType = stages[currentIdx].pathType;

  // 三路分叉：阶段0是入口，1-4是两条支路（local=2-4, full=5），5-6汇合
  // 布局：阶段01 → 分叉节点 → [路径A: 02 03 04] [路径B: 05] → 汇合 → 06 → 07
  const forkStages = [stages[0]];                        // 01 入口
  const localPathStages = stages.slice(1, 4);             // 02 03 04
  const fullPathStage = stages[4];                        // 05
  const mergeStages = stages.slice(5);                    // 06 07

  const isPathActive = (pathType: PathType) => currentPathType === pathType || currentPathType === 'all';

  return (
    <div className={styles.pipelineHeaderWrap}>
      <div className={styles.pipelineHeaderLabel}>三路构建工作流 · Three-Path Pipeline</div>
      <div className={styles.pipelineForkLayout}>

        {/* ─ 入口节点 01 ─ */}
        <div className={styles.forkColumn}>
          {forkStages.map(stage => {
            const isDone = stages.indexOf(stage) < currentIdx;
            const isActive = stages.indexOf(stage) === currentIdx;
            return (
              <PipelineNodeBtn key={stage.key} stage={stage} isDone={isDone} isActive={isActive}
                onClick={() => onJump(stages.indexOf(stage))} pathColor="var(--ink-2)" />
            );
          })}
        </div>

        {/* ─ 分叉连接 ─ */}
        <div className={styles.forkBranchWrap}>
          {/* 上路：负样本 → 直接汇合（简化：不单独画路径，用虚线提示） */}
          <div className={styles.forkBranchReal}>
            <svg viewBox="0 0 60 12" className={styles.forkBranchSvg}>
              <line x1="0" y1="6" x2="60" y2="6"
                stroke="var(--real)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />
            </svg>
            <span className={styles.forkBranchLabel} style={{ color: 'var(--real)' }}>负样本直入库</span>
          </div>

          {/* 中路：局部编辑 02→03→04 */}
          <div className={`${styles.forkBranchLocal} ${isPathActive('local') ? styles.forkBranchActive : ''}`}>
            <svg viewBox="0 0 8 8" className={styles.forkArrowLeft} style={{ color: 'var(--accent)' }}>
              <polyline points="1,1 7,4 1,7" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            {localPathStages.map((stage, i) => {
              const idx = stages.indexOf(stage);
              const isDone = idx < currentIdx;
              const isActive = idx === currentIdx;
              return (
                <React.Fragment key={stage.key}>
                  {i > 0 && (
                    <svg viewBox="0 0 24 4" className={styles.forkConnectorSvg}>
                      <line x1="0" y1="2" x2="24" y2="2" stroke={isDone ? 'var(--accent)' : 'var(--rule)'} strokeWidth="1.5"
                        strokeDasharray={isDone ? 'none' : '3 3'} />
                      {isDone && <polygon points="19,0 24,2 19,4" fill="var(--accent)" opacity="0.7" />}
                    </svg>
                  )}
                  <PipelineNodeBtn stage={stage} isDone={isDone} isActive={isActive}
                    onClick={() => onJump(idx)} pathColor="var(--accent)" compact />
                </React.Fragment>
              );
            })}
          </div>

          {/* 下路：全图生成 05 */}
          <div className={`${styles.forkBranchFull} ${isPathActive('full') ? styles.forkBranchActive : ''}`}>
            <svg viewBox="0 0 8 8" className={styles.forkArrowLeft} style={{ color: 'var(--low-conf)' }}>
              <polyline points="1,1 7,4 1,7" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            {(() => {
              const idx = stages.indexOf(fullPathStage);
              const isDone = idx < currentIdx;
              const isActive = idx === currentIdx;
              return <PipelineNodeBtn stage={fullPathStage} isDone={isDone} isActive={isActive}
                onClick={() => onJump(idx)} pathColor="var(--low-conf)" compact />;
            })()}
          </div>
        </div>

        {/* ─ 汇合节点 06 07 ─ */}
        <div className={styles.forkMergeWrap}>
          <svg viewBox="0 0 8 8" className={styles.forkArrowMerge}>
            <polyline points="1,1 7,4 1,7" fill="none" stroke="var(--ink-3)" strokeWidth="1.5" />
          </svg>
          <div className={styles.forkMergeNodes}>
            {mergeStages.map((stage, i) => {
              const idx = stages.indexOf(stage);
              const isDone = idx < currentIdx;
              const isActive = idx === currentIdx;
              return (
                <React.Fragment key={stage.key}>
                  {i > 0 && (
                    <svg viewBox="0 0 24 4" className={styles.forkConnectorSvg}>
                      <line x1="0" y1="2" x2="24" y2="2" stroke={isDone ? 'var(--ink-2)' : 'var(--rule)'} strokeWidth="1.5"
                        strokeDasharray={isDone ? 'none' : '3 3'} />
                      {isDone && <polygon points="19,0 24,2 19,4" fill="var(--ink-2)" opacity="0.5" />}
                    </svg>
                  )}
                  <PipelineNodeBtn stage={stage} isDone={isDone} isActive={isActive}
                    onClick={() => onJump(idx)} pathColor="var(--ink-2)" compact />
                </React.Fragment>
              );
            })}
          </div>
        </div>

      </div>

      {/* 路径图例 */}
      <div className={styles.pathLegend}>
        {(['real', 'local', 'full', 'all'] as PathType[]).map(pt => {
          const info = pathInfo[pt];
          const isActive = currentPathType === pt;
          return (
            <div key={pt} className={`${styles.pathLegendItem} ${isActive ? styles.pathLegendItemActive : ''}`}>
              <span className={styles.pathLegendDot} style={{ background: info.color }} />
              <span className={styles.pathLegendLabel}>{info.badge}</span>
              <span className={styles.pathLegendEn}>{info.en}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 通用节点按钮
function PipelineNodeBtn({ stage, isDone, isActive, onClick, pathColor, compact }: {
  stage: Stage; isDone: boolean; isActive: boolean;
  onClick: () => void; pathColor: string; compact?: boolean;
}) {
  const info = pathInfo[stage.pathType];
  return (
    <button type="button"
      className={`${styles.pipelineNode} ${isDone ? styles.nodesDone : ''} ${isActive ? styles.nodesActive : ''} ${!isDone && !isActive ? styles.nodesPending : ''} ${compact ? styles.pipelineNodeCompact : ''}`}
      onClick={onClick}
      style={isActive ? { borderColor: pathColor, background: `color-mix(in srgb, ${pathColor} 8%, var(--surface))` } : undefined}>
      <span className={styles.nodeDot}
        style={isDone ? { background: 'var(--real)' } : isActive ? { background: pathColor } : undefined}>
        {isDone && <svg viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" className={styles.nodeDotCheck} /></svg>}
        {isActive && <span className={styles.nodeDotActive} />}
      </span>
      <span className={styles.nodeIndex}>{stage.index}</span>
      {!compact && <span className={styles.nodeLabel}>{stage.label}</span>}
      {compact && <span className={styles.nodeLabel}>{stage.label.length > 5 ? stage.label.slice(0, 5) + '…' : stage.label}</span>}
      {isActive && <span className={styles.nodeActivePath} style={{ color: pathColor, borderColor: pathColor }}>{info.badge}</span>}
    </button>
  );
}

// ─── 底部迷你图标 ─────────────────────────────────────────
function MiniStageIcon({ stageKey }: { stageKey: StageKey }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={styles.miniIcon}>
      {stageKey === 'realIngest' && (<><rect x="3" y="3" width="14" height="14" rx="1" /><circle cx="7" cy="7" r="1.5" /><path d="M3 13 L7 9 L11 12 L14 9 L17 13" /></>)}
      {stageKey === 'regionSelect' && (<><rect x="3" y="3" width="14" height="14" /><rect x="5" y="5" width="6" height="6" /><line x1="5" y1="3" x2="5" y2="0" /><line x1="17" y1="3" x2="17" y2="0" /><line x1="3" y1="5" x2="0" y2="5" /></>)}
      {stageKey === 'localEdit' && (<><rect x="2" y="3" width="7" height="14" rx="0.5" /><path d="M12 10 L16 10" /><path d="M14 8 L14 12" /><rect x="11" y="3" width="7" height="14" rx="0.5" /></>)}
      {stageKey === 'maskVerify' && (<><circle cx="10" cy="10" r="7" /><path d="M7 10 L9 12 L13 8" /></>)}
      {stageKey === 'fullGen' && (<><rect x="2" y="2" width="7" height="7" rx="0.5" /><rect x="11" y="2" width="7" height="7" rx="0.5" /><rect x="2" y="11" width="7" height="7" rx="0.5" /><rect x="11" y="11" width="7" height="7" rx="0.5" /></>)}
      {stageKey === 'annotation' && (<><line x1="4" y1="5" x2="16" y2="5" /><line x1="4" y1="8" x2="14" y2="8" /><line x1="4" y1="11" x2="12" y2="11" /><line x1="4" y1="14" x2="10" y2="14" /><path d="M2 2 L2 18 L18 18" /></>)}
      {stageKey === 'archive' && (<><rect x="3" y="6" width="14" height="11" rx="1" /><path d="M7 6 L7 3 L13 3 L13 6" /><line x1="7" y1="11" x2="13" y2="11" /></>)}
    </svg>
  );
}

// ─── 主页面 ──────────────────────────────────────────────
export function ImageShowcase() {
  const { currentIdx, progress, isPlaying, setIsPlaying, jumpTo } = useStageAuto(stages);
  const currentStage = stages[currentIdx];
  const currentPath = pathInfo[currentStage.pathType];

  return (
    <PageContainer width="wide">
      <div className={styles.page}>
        <Link className={styles.backLink} to="/admin/pipeline">← 返回数据生成</Link>

        <header className={styles.showcaseHeader}>
          <p className={styles.headerQuote}>─ From raw image to annotated training sample ─</p>
          <h1 className={styles.headerTitle}>图片标注 · 三路构建工作流</h1>
          <p className={styles.headerEn}>IMAGE ANNOTATION PIPELINE</p>
        </header>

        {/* 方向三：顶部三路分叉流程图 */}
        <PipelineHeader currentIdx={currentIdx} onJump={jumpTo} />

        {/* 主内容区 */}
        <div className={styles.showcaseBody}>
          {/* 左侧：阶段说明栏 */}
          <aside className={styles.stageInfo}>
            <div className={styles.stageInfoNum}>{currentStage.index}</div>
            <h2 className={styles.stageInfoTitle}>{currentStage.label}</h2>
            <p className={styles.stageInfoEn}>{currentStage.en}</p>
            <p className={styles.stageInfoDesc}>{currentStage.desc}</p>

            <div className={styles.stageDuration}>
              <div className={styles.stageDurationBar}>
                <motion.div className={styles.stageDurationFill}
                  animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.1 }}
                  style={{ background: currentPath.color }} />
              </div>
              <span className={styles.stageDurationLabel}>{Math.round(progress * 100)}%</span>
            </div>

            <div className={styles.stageControls}>
              <button type="button" className={styles.controlBtn} onClick={() => setIsPlaying(!isPlaying)}>
                {isPlaying ? (
                  <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="2" width="4" height="12" /><rect x="9" y="2" width="4" height="12" /></svg>
                ) : (
                  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2 L13 8 L4 14 Z" /></svg>
                )}
                <span>{isPlaying ? '暂停' : '播放'}</span>
              </button>
              <div className={styles.stageNav}>
                <button type="button" className={styles.navBtn} onClick={() => jumpTo(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0}>←</button>
                <span className={styles.navLabel}>{currentIdx + 1} / {stages.length}</span>
                <button type="button" className={styles.navBtn} onClick={() => jumpTo(Math.min(stages.length - 1, currentIdx + 1))} disabled={currentIdx === stages.length - 1}>→</button>
              </div>
            </div>

            {/* 当前路径指示（方向三增强版） */}
            <div className={styles.sampleTypeIndicator}>
              <div className={styles.sampleTypeLabel}>当前样本路径</div>
              <div className={styles.sampleTypeBadgeNew} style={{ color: currentPath.color, borderColor: currentPath.color, background: currentPath.bgColor }}>
                <span>{currentPath.badge}</span>
                <span className={styles.sampleTypeEn}>{currentPath.en}</span>
              </div>
              <div className={styles.pathDescription}>{currentPath.label}</div>
            </div>
          </aside>

          {/* 右侧：动态演示区 */}
          <div className={styles.stageDisplay}>
            <div className={styles.stageDisplayInner}>
              <AnimatePresence mode="wait">
                <motion.div key={currentIdx} className={styles.stagePane}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}>
                  {currentIdx === 0 && <StageRealIngest progress={progress} />}
                  {currentIdx === 1 && <StageRegionSelect progress={progress} />}
                  {currentIdx === 2 && <StageLocalEdit progress={progress} />}
                  {currentIdx === 3 && <StageMaskVerify progress={progress} />}
                  {currentIdx === 4 && <StageFullGen progress={progress} />}
                  {currentIdx === 5 && <StageAnnotation progress={progress} />}
                  {currentIdx === 6 && <StageArchive progress={progress} />}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className={styles.stageFooterBar}>
              <span className={styles.stageFooterTag} style={{ color: currentPath.color, borderColor: currentPath.color, background: currentPath.bgColor, opacity: 1 }}>
                {currentStage.en}
              </span>
              <span className={styles.stageFooterDash}>─</span>
              <span className={styles.stageFooterDesc}>{currentStage.desc}</span>
            </div>
          </div>
        </div>

        {/* 底部迷你管线 */}
        <div className={styles.miniPipelineRow}>
          {stages.map((stage, i) => {
            const isDone = i < currentIdx;
            const isActive = i === currentIdx;
            const info = pathInfo[stage.pathType];
            return (
              <div key={stage.key} className={styles.miniStep}>
                {i > 0 && (
                  <div className={`${styles.miniConnector} ${isDone ? styles.miniConnectorDone : ''}`}
                    style={isDone ? { background: pathInfo[stages[i - 1].pathType].color, opacity: 0.5 } : undefined} />
                )}
                <button type="button"
                  className={`${styles.miniNode} ${isDone ? styles.miniNodeDone : ''} ${isActive ? styles.miniNodeActive : ''}`}
                  onClick={() => jumpTo(i)} title={stage.label}
                  style={isActive ? { borderColor: info.color, color: info.color, background: info.bgColor } : isDone ? { borderColor: 'var(--real)', color: 'var(--real)' } : undefined}>
                  <MiniStageIcon stageKey={stage.key} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </PageContainer>
  );
}
