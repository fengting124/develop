import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { UserTopbar } from '@/components/UserTopbar/UserTopbar';
import { ForensicMark } from '@/components/ForensicMark/ForensicMark';
import styles from './DetectImage.module.css';

type ProcessState = 'idle' | 'processing' | 'done';

const demoImage = '/images/图片检测示例图/image.png';

// ─── 推理日志 ────────────────────────────────────────────
const logsData = [
  { time: 200,  text: '初始化图像取证引擎...' },
  { time: 800,  text: '加载通用检测与靶向适配专家权重...' },
  { time: 1400, text: '建立与知识图谱 (ConceptNet) 的连接...' },
  { time: 2100, text: '尝试提取 EXIF 元数据... [失败] 平台已剥离元数据。' },
  { time: 2800, text: '[空域分析] 多尺度卷积网络检测局部篡改...' },
  { time: 3500, text: '[频域分析] 快速傅里叶变换完成，提取高频异常分布...' },
  { time: 4200, text: '[语义对齐] CLIP 与 Grounding DINO 启动...' },
  { time: 5100, text: '[警告] 检测到全局逻辑矛盾: 塑料盆置于明火。' },
  { time: 6400, text: '[门控协同] 动态激活靶向专家...' },
  { time: 7200, text: '[LoRA 适配] 注入 Nano Banana Pro 专用模型权重...' },
  { time: 8500, text: '[大模型推理] 校验时空因果与常识逻辑...' },
  { time: 9800, text: '证据聚合计算完成。' },
  { time: 10500, text: '[最终结论] 确认内容为 AI 生成/篡改。' },
];

const totalDuration = 11000;

// ─── 证据锚点（红框） ─────────────────────────────────────
// 每个 mark 关联 chainIndex（语义链节点）和 expertKeys（激活的专家）
const marks = [
  {
    id: 'M-01',
    x: 35, y: 45, w: 35, h: 40,
    title: '物理逻辑矛盾',
    desc: '塑料盆置于明火',
    appearAt: 5100,
    tooltip: '【全局语义违和】SGG提取三元组〈塑料盆, 在上方, 火〉。知识图谱计算语义距离 E_KG 极高，LLM输出逻辑违和度 0.90。',
    chainIndex: 2,        // 关联语义链节点索引
    expertKeys: ['semantic', 'lora'],
  },
  {
    id: 'M-02',
    x: 45, y: 45, w: 15, h: 15,
    title: '实体不匹配',
    desc: '异常的石块纹理',
    appearAt: 6800,
    tooltip: '【局部像素异常】该区域图像噪声梯度与全局分布完全断裂，大概率为生成模型局部重绘(Inpainting)强行插入的实体。',
    chainIndex: 1,
    expertKeys: ['texture', 'frequency'],
  },
  {
    id: 'M-03',
    x: 25, y: 5, w: 20, h: 25,
    title: '光源方向背离',
    desc: '面部高光位置错误',
    appearAt: 8400,
    tooltip: '【全局-局部一致性】空域专家通过多尺度特征提取，发现人物面部的高频残差所反映的光源方向，与环境主光源呈明显背离。',
    chainIndex: 2,
    expertKeys: ['texture', 'style'],
  },
];

// ─── 语义思维链节点 ───────────────────────────────────────
const chainNodes = [
  {
    index: 0,
    label: '全局场景锚定',
    en: 'Global Scene',
    result: '视觉编码命中：厨房（置信度 0.91）',
    danger: null,
    appearAt: 4200,
  },
  {
    index: 1,
    label: '局部实体解析',
    en: 'Entity Parsing',
    result: '识别：锅、人、青菜、塑料盆、石头',
    danger: '锁定语义离群点：[塑料盆, 石头]',
    appearAt: 5100,
  },
  {
    index: 2,
    label: '逻辑与常识校验',
    en: 'Logic Validation',
    result: '知识图谱：〈塑料盆, 在上方, 火〉距离极高',
    danger: '大模型评估：荒谬 (0.90) — 违背物理常识',
    appearAt: 8500,
  },
  {
    index: 3,
    label: '证据融合 · 判决',
    en: 'Evidence Fusion',
    result: '多专家共识达成，综合置信度 0.94',
    danger: null,
    appearAt: 9800,
  },
];

// ─── 专家网络 ─────────────────────────────────────────────
// radar 坐标：cx/cy 是各顶点在 100×100 坐标系中的位置
const experts = [
  {
    key: 'texture',
    label: '纹理专家',
    en: 'Texture',
    cx: 50, cy: 8,        // 顶部
    weight: 0.45,
    appearAt: 1000,
    isTarget: false,
    tip: '空域多尺度分析，检测局部篡改与几何畸变。贡献权重 0.45',
  },
  {
    key: 'frequency',
    label: '频域专家',
    en: 'Frequency',
    cx: 92, cy: 65,       // 右下
    weight: 0.38,
    appearAt: 1000,
    isTarget: false,
    tip: 'FFT高频残差分析，识别生成模型周期性噪声。贡献权重 0.38',
  },
  {
    key: 'style',
    label: '风格专家',
    en: 'Style',
    cx: 68, cy: 97,       // 右底
    weight: 0.42,
    appearAt: 1000,
    isTarget: false,
    tip: '材质笔触分析，识别生成模型风格偏移。贡献权重 0.42',
  },
  {
    key: 'semantic',
    label: '语义专家',
    en: 'Semantic',
    cx: 32, cy: 97,       // 左底
    weight: 0.78,
    appearAt: 4000,
    isTarget: false,
    tip: '场景语义与常识校验，检测物体组合异常。贡献权重 0.78',
  },
  {
    key: 'lora',
    label: 'Nano Banana',
    en: 'Targeted',
    cx: 8, cy: 65,        // 左下
    weight: 0.92,
    appearAt: 7000,
    isTarget: true,
    tip: 'LoRA 靶向专家，精准匹配生成模型残留指纹。置信度 0.92',
  },
];

// ─── 雷达图 SVG（纯手写，无库） ───────────────────────────
function ExpertRadar({
  elapsed,
  activeExpertKeys,
}: {
  elapsed: number;
  activeExpertKeys: string[] | null;
}) {
  const size = 100;
  const cx = 50;
  const cy = 54;     // 稍微偏下，留顶部标签空间

  // 五边形背景网格层（3层）
  const gridLevels = [0.33, 0.66, 1.0];

  // 计算每个专家从中心到其顶点的方向向量（归一化到 radius）
  const radius = 38;
  const activeExperts = experts.filter(e => elapsed >= e.appearAt);

  // 构建雷达填充多边形的顶点
  function expertPt(e: typeof experts[number], scale = 1) {
    const dx = e.cx - cx;
    const dy = e.cy - cy;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / len;
    const ny = dy / len;
    return {
      x: cx + nx * radius * scale,
      y: cy + ny * radius * scale,
    };
  }

  // 网格五边形顶点（按固定角度）
  function pentagonPts(r: number) {
    return experts.map(e => expertPt(e, r / radius)).map(p => `${p.x},${p.y}`).join(' ');
  }

  // 数据填充多边形
  const dataPolygon = activeExperts.length >= 2
    ? experts.map(e => {
        const isActive = elapsed >= e.appearAt;
        const w = isActive ? e.weight : 0;
        return expertPt(e, w);
      }).map(p => `${p.x},${p.y}`).join(' ')
    : '';

  return (
    <svg
      viewBox="0 0 100 100"
      className={styles.radarSvg}
      aria-label="专家贡献雷达图"
    >
      {/* 网格层 */}
      {gridLevels.map(level => (
        <polygon
          key={level}
          points={pentagonPts(radius * level)}
          className={styles.radarGrid}
        />
      ))}

      {/* 轴线（中心 → 每个顶点） */}
      {experts.map(e => {
        const pt = expertPt(e, 1);
        return (
          <line
            key={e.key}
            x1={cx} y1={cy}
            x2={pt.x} y2={pt.y}
            className={styles.radarAxis}
          />
        );
      })}

      {/* 数据填充区 */}
      {dataPolygon && (
        <polygon
          points={dataPolygon}
          className={styles.radarFill}
        />
      )}

      {/* 专家顶点 */}
      {experts.map(e => {
        const isVisible = elapsed >= e.appearAt;
        const pt = expertPt(e, 1);
        const dataPt = expertPt(e, isVisible ? e.weight : 0);
        const isHighlighted = activeExpertKeys
          ? activeExpertKeys.includes(e.key)
          : isVisible;

        return (
          <g key={e.key}>
            {/* 轴点 */}
            <circle
              cx={pt.x} cy={pt.y} r="2.5"
              className={`${styles.radarAxisDot} ${isVisible ? styles.radarAxisDotVisible : ''}`}
            />
            {/* 数据点 */}
            {isVisible && (
              <circle
                cx={dataPt.x} cy={dataPt.y} r={isHighlighted ? 3.2 : 2}
                className={`${styles.radarDataDot} ${e.isTarget ? styles.radarDataDotTarget : ''} ${isHighlighted ? styles.radarDataDotActive : ''}`}
              />
            )}
            {/* 标签 */}
            <text
              x={e.cx}
              y={e.cy < cy ? e.cy - 4 : e.cy + 8}
              className={`${styles.radarLabel} ${isHighlighted && isVisible ? styles.radarLabelActive : ''} ${e.isTarget ? styles.radarLabelTarget : ''}`}
              textAnchor={e.cx < 30 ? 'end' : e.cx > 70 ? 'start' : 'middle'}
            >
              {e.label}
            </text>
          </g>
        );
      })}

      {/* 中心点 */}
      <circle cx={cx} cy={cy} r="2" className={styles.radarCenter} />
    </svg>
  );
}

// ─── 语义链节点图 ─────────────────────────────────────────
function SemanticChain({
  elapsed,
  activeNodeIndex,
}: {
  elapsed: number;
  activeNodeIndex: number | null;
}) {
  const visibleNodes = chainNodes.filter(n => elapsed >= n.appearAt);

  return (
    <div className={styles.chainGraph}>
      {chainNodes.map((node, i) => {
        const isVisible = elapsed >= node.appearAt;
        const isActive = activeNodeIndex === node.index;
        const isDone = isVisible && (activeNodeIndex === null || activeNodeIndex !== node.index);
        const isLast = i === chainNodes.length - 1;
        const prevDone = i > 0 && elapsed >= chainNodes[i - 1].appearAt;

        return (
          <div key={node.index} className={styles.chainNodeGroup}>
            {/* 连接线（节点上方） */}
            {i > 0 && (
              <div className={`${styles.chainConnector} ${prevDone ? styles.chainConnectorDone : ''}`}>
                <svg viewBox="0 0 2 24" className={styles.chainConnectorSvg}>
                  <line x1="1" y1="0" x2="1" y2="24"
                    className={`${styles.chainLine} ${prevDone ? styles.chainLineDone : ''}`}
                    strokeDasharray={prevDone ? 'none' : '3 3'}
                  />
                  {prevDone && (
                    <path d="M0,20 L1,24 L2,20" className={styles.chainArrow} />
                  )}
                </svg>
              </div>
            )}

            {/* 节点本体 */}
            <AnimatePresence>
              {isVisible && (
                <motion.div
                  className={`${styles.chainNode} ${isActive ? styles.chainNodeActive : ''} ${isDone && !isActive ? styles.chainNodeDone : ''}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                  {/* 节点头部 */}
                  <div className={styles.chainNodeHead}>
                    <span className={`${styles.chainNodeDot} ${isActive ? styles.chainNodeDotActive : styles.chainNodeDotDone}`}>
                      {isActive ? (
                        // 激活：脉冲圆
                        <span className={styles.chainDotPulse} />
                      ) : (
                        // 完成：对勾
                        <svg viewBox="0 0 10 10" className={styles.chainCheckSvg}>
                          <polyline points="1.5,5 4,7.5 8.5,2.5" className={styles.chainCheck} />
                        </svg>
                      )}
                    </span>
                    <span className={styles.chainNodeIdx}>
                      {String(node.index + 1).padStart(2, '0')}
                    </span>
                    <span className={styles.chainNodeLabel}>{node.label}</span>
                    <span className={styles.chainNodeEn}>{node.en}</span>
                  </div>

                  {/* 节点详情（只有 active 或展开时显示） */}
                  <div className={styles.chainNodeBody}>
                    <p className={styles.chainNodeResult}>{node.result}</p>
                    {node.danger && (
                      <p className={styles.chainNodeDanger}>
                        <span className={styles.chainDangerMark}>!</span>
                        {node.danger}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 末节点下方：结论徽章 */}
            {isLast && isVisible && (
              <motion.div
                className={styles.chainConclusion}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <span className={styles.conclusionStamp}>AI 生成</span>
                <span className={styles.conclusionConf}>置信度 0.94</span>
              </motion.div>
            )}
          </div>
        );
      })}

      {/* 未出现节点的占位 */}
      {chainNodes.filter(n => elapsed < n.appearAt).map((node, i) => (
        <div key={`pending-${node.index}`} className={styles.chainNodeGroup}>
          {(visibleNodes.length > 0 || i > 0) && (
            <div className={styles.chainConnector}>
              <svg viewBox="0 0 2 24" className={styles.chainConnectorSvg}>
                <line x1="1" y1="0" x2="1" y2="24" className={styles.chainLine} strokeDasharray="3 3" />
              </svg>
            </div>
          )}
          <div className={styles.chainNodePending}>
            <span className={styles.chainNodeDotPending} />
            <span className={styles.chainNodeIdx} style={{ opacity: 0.4 }}>{String(node.index + 1).padStart(2, '0')}</span>
            <span className={styles.chainNodeLabel} style={{ opacity: 0.35 }}>{node.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 推理日志 ─────────────────────────────────────────────
function TerminalLogs({ elapsed }: { elapsed: number }) {
  const visibleLogs = logsData.filter(l => elapsed >= l.time);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleLogs.length]);

  return (
    <div className={styles.terminal}>
      <div className={styles.terminalHeader}>推 理 日 志 ─ Log</div>
      <div className={styles.terminalBody}>
        {visibleLogs.map((log, i) => (
          <div
            key={i}
            className={
              log.text.includes('[警告]') || log.text.includes('[最终结论]')
                ? styles.logDanger
                : styles.logInfo
            }
          >
            <span className={styles.logTimestamp}>{(log.time / 1000).toFixed(3)}s</span>
            {log.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

// ─── 右侧面板（三 Tab） ────────────────────────────────────
type TabKey = 'chain' | 'experts' | 'evidence';

function RightPanel({
  elapsed,
  activeMarkId,
  setActiveMarkId,
}: {
  elapsed: number;
  activeMarkId: string | null;
  setActiveMarkId: (id: string | null) => void;
}) {
  const [tab, setTab] = useState<TabKey>('chain');

  // 当 hover 某个 mark 时，自动切换到对应 tab 并高亮
  const activeMark = marks.find(m => m.id === activeMarkId);
  const activeChainIndex = activeMark?.chainIndex ?? null;
  const activeExpertKeys = activeMark?.expertKeys ?? null;

  // 专家显示：激活哪些（用于雷达图高亮）
  const highlightedExperts = activeExpertKeys;

  const tabs: { key: TabKey; label: string; en: string }[] = [
    { key: 'chain',   label: '语义链',  en: 'CHAIN'   },
    { key: 'experts', label: '专家网络', en: 'EXPERTS' },
    { key: 'evidence',label: '证据锚点', en: 'EVIDENCE'},
  ];

  return (
    <motion.aside
      className={styles.rightPanel}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15, duration: 0.35 }}
    >
      {/* Tab 切换 */}
      <div className={styles.tabBar}>
        {tabs.map(t => (
          <button
            key={t.key}
            className={`${styles.tabBtn} ${tab === t.key ? styles.tabBtnActive : ''}`}
            onClick={() => setTab(t.key)}
            type="button"
          >
            <span className={styles.tabBtnLabel}>{t.label}</span>
            <span className={styles.tabBtnEn}>{t.en}</span>
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      <div className={styles.tabContent}>
        <AnimatePresence mode="wait">
          {tab === 'chain' && (
            <motion.div
              key="chain"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className={styles.tabPane}
            >
              <SemanticChain elapsed={elapsed} activeNodeIndex={activeChainIndex} />
            </motion.div>
          )}

          {tab === 'experts' && (
            <motion.div
              key="experts"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className={styles.tabPane}
            >
              <div className={styles.radarWrap}>
                <ExpertRadar elapsed={elapsed} activeExpertKeys={highlightedExperts} />
                <div className={styles.radarLegend}>
                  {experts.map(e => {
                    const isVisible = elapsed >= e.appearAt;
                    const isHl = highlightedExperts
                      ? highlightedExperts.includes(e.key)
                      : isVisible;
                    return (
                      <div
                        key={e.key}
                        className={`${styles.legendItem} ${isHl && isVisible ? styles.legendItemActive : ''} ${!isVisible ? styles.legendItemPending : ''} ${e.isTarget ? styles.legendItemTarget : ''}`}
                      >
                        <span className={styles.legendDot} />
                        <span className={styles.legendLabel}>{e.label}</span>
                        {isVisible && (
                          <span className={styles.legendWeight}>
                            {Math.round(e.weight * 100)}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 专家详情列表 */}
              <div className={styles.expertList}>
                {experts.map(e => {
                  const isVisible = elapsed >= e.appearAt;
                  const isHl = highlightedExperts ? highlightedExperts.includes(e.key) : false;
                  return (
                    <div
                      key={e.key}
                      className={`${styles.expertRow} ${isVisible ? styles.expertRowVisible : ''} ${isHl ? styles.expertRowHighlit : ''} ${e.isTarget ? styles.expertRowTarget : ''}`}
                    >
                      <div className={styles.expertRowHead}>
                        <span className={styles.expertRowName}>{e.label}</span>
                        {e.isTarget && <span className={styles.targetBadge}>靶向</span>}
                        {isVisible && (
                          <span className={styles.expertRowWeight}>
                            {Math.round(e.weight * 100)}%
                          </span>
                        )}
                      </div>
                      {isVisible && (
                        <div className={styles.expertBarWrap}>
                          <motion.div
                            className={`${styles.expertBarFill} ${e.isTarget ? styles.expertBarTarget : ''}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${e.weight * 100}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                          />
                        </div>
                      )}
                      {!isVisible && (
                        <div className={styles.expertBarWrap}>
                          <div className={styles.expertBarPending} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {tab === 'evidence' && (
            <motion.div
              key="evidence"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className={styles.tabPane}
            >
              <div className={styles.evidenceList}>
                {marks.map(mark => {
                  const isVisible = elapsed >= mark.appearAt;
                  const isActive = activeMarkId === mark.id;
                  return (
                    <div
                      key={mark.id}
                      className={`${styles.evidenceCard} ${isVisible ? styles.evidenceCardVisible : ''} ${isActive ? styles.evidenceCardActive : ''}`}
                      onMouseEnter={() => isVisible && setActiveMarkId(mark.id)}
                      onMouseLeave={() => isVisible && setActiveMarkId(null)}
                    >
                      <div className={styles.evidenceCardHead}>
                        <span className={styles.evidenceId}>{mark.id}</span>
                        <span className={styles.evidenceTitle}>{mark.title}</span>
                      </div>
                      <p className={styles.evidenceDesc}>{mark.desc}</p>
                      {isActive && (
                        <motion.p
                          className={styles.evidenceTip}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          transition={{ duration: 0.2 }}
                        >
                          {mark.tooltip}
                        </motion.p>
                      )}
                      {/* 关联专家标签 */}
                      {isVisible && (
                        <div className={styles.evidenceExperts}>
                          {mark.expertKeys.map(k => {
                            const ex = experts.find(e => e.key === k);
                            return ex ? (
                              <span key={k} className={`${styles.evidenceExpertTag} ${ex.isTarget ? styles.evidenceExpertTagTarget : ''}`}>
                                {ex.label}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {marks.every(m => elapsed < m.appearAt) && (
                  <p className={styles.evidencePending}>证据锚点将在分析过程中逐步显影…</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 底部数据栏 */}
      {elapsed > 3500 && (
        <motion.div
          className={styles.physicsPanel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className={styles.physicsRow}>
            <span className={styles.physicsLabel}>EXIF 来源</span>
            <span className={styles.physicsValue}>Adobe Photoshop 24.0</span>
          </div>
          <div className={styles.physicsRow}>
            <span className={styles.physicsLabel}>FFT 高频残差</span>
            <div className={styles.fftMini}>
              {[30, 45, 80, 60, 90, 40, 70, 55].map((h, i) => (
                <span
                  key={i}
                  className={`${styles.fftBar} ${i % 2 === 0 ? styles.fftBarAccent : ''}`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </motion.aside>
  );
}

// ─── 主页面 ──────────────────────────────────────────────
export function DetectImage() {
  const [state, setState] = useState<ProcessState>('idle');
  const [imageSrc, setImageSrc] = useState(demoImage);
  const [elapsed, setElapsed] = useState(0);
  const [activeMarkId, setActiveMarkId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const startProcessing = (src = demoImage) => {
    setImageSrc(src);
    setElapsed(0);
    setActiveMarkId(null);
    setState('processing');
  };

  useEffect(() => {
    if (state !== 'processing') return;
    const startedAt = Date.now();
    const interval = window.setInterval(() => setElapsed(Date.now() - startedAt), 50);
    const doneTimer = window.setTimeout(() => setState('done'), totalDuration);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(doneTimer);
    };
  }, [state]);

  const handleFile = (file?: File) => {
    if (!file) return;
    startProcessing(URL.createObjectURL(file));
  };

  // 当 hover mark 时，同步切换图片上红框高亮 + 右侧联动
  // （右侧面板通过 activeMarkId 联动）

  return (
    <div className={styles.detectPage}>
      <UserTopbar title="图像取证" english="FORENSICS" />

      {state === 'idle' ? (
        /* ── IDLE ── */
        <div className={styles.idleState}>
          <div
            className={styles.uploadBox}
            onClick={() => inputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              handleFile(e.dataTransfer.files?.[0]);
            }}
          >
            <div className={styles.uploadIconSvg}>
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.2">
                <rect x="8" y="12" width="32" height="28" rx="1" />
                <line x1="24" y1="20" x2="24" y2="32" />
                <polyline points="18,26 24,20 30,26" />
                <line x1="14" y1="36" x2="34" y2="36" />
              </svg>
            </div>
            <div className={styles.uploadText}>上传待核验样本</div>
            <div className={styles.uploadSub}>支持 JPG · PNG · WebP — 或拖拽至此</div>
          </div>
          <input
            ref={inputRef}
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={e => handleFile(e.target.files?.[0])}
          />
          <button className={styles.demoBtn} onClick={() => startProcessing(demoImage)}>
            使用示例样本
          </button>
        </div>
      ) : (
        /* ── PROCESSING / DONE ── */
        <div className={styles.workspace}>
          {/* 左侧：图片画布 */}
          <div className={styles.canvasCol}>
            <div className={styles.imageWrap}>
              <img src={imageSrc} alt="待核验样本" className={styles.subjectImage} />

              {/* 扫描线 */}
              {state === 'processing' && (
                <>
                  <div className={styles.scanLineH} />
                  <div className={styles.scanGrid} />
                </>
              )}

              {/* 取证红框（联动 activeMarkId） */}
              <AnimatePresence>
                {marks
                  .filter(m => elapsed >= m.appearAt)
                  .map(mark => (
                    <ForensicMark
                      key={mark.id}
                      x={mark.x}
                      y={mark.y}
                      w={mark.w}
                      h={mark.h}
                      label={`${mark.id} · ${mark.title}`}
                      confidence={0.94}
                      active={activeMarkId === mark.id}
                    />
                  ))}
              </AnimatePresence>

              {/* 结论印章 */}
              {state === 'done' && (
                <motion.div
                  className={styles.verdictStampWrap}
                  initial={{ scale: 2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <div className={styles.verdictStamp}>AI 生成</div>
                </motion.div>
              )}
            </div>

            {/* 证据锚点快捷入口（图片下方，可 hover 联动） */}
            {(state === 'processing' || state === 'done') && (
              <div className={styles.anchorRow}>
                {marks.map(mark => {
                  const isVisible = elapsed >= mark.appearAt;
                  const isActive = activeMarkId === mark.id;
                  return (
                    <button
                      key={mark.id}
                      type="button"
                      className={`${styles.anchorChip} ${isVisible ? styles.anchorChipVisible : ''} ${isActive ? styles.anchorChipActive : ''}`}
                      onMouseEnter={() => isVisible && setActiveMarkId(mark.id)}
                      onMouseLeave={() => isVisible && setActiveMarkId(null)}
                      disabled={!isVisible}
                    >
                      <span className={styles.anchorId}>{mark.id}</span>
                      <span className={styles.anchorDesc}>{mark.desc}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 操作按钮 */}
            {state === 'done' && (
              <motion.div
                className={styles.actionsRow}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <button
                  className={styles.reportBtn}
                  onClick={() => navigate('/detect/report/demo')}
                >
                  查看详细报告 →
                </button>
                <button className={styles.resetBtn} onClick={() => setState('idle')}>
                  重新检测
                </button>
              </motion.div>
            )}
          </div>

          {/* 右侧：三 Tab 分析面板 */}
          <RightPanel
            elapsed={elapsed}
            activeMarkId={activeMarkId}
            setActiveMarkId={setActiveMarkId}
          />
        </div>
      )}

      {/* 底部进度条 + 推理日志 */}
      {state !== 'idle' && (
        <footer className={styles.bottomBar}>
          {/* 进度条 */}
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${Math.min(100, (elapsed / totalDuration) * 100)}%` }} />
            <span className={styles.progressPhase}>
              {state === 'done'
                ? '✓ 显影完成'
                : elapsed < 2000 ? '初始化...'
                : elapsed < 4200 ? '语义解析...'
                : elapsed < 7000 ? '专家协同...'
                : '证据聚合...'}
            </span>
          </div>
          {/* 日志 */}
          <TerminalLogs elapsed={elapsed} />
        </footer>
      )}
    </div>
  );
}
