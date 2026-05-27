import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageContainer } from '@/components/primitives';
import { UserTopbar } from '@/components/UserTopbar/UserTopbar';
import { VerdictCard } from '@/components/VerdictCard/VerdictCard';
import { videoDemoFull } from '@/data/mocks';
import styles from './DetectVideo.module.css';

const scanDuration = 7800;
const stepEnds = [1500, 2300, 5500, 6700, 7500];
const windowDelays = [1600, 1700, 1800, 1900, 2000, 2100];
const candidateDelays = [2700, 3000, 3500, 4000, 4400, 4700, 5100];
const rangeDelays = [6000, 6300];
const evidenceDelays = [6800, 7100];

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

function StepItem({
  index,
  name,
  english,
  status,
  time,
  children,
}: {
  index: string;
  name: string;
  english: string;
  status: 'done' | 'active' | 'pending';
  time?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`${styles.stepItem} ${styles[status]}`}>
      <span className={styles.stepIndex}>{index}</span>
      <div>
        <strong>{name}</strong>
        <em>{english}</em>
        <span className={styles.stepState}>{status === 'done' ? `✓ ${time}` : status === 'active' ? '⋯ 进行中' : '○'}</span>
        {children}
      </div>
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
  return (
    <motion.article
      className={`${styles.fragmentCard} ${active ? styles.fragmentCardActive : ''}`}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className={styles.fragmentLeft}>
        <span className={styles.fragmentIndex}>E-{String(index + 1).padStart(2, '0')}</span>
        <div className={styles.fragmentTime}>
          <span>{formatTime(range.start)}</span>
          <span className={styles.fragmentDash}>─</span>
          <span>{formatTime(range.end)}</span>
        </div>
        <p className={styles.fragmentDuration}>{(range.end - range.start).toFixed(1)}s</p>
      </div>

      <div className={styles.fragmentKeyframes}>
        <p className={styles.keyframesLabel}>关键证据帧</p>
        <div className={styles.keyframesRow}>
          {range.keyframes.map((src, frameIndex) => (
            <div key={src} className={styles.keyframeBox}>
              <img src={src} alt="" />
              <span className={styles.keyframeIdx}>K-{frameIndex + 1}</span>
            </div>
          ))}
        </div>
      </div>

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
                  <span className={styles.metaValue}>VIDEO · 30s · 1280×720</span>
                </div>
                <div className={styles.videoMetaRight}>
                  <span className={styles.metaPhase}>{phaseLabel(elapsed, done)}</span>
                </div>
              </div>
              <div className={styles.videoFrame}>
                <video
                  ref={videoRef}
                  src={videoDemoFull.src}
                  poster="/samples/09.jpg"
                  muted
                  loop
                  playsInline
                  onCanPlay={() => setVideoReady(true)}
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
                        <span>SYNC WARNING: MANIPULATION DETECTED</span>
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
                  {[0, 8, 16, 24, 30].map((tick) => <span key={tick}>{formatTime(tick)}</span>)}
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
                      在这段 30 秒的视频中，共发现 <span className={styles.summaryNum}>{videoDemoFull.fakeRanges.length}</span> 个高风险伪造时段，
                      总占比约 <span className={styles.summaryNum}>{fakePercent}%</span>。多位专家在这些时段达成共识，建议判定为 AI 生成内容。
                    </p>
                  </div>
                  <div className={styles.verdictActions}>
                    <Link className={styles.primaryBtn} to="/detect/report/video-demo">
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
              <div className={styles.steps}>
                {steps.map((step, index) => (
                  <StepItem
                    key={step.name}
                    index={String(index + 1).padStart(2, '0')}
                    name={step.name}
                    english={step.english}
                    status={done || elapsed >= stepEnds[index] ? 'done' : index === activeStep ? 'active' : 'pending'}
                    time={`${(step.duration / 1000).toFixed(1)}s`}
                  >
                    {index === 2 ? (
                      <div className={styles.stepSubProgress}>
                        <div className={styles.windowsProgress}>
                          {videoDemoFull.windows.map((_, dotIndex) => (
                            <span key={dotIndex} className={`${styles.windowDot} ${dotIndex < analyzedWindowCount ? styles.windowDotDone : ''}`} />
                          ))}
                        </div>
                        <span className={styles.windowsProgressText}>{analyzedWindowCount}/6 窗口</span>
                      </div>
                    ) : null}
                  </StepItem>
                ))}
              </div>
            </aside>

            <div className={styles.evidencePane}>
              <header className={styles.panelHeader}>
                <h2>片段级证据</h2>
                <p>EVIDENCE</p>
              </header>
              <div className={styles.fragmentList}>
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
