import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/primitives';
import { ForensicMark } from '@/components/ForensicMark/ForensicMark';
import { UserTopbar } from '@/components/UserTopbar/UserTopbar';
import styles from './DetectImage.module.css';

type ProcessState = 'idle' | 'processing' | 'done';
type RightTab = 'flow' | 'semantic' | 'experts';
type StepStatus = 'done' | 'active' | 'pending';

const demoImage = '/images/图片检测示例图/image.png';

const steps = [
  { name: '全局语义读取', english: 'Global semantic reading', duration: 2600 },
  { name: '局部细节核查', english: 'Local detail review', duration: 3400 },
  { name: '异构专家协同', english: 'Expert ensemble', duration: 5200 },
  { name: '证据汇总', english: 'Evidence aggregation', duration: 4200 },
  { name: '出具结论', english: 'Final verdict', duration: 3000 },
];

const evidences = [
  { name: '实体语义不合理', appearAt: 4200 },
  { name: '局部纹理异常', appearAt: 8300 },
  { name: '物体关系违背常识', appearAt: 12000 },
];

const marks = [
  { x: 30, y: 45, w: 22, h: 28, label: 'M-01', confidence: 0.91, appearAt: 4200, clue: '塑料盆位置异常' },
  { x: 55, y: 50, w: 15, h: 18, label: 'M-02', confidence: 0.87, appearAt: 8300, clue: '石头质感不合常理' },
  { x: 70, y: 35, w: 18, h: 25, label: 'M-03', confidence: 0.79, appearAt: 12000, clue: '光影方向偏离' },
];

const tabs = [
  { key: 'flow', index: '01', cn: '流程', en: 'Flow' },
  { key: 'semantic', index: '02', cn: '语义链', en: 'Chain' },
  { key: 'experts', index: '03', cn: '专家', en: 'Experts' },
] satisfies Array<{ key: RightTab; index: string; cn: string; en: string }>;

const completedTime = steps.reduce<number[]>((acc, step, index) => {
  acc[index] = (acc[index - 1] ?? 0) + step.duration;
  return acc;
}, []);

const totalDuration = completedTime[completedTime.length - 1] + 400;

function StatusDot({ status }: { status: StepStatus }) {
  if (status === 'done') return <span className={styles.dotDone}>✓</span>;
  if (status === 'active') {
    return (
      <motion.span className={styles.dotActive} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}>
        ⋯
      </motion.span>
    );
  }
  return <span className={styles.dotPending}>○</span>;
}

function StepItem({ index, name, english, status, time }: { index: string; name: string; english: string; status: StepStatus; time?: string }) {
  return (
    <li className={`${styles.step} ${styles[status]}`}>
      <span className={styles.stepIndex}>{index}</span>
      <span className={styles.stepBody}>
        <strong>{name}</strong>
        <em>{english}</em>
        <span className={styles.stepState}>{status === 'done' ? `✓ ${time}` : status === 'active' ? '⋯ 进行中' : '○ 等待'}</span>
      </span>
    </li>
  );
}

function FlowPanel({ elapsed }: { elapsed: number }) {
  const activeStep = completedTime.findIndex((time) => elapsed < time);
  return (
    <motion.div className={styles.panelInner} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.3 }}>
      <header className={styles.panelHeader}>
        <h2>正在显影</h2>
        <p>─ Developing</p>
      </header>
      <ul className={styles.stepList}>
        {steps.map((step, index) => (
          <StepItem
            key={step.name}
            index={String(index + 1).padStart(2, '0')}
            name={step.name}
            english={step.english}
            status={elapsed >= completedTime[index] ? 'done' : index === activeStep ? 'active' : 'pending'}
            time={`${(step.duration / 1000).toFixed(1)}s`}
          />
        ))}
      </ul>
    </motion.div>
  );
}

function ChainStep({ index, cn, en, status, children }: { index: string; cn: string; en: string; status: StepStatus; children: ReactNode }) {
  return (
    <div className={`${styles.chainStep} ${styles[`status${status}`]}`}>
      <header className={styles.chainStepHeader}>
        <span className={styles.chainStepIdx}>{index}</span>
        <span className={styles.chainStepTitles}>
          <strong>{cn}</strong>
          <em>{en}</em>
        </span>
        <StatusDot status={status} />
      </header>
      <div className={styles.chainStepBody}>{children}</div>
    </div>
  );
}

function ChainConnector({ active = false }: { active?: boolean }) {
  return <span className={`${styles.chainConnector} ${active ? styles.chainConnectorActive : ''}`} />;
}

function SceneMatchViz() {
  return (
    <div className={styles.sceneMatch}>
      <div className={styles.sceneCandidates}>
        <span className={styles.sceneTag}>厨房</span>
        {['客厅', '森林', '花园', '天空', '海洋'].map((item) => (
          <span key={item} className={`${styles.sceneTag} ${styles.faded}`}>{item}</span>
        ))}
      </div>
      <div className={styles.sceneResult}>
        <span>命中</span>
        <span>─</span>
        <strong>厨房</strong>
        <em>0.91</em>
      </div>
    </div>
  );
}

function ObjectDetectViz() {
  const objects = [
    { name: '锅', outlier: false },
    { name: '人', outlier: false },
    { name: '青菜', outlier: false },
    { name: '塑料盆', outlier: true },
    { name: '石头', outlier: true },
    { name: '火', outlier: false },
  ];
  return (
    <div className={styles.objectDetect}>
      <div className={styles.objectsRow}>
        {objects.map((item) => (
          <span key={item.name} className={`${styles.objectChip} ${item.outlier ? styles.objectChipOutlier : ''}`}>{item.name}</span>
        ))}
      </div>
      <div className={styles.outlierNote}>
        <span>!</span>
        <strong>2 个语义离群</strong>
      </div>
    </div>
  );
}

function LogicCheckViz() {
  return (
    <div className={styles.logicCheck}>
      <div className={styles.triplesRow}>
        <span>SGG</span>
        <strong>〈塑料盆, 在上方, 火〉</strong>
      </div>
      <div className={styles.triplesRow}>
        <span>SGG</span>
        <strong>〈翻炒, 作用于, 石头〉</strong>
      </div>
      <div className={styles.llmResult}>
        <span>LLM 评分</span>
        <span>─</span>
        <strong>0.90</strong>
        <em>荒谬</em>
      </div>
    </div>
  );
}

function VerdictPreview({ done }: { done: boolean }) {
  return (
    <div className={`${styles.verdictPreview} ${done ? styles.verdictReady : ''}`}>
      {done ? <strong>AI 生成 · 93%</strong> : <span>⋯ 等待证据综合</span>}
    </div>
  );
}

function SemanticChainPanel({ done }: { done: boolean }) {
  return (
    <motion.div className={styles.panelInner} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.3 }}>
      <header className={styles.panelHeader}>
        <h2>语义思维链</h2>
        <p>─ Semantic Chain of Thought</p>
      </header>
      <div className={styles.chainSteps}>
        <ChainStep index="01" cn="全局语义浓缩" en="Scene" status="done"><SceneMatchViz /></ChainStep>
        <ChainConnector active />
        <ChainStep index="02" cn="一致性校验" en="Consistency" status="done"><ObjectDetectViz /></ChainStep>
        <ChainConnector active />
        <ChainStep index="03" cn="逻辑校验" en="Logic" status={done ? 'done' : 'active'}><LogicCheckViz /></ChainStep>
        <ChainConnector active={done} />
        <ChainStep index="04" cn="判决" en="Verdict" status={done ? 'done' : 'pending'}><VerdictPreview done={done} /></ChainStep>
      </div>
    </motion.div>
  );
}

interface Expert {
  cn: string;
  en: string;
  activated: boolean;
  weight: number;
}

function ExpertGroup({ groupName, groupEn, experts }: { groupName: string; groupEn: string; experts: Expert[] }) {
  const max = Math.max(...experts.map((expert) => expert.weight), 0.01);
  return (
    <section className={styles.expertGroup}>
      <header className={styles.expertGroupHeader}>
        <strong>{groupName}</strong>
        <em>{groupEn}</em>
        <span>{experts.filter((expert) => expert.activated).length} / {experts.length}</span>
      </header>
      <ul className={styles.expertList}>
        {experts.map((expert) => (
          <li key={expert.en} className={`${styles.expertItem} ${expert.activated ? styles.expertItemActive : ''}`}>
            <span className={`${styles.expertDot} ${expert.activated ? styles.expertDotOn : ''}`} />
            <span className={styles.expertCn}>{expert.cn}</span>
            {expert.activated ? (
              <>
                <span className={styles.contributionBar}>
                  <motion.span className={styles.contributionFill} initial={{ width: 0 }} animate={{ width: `${(expert.weight / max) * 100}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
                </span>
                <span className={styles.contributionValue}>{Math.round(expert.weight * 100)}%</span>
              </>
            ) : (
              <span className={styles.expertSkipped}>未激活</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function GatingDecision() {
  return (
    <section className={styles.gatingBlock}>
      <header>
        <span>⊞</span>
        <strong>门控决策</strong>
        <em>Gating</em>
      </header>
      <p>自适应激活 <strong>5</strong> 位专家（共 <span>7</span> 位）</p>
      <div className={styles.gatingGrid}>
        {Array.from({ length: 7 }, (_, index) => (
          <span key={index} className={index < 5 ? styles.gatingCellOn : ''} />
        ))}
      </div>
    </section>
  );
}

function FinalVerdict() {
  return (
    <section className={styles.finalVerdict}>
      <div>
        <span>综合判决</span>
        <strong>AI 生成</strong>
      </div>
      <p>─ 93% confidence</p>
    </section>
  );
}

function ExpertRoutingPanel() {
  return (
    <motion.div className={styles.panelInner} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.3 }}>
      <header className={styles.panelHeader}>
        <h2>异构专家协同</h2>
        <p>─ Expert Routing & Contribution</p>
      </header>
      <ExpertGroup
        groupName="通用专家"
        groupEn="General"
        experts={[
          { cn: '空域', en: 'Spatial', activated: true, weight: 0.32 },
          { cn: '频域', en: 'Frequency', activated: true, weight: 0.28 },
          { cn: '风格', en: 'Style', activated: false, weight: 0 },
          { cn: '语义', en: 'Semantic', activated: true, weight: 0.18 },
        ]}
      />
      <ExpertGroup
        groupName="靶向专家"
        groupEn="Targeted"
        experts={[
          { cn: 'SD3', en: 'SD3 LoRA', activated: true, weight: 0.15 },
          { cn: 'FLUX', en: 'FLUX LoRA', activated: false, weight: 0 },
          { cn: 'DALL-E', en: 'DALL-E LoRA', activated: true, weight: 0.07 },
        ]}
      />
      <GatingDecision />
      <FinalVerdict />
    </motion.div>
  );
}

function TabBar({ activeTab, onTabChange }: { activeTab: RightTab; onTabChange: (tab: RightTab) => void }) {
  return (
    <div className={styles.tabBar}>
      {tabs.map((tab) => (
        <button key={tab.key} className={`${styles.tabBtn} ${activeTab === tab.key ? styles.tabBtnActive : ''}`} type="button" onClick={() => onTabChange(tab.key)}>
          <span>{tab.index}</span>
          <strong>{tab.cn}</strong>
          <em>{tab.en}</em>
        </button>
      ))}
    </div>
  );
}

function DetectRight({ state, elapsed }: { state: ProcessState; elapsed: number }) {
  const [activeTab, setActiveTab] = useState<RightTab>('flow');

  useEffect(() => {
    if (state === 'idle') return undefined;
    if (state === 'done') {
      window.setTimeout(() => setActiveTab('experts'), 400);
      return undefined;
    }
    const cycle: RightTab[] = ['flow', 'semantic', 'experts'];
    const interval = window.setInterval(() => {
      setActiveTab((previous) => cycle[(cycle.indexOf(previous) + 1) % cycle.length]);
    }, 6000);
    return () => window.clearInterval(interval);
  }, [state]);

  return (
    <aside className={styles.rightPanel}>
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className={styles.tabContent}>
        <AnimatePresence mode="wait">
          {activeTab === 'flow' ? <FlowPanel key="flow" elapsed={elapsed} /> : null}
          {activeTab === 'semantic' ? <SemanticChainPanel key="semantic" done={state === 'done'} /> : null}
          {activeTab === 'experts' ? <ExpertRoutingPanel key="experts" /> : null}
        </AnimatePresence>
      </div>
    </aside>
  );
}

export function DetectImage() {
  const [state, setState] = useState<ProcessState>('idle');
  const [imageSrc, setImageSrc] = useState(demoImage);
  const [elapsed, setElapsed] = useState(0);
  const [activeMark, setActiveMark] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const startProcessing = (src = demoImage) => {
    setImageSrc(src);
    setElapsed(0);
    setActiveMark(null);
    setState('processing');
  };

  useEffect(() => {
    if (state !== 'processing') return undefined;
    const startedAt = Date.now();
    const interval = window.setInterval(() => setElapsed(Date.now() - startedAt), 100);
    const doneTimer = window.setTimeout(() => setState('done'), totalDuration);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(doneTimer);
    };
  }, [state]);

  const visibleMarks = marks.filter((mark) => elapsed >= mark.appearAt || state === 'done');
  const visibleEvidences = evidences.filter((evidence) => elapsed >= evidence.appearAt || state === 'done');

  const handleFile = (file?: File) => {
    if (!file) return;
    startProcessing(URL.createObjectURL(file));
  };

  return (
    <main className={styles.detectPage}>
      <UserTopbar title="图片鉴别" english="IMAGE" />
      {state === 'idle' ? (
        <section className={styles.idle}>
          <button
            className={styles.dropzone}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              handleFile(event.dataTransfer.files[0]);
            }}
            type="button"
          >
            <span>拖入或点击选择一张图片</span>
            <em>─ Drop your image to begin ─</em>
            <strong>支持 JPG · PNG · WebP</strong>
          </button>
          <input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => handleFile(event.target.files?.[0])} />
          <Button variant="text" prefix="─" suffix="→" onClick={() => startProcessing(demoImage)}>使用示例图</Button>
        </section>
      ) : (
        <section className={styles.detectMain}>
          <div className={styles.detectLeft}>
            <div className={styles.imagePanel}>
              <div className={styles.imageWrap}>
                <img src={imageSrc} alt="" />
                <AnimatePresence>
                  {visibleMarks.map((mark) => (
                    <ForensicMark key={mark.label} {...mark} active={activeMark === mark.label} />
                  ))}
                </AnimatePresence>
                {state === 'done' ? <span className={styles.imageBadge}>FAKE</span> : null}
              </div>
            </div>
            <div className={styles.evidenceBar}>
              <h2>已发现的线索</h2>
              <div>
                {evidences.map((evidence) => {
                  const visible = visibleEvidences.includes(evidence);
                  return (
                    <motion.span key={evidence.name} className={visible ? styles.evidenceVisible : ''} initial={false} animate={visible ? { x: 0, opacity: 1 } : { x: 16, opacity: 0.45 }}>
                      {visible ? '●' : '○'} {evidence.name}
                    </motion.span>
                  );
                })}
              </div>
            </div>
            {state === 'done' ? (
              <div className={styles.doneActions}>
                {marks.map((mark) => (
                  <button key={mark.label} type="button" onMouseEnter={() => setActiveMark(mark.label)} onMouseLeave={() => setActiveMark(null)}>
                    {mark.label} · {mark.clue}
                  </button>
                ))}
                <Link to="/detect/report/demo">─ 查看完整报告 →</Link>
              </div>
            ) : null}
          </div>
          <DetectRight state={state} elapsed={elapsed} />
        </section>
      )}
    </main>
  );
}
