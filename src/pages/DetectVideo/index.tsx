import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { PageContainer } from '@/components/primitives';
import { UserTopbar } from '@/components/UserTopbar/UserTopbar';
import { VerdictCard } from '@/components/VerdictCard/VerdictCard';
import { videoDemoFull } from '@/data/mocks';
import { saveVideoReport } from '@/data/reportStore';
import styles from './DetectVideo.module.css';

const scanDuration = 7800;
const stepEnds = [1500, 2300, 5500, 6700, 7500];
const windowDelays = [1600, 1700, 1800, 1900, 2000, 2100];
const candidateDelays = [2700, 3000, 3500, 4000, 4400, 4700, 5100];
// 新视频只有 1 段伪造区间
const rangeDelays = [6000];
const evidenceDelays = [6800];

// 波形可视化：32 根柱，对应 fake_seg1s__ 的音频谱纹数据
// 真实段 bars 0-4 & bars 15-31（低振幅）；伪造段 bars 5-14（高振幅+异常）
const WAVEFORM_BARS = 32;
const FAKE_BAR_START = Math.floor(1.837 / (videoDemoFull.duration / WAVEFORM_BARS)); // ≈ 5
const FAKE_BAR_END   = Math.ceil(5.277  / (videoDemoFull.duration / WAVEFORM_BARS)); // ≈ 14

type ExpertVote = (typeof videoDemoFull.fakeRanges)[number]['expertVotes'][number];

function formatTime(seconds: number) {
  return `0:${String(Math.floor(seconds)).padStart(2, '0')}`;
}

function phaseLabel(elapsed: number, done: boolean) {
  if (done) return 'COMPLETE';
  if (elapsed < 1500) return 'READING';
  if (elapsed < 2300) return 'WINDOWING';
  if (elapsed < 5500) return 'EXPERT REVIEW';
  if (elapsed < 6700) return 'FILTERING';
  return 'AGGREGATING';
}

// ─── 流程节点卡（替换原 StepItem）────────────────────────
function FlowNode({
  index,
  name,
  english,
  status,
  time,
  children,
  isLast,
}: {
  index: string;
  name: string;
  english: string;
  status: 'done' | 'active' | 'pending';
  time?: string;
  children?: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <div className={styles.flowNodeGroup}>
      {/* 节点卡本体 */}
      <div className={`${styles.flowNode} ${styles[`flow_${status}`]}`}>
        {/* 左侧状态圆 */}
        <span className={`${styles.flowDot} ${styles[`flowDot_${status}`]}`}>
          {status === 'done' && (
            <svg viewBox="0 0 10 10" className={styles.flowCheck}>
              <polyline points="1.5,5 4,7.5 8.5,2.5" />
            </svg>
          )}
          {status === 'active' && <span className={styles.flowPulse} />}
        </span>

        {/* 右侧文字区 */}
        <div className={styles.flowContent}>
          <div className={styles.flowHead}>
            <span className={styles.flowIndex}>{index}</span>
            <strong className={styles.flowName}>{name}</strong>
            <span className={styles.flowEn}>{english}</span>
          </div>

          {/* 状态行 */}
          <div className={styles.flowStatus}>
            {status === 'done' && (
              <span className={styles.flowStatusDone}>✓ {time}</span>
            )}
            {status === 'active' && (
              <span className={styles.flowStatusActive}>
                <span className={styles.flowBlink}>▌</span> 进行中
              </span>
            )}
            {status === 'pending' && (
              <span className={styles.flowStatusPending}>待处理</span>
            )}
          </div>

          {children}
        </div>
      </div>

      {/* 节点间箭头连接线（最后节点无） */}
      {!isLast && (
        <div className={styles.flowArrow}>
          <svg viewBox="0 0 16 28" className={styles.flowArrowSvg} aria-hidden="true">
            <line
              x1="8" y1="0" x2="8" y2="20"
              className={`${styles.flowArrowLine} ${status === 'done' ? styles.flowArrowLineDone : ''}`}
              strokeDasharray={status === 'pending' ? '3 3' : 'none'}
            />
            {status === 'done' && (
              <path d="M4,17 L8,24 L12,17" className={styles.flowArrowHead} />
            )}
          </svg>
        </div>
      )}
    </div>
  );
}

function ExpertVoteIndicator({ vote }: { vote: ExpertVote }) {
  const symbols = {
    texture: '◢',
    frequency: '◉',
    style: '〜',
    semantic: '⋆',
    lora: '⬡',
  };

  return (
    <div className={styles.voteIndicator} style={{ opacity: 0.3 + vote.intensity * 0.7 }} title={vote.name}>
      <span className={styles.voteSymbol}>{symbols[vote.type]}</span>
    </div>
  );
}

function FragmentEvidenceCard({
  index,
  range,
  active,
  onHover,
}: {
  index: number;
  range: (typeof videoDemoFull.fakeRanges)[number];
  active: boolean;
  onHover: (hovered: boolean) => void;
}) {
  // ─ 转录高亮：切分 fake words ─
  const { fullTranscript: transcript, fakeWords } = range;
  const fakeIdx = transcript.indexOf(fakeWords);
  const transcriptParts = fakeIdx >= 0 ? [
    { text: transcript.slice(0, fakeIdx),                 isFake: false },
    { text: fakeWords,                                     isFake: true  },
    { text: transcript.slice(fakeIdx + fakeWords.length), isFake: false },
  ] : [{ text: transcript, isFake: false }];

  return (
    <motion.article
      className={`${styles.fragmentCard} ${active ? styles.fragmentCardActive : ''}`}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* ── 头部：时间段 + 修改类型徽章 ── */}
      <div className={styles.fragmentLeft}>
        <span className={styles.fragmentIndex}>E-{String(index + 1).padStart(2, '0')}</span>
        <div className={styles.fragmentTime}>
          <span>{formatTime(range.start)}</span>
          <span className={styles.fragmentDash}>─</span>
          <span>{formatTime(range.end)}</span>
        </div>
        <p className={styles.fragmentDuration}>{(range.end - range.start).toFixed(1)}s</p>
        <span className={styles.modifyTypeBadge}>⧐ {range.modifyType.toUpperCase()}</span>
      </div>

      {/* ── 转录高亮面板 ── */}
      <div className={styles.transcriptPanel}>
        <div className={styles.transcriptPanelHeader}>
          <span className={styles.transcriptLabel}>全文转录 ─ TRANSCRIPT</span>
          <span className={styles.transcriptLang}>EN</span>
        </div>
        <p className={styles.transcriptText}>
          {transcriptParts.map((part, i) =>
            part.isFake ? (
              <mark key={i} className={styles.transcriptFake}>
                <span className={styles.transcriptFakeTag}>FAKE</span>
                {part.text}
              </mark>
            ) : (
              <span key={i} className={styles.transcriptNormal}>{part.text}</span>
            )
          )}
        </p>
        <div className={styles.transcriptFooter}>
          <span className={styles.transcriptNote}>
            ⚠ 替换片段：&ldquo;{fakeWords}&rdquo;
          </span>
        </div>
      </div>

      {/* ── 谱纹异常波形可视化 ── */}
      <div className={styles.waveformPanel}>
        <div className={styles.waveformHeader}>
          <span className={styles.waveformLabel}>谱纹分析 ─ SPECTRUM</span>
          <span className={styles.waveformBadge}>FREQ ANOMALY</span>
        </div>
        <div className={styles.waveformBars} role="img" aria-label="音频谱纹波形，红色段为伪造区间">
          {Array.from({ length: WAVEFORM_BARS }, (_, i) => {
            const isFake = i >= FAKE_BAR_START && i < FAKE_BAR_END;
            const seed = (i * 7 + 11) % 13;
            const height = isFake ? 55 + (seed * 30) / 13 : 14 + (seed * 26) / 13;
            return (
              <div
                key={i}
                className={`${styles.waveformBar} ${isFake ? styles.waveformBarFake : styles.waveformBarReal}`}
                style={{ height: `${Math.round(height)}%` }}
              />
            );
          })}
        </div>
        <div className={styles.waveformScale}>
          <span>0:00</span>
          <span className={styles.waveformScaleFake}>
            {formatTime(range.start)} ─ {formatTime(range.end)}
          </span>
          <span>{formatTime(videoDemoFull.duration)}</span>
        </div>
      </div>

      {/* ── 底部：判断原因 + 专家共识 + 置信度 ── */}
      <div className={styles.fragmentRight}>
        <p className={styles.fragmentReason}>
          <span className={styles.reasonDash}>─</span>
          {range.reason}
        </p>
        <div className={styles.expertVotes}>
          <p className={styles.votesLabel}>专家共识</p>
          <div className={styles.votesRow}>
            {range.expertVotes.map((vote) => (
              <ExpertVoteIndicator key={vote.type} vote={vote} />
            ))}
          </div>
        </div>
        <p className={styles.fragmentConfidence}>
          置信度 <span className={styles.confValue}>{Math.round(range.confidence * 100)}%</span>
        </p>
      </div>
    </motion.article>
  );
}

export function DetectVideo() {
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [activeRange, setActiveRange] = useState<number | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const next = Date.now() - startedAt;
      setElapsed(Math.min(next, scanDuration));
      if (next >= scanDuration) {
        setDone(true);
        window.clearInterval(timer);
      }
    }, 80);
    return () => window.clearInterval(timer);
  }, []);

  const scanTime = done ? videoDemoFull.duration : Math.min((elapsed / scanDuration) * videoDemoFull.duration, videoDemoFull.duration);
  const currentWindow = videoDemoFull.windows.findIndex((window) => scanTime >= window.start && scanTime < window.end);
  const analyzedWindowCount = done ? videoDemoFull.windows.length : windowDelays.filter((delay) => elapsed >= delay + 450).length;
  const visibleCandidates = videoDemoFull.candidates.filter((_, index) => done || elapsed >= candidateDelays[index]);
  const revealedRanges = videoDemoFull.fakeRanges.filter((_, index) => done || elapsed >= rangeDelays[index]);
  const visibleEvidence = videoDemoFull.fakeRanges.filter((_, index) => done || elapsed >= evidenceDelays[index]);
  const activeStep = stepEnds.findIndex((end) => elapsed < end);
  const fakeSeconds = videoDemoFull.fakeRanges.reduce((sum, range) => sum + range.end - range.start, 0);
  const fakePercent = Math.round((fakeSeconds / videoDemoFull.duration) * 100);
  
  const isWarning = revealedRanges.some((range) => currentTime >= range.start && currentTime <= range.end);

  const steps = useMemo(
    () => [
      { name: '视频结构分析', english: 'Video structure parsing', duration: 1500 },
      { name: '时间窗口切分', english: 'Temporal windowing', duration: 800 },
      { name: '多专家协同评议', english: 'Expert consensus', duration: 3200 },
      { name: '候选时段筛选', english: 'Candidate filtering', duration: 1200 },
      { name: '证据综合', english: 'Evidence aggregation', duration: 800 },
    ],
    [],
  );

  return (
    <main className={styles.page}>
      <UserTopbar title="视频检测台" english="VIDEO FORENSICS" />
      <PageContainer width="wide" className={styles.pageContainerCustom}>
        <section className={styles.body}>
          <div className={styles.leftCol}>
            <section className={styles.videoSection}>
              <div className={styles.videoMetaBar}>
                <div className={styles.videoMetaLeft}>
                  <span className={styles.metaLabel}>送检材料</span>
                  <span className={styles.metaDash}>─</span>
                  <span className={styles.metaValue}>AUDIO/VIDEO · 11.7s · 30fps · FAKE_SEG1S</span>
                </div>
                <div className={styles.videoMetaRight}>
                  <span className={styles.metaPhase}>{phaseLabel(elapsed, done)}</span>
                </div>
              </div>
              <div className={styles.videoFrame}>
                <video
                  ref={videoRef}
                  src={videoDemoFull.src}
                  poster="/samples/frames/frame-01.jpg"
                  muted
                  loop
                  playsInline
                  autoPlay
                  onCanPlay={() => {
                    setVideoReady(true);
                    videoRef.current?.play().catch(() => {});
                  }}
                  onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                />
                {!videoReady ? (
                  <div className={styles.videoLoadingState}>
                    <div className={styles.videoLoadingPulse} />
                    <p className={styles.videoLoadingText}>─ Loading the material</p>
                  </div>
                ) : null}
                {videoReady && (
                  <div className={`${styles.hudOverlay} ${isWarning ? styles.hudWarningActive : ''}`}>
                    {isWarning && (
                      <div className={styles.warningAlert}>
                        <span className={styles.warningIcon}>!</span>
                        <span>AUDIO ANOMALY · VOICE REPLACEMENT DETECTED</span>
                      </div>
                    )}
                    <div className={styles.hudCornerTopLeft} />
                    <div className={styles.hudCornerTopRight} />
                    <div className={styles.hudCornerBottomLeft} />
                    <div className={styles.hudCornerBottomRight} />
                    <div className={styles.hudCrosshair} />
                  </div>
                )}
              </div>
            </section>

            <section className={styles.timelineSection}>
              <h2 className="section-mark">时间结构</h2>
              <div className={styles.windowsBar}>
                {videoDemoFull.windows.map((window, index) => {
                  const visible = done || elapsed >= windowDelays[index];
                  const analyzed = done || index < analyzedWindowCount;
                  return (
                    <div
                      key={`${window.start}-${window.end}`}
                      className={`${styles.windowBlock} ${analyzed ? styles.windowDone : ''} ${index === currentWindow && !done ? styles.windowActive : ''}`}
                      style={{
                        left: `${(window.start / videoDemoFull.duration) * 100}%`,
                        width: `${((window.end - window.start) / videoDemoFull.duration) * 100}%`,
                        opacity: visible ? 1 : 0,
                      }}
                    >
                      <span className={styles.windowLabel}>W-{String(index + 1).padStart(2, '0')}</span>
                    </div>
                  );
                })}
              </div>

              <div className={styles.keyframeStrip}>
                {videoDemoFull.frames.map((frame) => {
                  const inActiveWindow = currentWindow >= 0 && frame.time >= videoDemoFull.windows[currentWindow].start && frame.time <= videoDemoFull.windows[currentWindow].end;
                  const inFakeRange = revealedRanges.some((range) => frame.time >= range.start && frame.time <= range.end);
                  return (
                    <div
                      key={`${frame.src}-${frame.time}`}
                      className={`${styles.frameThumb} ${inActiveWindow && !done ? styles.beingScanned : ''} ${inFakeRange ? styles.frameFlagged : ''}`}
                    >
                      <img src={frame.src} alt="" loading="eager" />
                    </div>
                  );
                })}
              </div>

              <div className={styles.timelineContainer}>
                <div className={styles.ticks}>
                  {[0, 3, 6, 9, 12].map((tick) => <span key={tick}>{formatTime(tick)}</span>)}
                </div>
                <div className={styles.timelineMain}>
                  {revealedRanges.map((range, index) => (
                    <button
                      key={`${range.start}-${range.end}`}
                      type="button"
                      className={`${styles.fakeRange} ${activeRange === index ? styles.fakeRangeActive : ''}`}
                      style={{
                        left: `${(range.start / videoDemoFull.duration) * 100}%`,
                        width: `${((range.end - range.start) / videoDemoFull.duration) * 100}%`,
                      }}
                      onMouseEnter={() => {
                        setActiveRange(index);
                        videoRef.current?.pause();
                        if (videoRef.current) videoRef.current.currentTime = range.start;
                      }}
                      onMouseLeave={() => setActiveRange(null)}
                    >
                      <span className={styles.rangeTag}>{(range.end - range.start).toFixed(1)}s</span>
                    </button>
                  ))}
                  {!done ? <span className={styles.cursor} style={{ left: `${Math.min(scanTime / videoDemoFull.duration, 1) * 100}%` }} /> : null}
                </div>
                <div className={styles.candidateLayer}>
                  {visibleCandidates.map((candidate) => {
                    const level = candidate.confidence > 0.7 ? 'high' : candidate.confidence > 0.4 ? 'mid' : 'low';
                    const filtered = elapsed >= 5800 && candidate.confidence < 0.7 && !done;
                    return (
                      <span
                        key={candidate.id}
                        className={`${styles.candidate} ${styles[level]} ${filtered ? styles.candidateFiltered : ''}`}
                        style={{
                          left: `${(candidate.start / videoDemoFull.duration) * 100}%`,
                          width: `${((candidate.end - candidate.start) / videoDemoFull.duration) * 100}%`,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </section>

            {done ? (
              <motion.section
                className={styles.verdictSection}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
              >
                <div className={styles.verdictDivider}>
                  <span className={styles.dividerLine} />
                  <span className={styles.dividerText}>综合结论</span>
                  <span className={styles.dividerLine} />
                </div>
                <div className={styles.verdictGrid}>
                  <VerdictCard verdict={videoDemoFull.verdict} confidence={videoDemoFull.confidence} />
                  <div className={styles.verdictSummary}>
                    <p className={styles.summaryLabel}>
                      <span className={styles.summaryDash}>─</span>
                      <span>系统判断</span>
                    </p>
                    <p className={styles.summaryText}>
                      在这段 <span className={styles.summaryNum}>{videoDemoFull.duration.toFixed(1)}</span> 秒的视频中，
                      共发现 <span className={styles.summaryNum}>{videoDemoFull.fakeRanges.length}</span> 个高风险音频篡改时段，
                      占比约 <span className={styles.summaryNum}>{fakePercent}%</span>。
                      谱纹专家与靶向专家于该时段达成最高共识，检出音频内容克隆替换特征，建议判定为 AI 合成内容。
                    </p>
                  </div>
                  <div className={styles.verdictActions}>
                    <Link className={styles.primaryBtn} to="/detect/report/video-demo" onClick={() => saveVideoReport()}>
                      <span>查看完整报告</span>
                      <span className={styles.btnArrow}>→</span>
                    </Link>
                    <button className={styles.secondaryBtn} type="button">导出鉴定结果</button>
                  </div>
                </div>
              </motion.section>
            ) : null}
          </div>

          <div className={styles.rightCol}>
            <aside className={styles.progressPane}>
              <header className={styles.panelHeader}>
                <h2>{done ? '显影完成' : '正在显影'}</h2>
                <p>{done ? 'COMPLETE' : 'DEVELOPING'}</p>
              </header>

              {/* 流程节点图 */}
              <div className={styles.flowGraph}>
                {steps.map((step, index) => {
                  const stepStatus = done || elapsed >= stepEnds[index]
                    ? 'done'
                    : index === activeStep
                    ? 'active'
                    : 'pending';
                  return (
                    <FlowNode
                      key={step.name}
                      index={String(index + 1).padStart(2, '0')}
                      name={step.name}
                      english={step.english}
                      status={stepStatus}
                      time={`${(step.duration / 1000).toFixed(1)}s`}
                      isLast={index === steps.length - 1}
                    >
                      {/* 步骤 03：多专家协同 — 显示窗口进度点 */}
                      {index === 2 && (
                        <div className={styles.stepSubProgress}>
                          <div className={styles.windowsProgress}>
                            {videoDemoFull.windows.map((_, dotIndex) => (
                              <span
                                key={dotIndex}
                                className={`${styles.windowDot} ${dotIndex < analyzedWindowCount ? styles.windowDotDone : ''}`}
                              />
                            ))}
                          </div>
                          <span className={styles.windowsProgressText}>
                            {analyzedWindowCount}/{videoDemoFull.windows.length} 窗口
                          </span>
                        </div>
                      )}

                      {/* 步骤 04：候选筛选 — 显示淘汰数量 */}
                      {index === 3 && stepStatus !== 'pending' && (
                        <div className={styles.filterSummary}>
                          <span className={styles.filterKept}>↑ 保留 {revealedRanges.length} 段</span>
                          <span className={styles.filterDropped}>
                            ↓ 淘汰 {visibleCandidates.length - revealedRanges.length} 段
                          </span>
                        </div>
                      )}
                    </FlowNode>
                  );
                })}
              </div>
            </aside>

            <div className={styles.evidencePane}>
              <header className={styles.panelHeader}>
                <h2>片段级证据</h2>
                <p>EVIDENCE</p>
              </header>
              <div className={styles.fragmentList}>
                <AnimatePresence>
                  {visibleEvidence.map((range, index) => (
                    <FragmentEvidenceCard
                      key={`${range.start}-${range.end}`}
                      index={index}
                      range={range}
                      active={activeRange === index}
                      onHover={(hovered) => {
                        setActiveRange(hovered ? index : null);
                        if (hovered && videoRef.current) videoRef.current.currentTime = range.start;
                      }}
                    />
                  ))}
                </AnimatePresence>
                {visibleEvidence.length === 0 ? (
                  <div className={styles.evidencePlaceholder}>
                    <p>候选片段正在生成</p>
                    <span>证据卡将在筛选后显影</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </PageContainer>
    </main>
  );
}
