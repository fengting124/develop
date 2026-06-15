import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import styles from './VideoShowcase.module.css';

type VersionKey = 'real' | 'fake_seg1s' | 'fake_seg1l' | 'fake_seg2';

interface FakeSegment {
  start: number;
  end: number;
  replaceText: string;
  idx: number;
}

interface Word {
  text: string;
  start: number;
  end: number;
  replaced?: boolean;
}

interface FrameItem {
  time: number;
  src: string;
}

interface ShowcaseData {
  key: VersionKey;
  label: string;
  cn: string;
  desc: string;
  jsonFile: string;
  src: string;
  duration: number;
  transcript: string;
  segments: FakeSegment[];
  realWords: Word[];
  fakeWords: Word[];
  realFrames: FrameItem[];
  fakeFrames: FrameItem[];
  realWaveform: number[];
  fakeWaveform: number[];
  lipKeyframes: FrameItem[];
}

const FRAME_COUNT = 18;
const WAVEFORM_COUNT = 120;

const realWords: Word[] = [
  { text: 'And', start: 0, end: 0.5 },
  { text: 'in', start: 0.5, end: 0.8 },
  { text: 'my', start: 0.8, end: 1.2 },
  { text: 'head', start: 1.2, end: 1.8 },
  { text: 'I', start: 4.5, end: 4.8 },
  { text: 'paint', start: 4.8, end: 6 },
  { text: 'a', start: 6, end: 6.3 },
  { text: 'picture', start: 6.3, end: 8.8 },
];

const fakeWords = {
  real: realWords,
  fake_seg1s: [
    { text: 'And', start: 0, end: 0.5 },
    { text: 'with', start: 1.796, end: 2.6, replaced: true },
    { text: 'my', start: 2.6, end: 3.1, replaced: true },
    { text: 'hands', start: 3.1, end: 4.4, replaced: true },
    { text: 'I', start: 4.5, end: 4.8 },
    { text: 'paint', start: 4.8, end: 6 },
    { text: 'a', start: 6, end: 6.3 },
    { text: 'picture', start: 6.3, end: 8.836 },
  ],
  fake_seg1l: [
    { text: 'But', start: 0.071, end: 0.6, replaced: true },
    { text: 'with', start: 0.6, end: 1.2, replaced: true },
    { text: 'my', start: 1.2, end: 1.7, replaced: true },
    { text: 'hands', start: 1.7, end: 2.7, replaced: true },
    { text: 'I', start: 2.7, end: 3.1, replaced: true },
    { text: 'sculpt', start: 3.1, end: 5.7, replaced: true },
    { text: 'a', start: 5.7, end: 6, replaced: true },
    { text: 'statue', start: 6, end: 9.671, replaced: true },
  ],
  fake_seg2: [
    { text: 'And', start: 0, end: 0.5 },
    { text: 'through', start: 1.796, end: 3, replaced: true },
    { text: 'my', start: 3, end: 3.6, replaced: true },
    { text: 'hands', start: 3.6, end: 5.1, replaced: true },
    { text: 'I', start: 5.1, end: 5.6, replaced: true },
    { text: 'sculpt', start: 5.6, end: 8.2, replaced: true },
    { text: 'a', start: 8.2, end: 10.516, replaced: true },
    { text: 'form', start: 11.9, end: 12.78, replaced: true },
  ],
} satisfies Record<VersionKey, Word[]>;

const versionMeta = [
  { key: 'real', label: 'REAL', cn: '原始', desc: '未经处理', segments: 0, duration: 13.289 },
  { key: 'fake_seg1s', label: '1-SHORT', cn: '单段·短', desc: '替换 7.04s', segments: 1, duration: 11.552 },
  { key: 'fake_seg1l', label: '1-LONG', cn: '单段·长', desc: '替换 9.60s', segments: 1, duration: 10.18 },
  { key: 'fake_seg2', label: '2-SEGMENTS', cn: '双段', desc: '8.72s + 0.88s', segments: 2, duration: 13.289 },
] as const;

const versionSegments: Record<VersionKey, FakeSegment[]> = {
  real: [],
  fake_seg1s: [{ start: 1.796, end: 8.836, replaceText: 'with my hands', idx: 0 }],
  fake_seg1l: [{ start: 0.071, end: 9.671, replaceText: 'But with my hands I sculpt a statue', idx: 0 }],
  fake_seg2: [
    { start: 1.796, end: 10.516, replaceText: 'through my hands / sculpt', idx: 0 },
    { start: 11.9, end: 12.78, replaceText: 'a form', idx: 1 },
  ],
};

const transcripts: Record<VersionKey, string> = {
  real: 'And in my head I paint a picture',
  fake_seg1s: 'And with my hands I paint a picture',
  fake_seg1l: 'But with my hands I sculpt a statue',
  fake_seg2: 'And through my hands I sculpt a form',
};

function generateWaveform(length: number, seed: number) {
  return Array.from({ length }, (_, index) => {
    const noise = Math.sin((index + 1) * seed * 12.9898) * 43758.5453;
    const rand = noise - Math.floor(noise);
    const envelope = Math.sin((index / length) * Math.PI);
    return Math.max(0.12, (0.28 + rand * 0.62) * envelope);
  });
}

function framePath(version: VersionKey, index: number) {
  return `/images/workflow-editor/${version}/frame-${String(index + 1).padStart(2, '0')}.jpg`;
}

function generateFrames(version: VersionKey, duration: number) {
  return Array.from({ length: FRAME_COUNT }, (_, index) => ({
    time: (index / (FRAME_COUNT - 1)) * duration,
    src: framePath(version, index),
  }));
}

function buildData(key: VersionKey): ShowcaseData {
  const meta = versionMeta.find((item) => item.key === key)!;
  const realDuration = versionMeta[0].duration;
  return {
    key,
    label: meta.label,
    cn: meta.cn,
    desc: meta.desc,
    jsonFile: `${key}.json`,
    src: `/videos/workflow/${key}.mp4`,
    duration: meta.duration,
    transcript: transcripts[key],
    segments: versionSegments[key],
    realWords,
    fakeWords: fakeWords[key],
    realFrames: generateFrames('real', realDuration),
    fakeFrames: generateFrames(key, meta.duration),
    realWaveform: generateWaveform(WAVEFORM_COUNT, 1),
    fakeWaveform: generateWaveform(WAVEFORM_COUNT, key === 'real' ? 1 : versionMeta.findIndex((item) => item.key === key) + 2),
    lipKeyframes: versionSegments[key].flatMap((segment) => [
      { time: segment.start + (segment.end - segment.start) * 0.22, src: framePath(key, Math.min(FRAME_COUNT - 1, Math.max(0, Math.floor((segment.start / meta.duration) * FRAME_COUNT)))) },
      { time: segment.start + (segment.end - segment.start) * 0.54, src: framePath(key, Math.min(FRAME_COUNT - 1, Math.max(0, Math.floor(((segment.start + segment.end) / 2 / meta.duration) * FRAME_COUNT)))) },
      { time: segment.start + (segment.end - segment.start) * 0.82, src: framePath(key, Math.min(FRAME_COUNT - 1, Math.max(0, Math.floor((segment.end / meta.duration) * FRAME_COUNT)))) },
    ]),
  };
}

function formatTime(value: number) {
  return `${value.toFixed(1)}s`;
}

function useScanController(duration: number) {
  const [scanTime, setScanTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return undefined;
    let rafId = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;
      setScanTime((value) => {
        const next = value + delta;
        return next >= duration ? 0 : next;
      });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [duration, isPlaying]);

  return {
    scanTime,
    isPlaying,
    togglePlay: () => setIsPlaying((value) => !value),
    seek: setScanTime,
  };
}

function isInSegment(time: number, segments: FakeSegment[]) {
  return segments.some((segment) => time >= segment.start && time <= segment.end);
}

function activeSegment(scanTime: number, segments: FakeSegment[]) {
  return segments.find((segment) => scanTime >= segment.start && scanTime <= segment.end);
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 5h3v14H7zM14 5h3v14h-3z" />
    </svg>
  );
}

function RewindIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11 6 4 12l7 6v-5l7 5V6l-7 5z" />
    </svg>
  );
}

function ShowcaseHeader({ selectedVersion, onVersionChange }: { selectedVersion: VersionKey; onVersionChange: (value: VersionKey) => void }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerTop}>
        <Link className={styles.backLink} to="/admin/pipeline">← 返回数据生成</Link>
        <p className={styles.italicQuote}>─ The anatomy of a forgery ─</p>
        <div className={styles.headerTopRight}>
          <span className={styles.pageLabel}>视频标注·解构台</span>
        </div>
      </div>
      <div className={styles.versionSwitcher}>
        <span className={styles.versionLabel}>伪造程度</span>
        <span className={styles.versionDash}>──</span>
        <div className={styles.versionTabs}>
          {versionMeta.map((item, index) => (
            <button
              key={item.key}
              className={`${styles.versionTab} ${selectedVersion === item.key ? styles.versionTabActive : ''}`}
              type="button"
              onClick={() => onVersionChange(item.key)}
            >
              <span className={styles.tabIndex}>{String(index).padStart(2, '0')}</span>
              <span className={styles.tabContent}>
                <span className={styles.tabLabel}>{item.label}</span>
                <span className={styles.tabCn}>
                  <span>{item.cn}</span>
                  <span className={styles.tabDot}>·</span>
                  <span>{item.desc}</span>
                </span>
              </span>
              <span className={styles.tabSegBar}>
                {item.segments === 0 ? <span className={styles.segNone} /> : null}
                {item.segments >= 1 ? <span className={styles.segOne} /> : null}
                {item.segments >= 2 ? <span className={styles.segTwo} /> : null}
              </span>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

function TrackLabel({ index, title, en, emphasis = false }: { index: string; title: string; en: string; emphasis?: boolean }) {
  return (
    <div className={`${styles.trackLabel} ${emphasis ? styles.trackLabelEmph : ''}`}>
      <span className={styles.trackIndex}>{index}</span>
      <span className={styles.trackTitles}>
        <span className={styles.trackTitle}>{title}</span>
        <span className={styles.trackEn}>{en}</span>
      </span>
    </div>
  );
}

function TrackRow({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={styles.trackRow}>
      {label}
      <div className={styles.trackContent}>{children}</div>
    </div>
  );
}

function TimeAxis({ duration, segments }: { duration: number; segments: FakeSegment[] }) {
  const ticks = useMemo(() => {
    const result = [];
    for (let value = 0; value < duration; value += 2) result.push(value);
    result.push(duration);
    return result;
  }, [duration]);

  return (
    <TrackRow label={<TrackLabel index="00" title="时间轴" en="Timeline" />}>
      <div className={styles.timeAxis}>
        {ticks.map((tick) => (
          <span key={tick} className={styles.tick} style={{ left: `${(tick / duration) * 100}%` }}>
            <span className={styles.tickMark} />
            <span className={styles.tickLabel}>{formatTime(tick)}</span>
          </span>
        ))}
        {segments.map((segment) => (
          <span
            key={`${segment.start}-${segment.end}`}
            className={styles.timeFakeBlock}
            style={{ left: `${(segment.start / duration) * 100}%`, width: `${((segment.end - segment.start) / duration) * 100}%` }}
          />
        ))}
      </div>
    </TrackRow>
  );
}

function FrameStrip({ frames, duration, scanTime, segments = [] }: { frames: FrameItem[]; duration: number; scanTime: number; segments?: FakeSegment[] }) {
  const frameSpan = duration / frames.length;
  return (
    <div className={styles.frameStrip}>
      {frames.map((frame) => {
        const fake = isInSegment(frame.time, segments);
        const scanning = Math.abs(frame.time - scanTime) < frameSpan;
        return (
          <span key={frame.src} className={`${styles.frameTile} ${fake ? styles.frameTileFake : ''} ${scanning ? styles.frameTileScan : ''}`}>
            <img src={frame.src} alt="" />
          </span>
        );
      })}
    </div>
  );
}

function WaveformTrack({ waveform, duration, segments = [] }: { waveform: number[]; duration: number; segments?: FakeSegment[] }) {
  return (
    <div className={styles.waveformTrack}>
      {waveform.map((value, index) => {
        const time = (index / waveform.length) * duration;
        return <span key={index} className={`${styles.waveBar} ${isInSegment(time, segments) ? styles.waveBarFake : ''}`} style={{ height: `${20 + value * 80}%` }} />;
      })}
    </div>
  );
}

function TextAlignTrack({ words, duration, scanTime }: { words: Word[]; duration: number; scanTime: number }) {
  return (
    <div className={styles.textTrack}>
      {words.map((word, index) => {
        const scanning = scanTime >= word.start && scanTime <= word.end;
        return (
          <span
            key={`${word.text}-${index}`}
            className={`${styles.textToken} ${word.replaced ? styles.textTokenReplaced : ''} ${scanning ? styles.textTokenScan : ''}`}
            style={{ left: `${(word.start / duration) * 100}%`, width: `${Math.max(5, ((word.end - word.start) / duration) * 100)}%` }}
          >
            <span className={styles.tokenText}>{word.text}</span>
            <span className={styles.tokenTime}>{word.start.toFixed(1)}</span>
          </span>
        );
      })}
    </div>
  );
}

function LipKeyframeTrack({ keyframes, duration, scanTime }: { keyframes: FrameItem[]; duration: number; scanTime: number }) {
  return (
    <div className={styles.lipTrack}>
      {keyframes.map((frame, index) => {
        const active = Math.abs(frame.time - scanTime) < 0.5;
        return (
          <span key={`${frame.src}-${index}`} className={`${styles.lipMarker} ${active ? styles.lipMarkerActive : ''}`} style={{ left: `${(frame.time / duration) * 100}%` }}>
            <span className={styles.lipImg}>
              <img src={frame.src} alt="" />
              <span className={styles.lipPin} />
            </span>
            <span className={styles.lipLabel}>K-{String(index + 1).padStart(2, '0')}</span>
          </span>
        );
      })}
    </div>
  );
}

function ZoneDivider() {
  return (
    <div className={styles.zoneDivider}>
      <span className={styles.zoneTagReal}><span className={styles.zoneTagDot} />真实 · ORIGINAL</span>
      <span className={styles.zoneLine} />
      <span className={styles.zoneTagFake}>伪造 · GENERATED<span className={styles.zoneTagDotFake} /></span>
    </div>
  );
}

function ScanLine({ scanTime, duration, inSegment }: { scanTime: number; duration: number; inSegment: boolean }) {
  return (
    <div className={styles.scanLine} style={{ left: `calc(188px + (100% - 236px) * ${scanTime / duration})` }}>
      <span className={`${styles.scanTimeBadge} ${inSegment ? styles.scanTimeBadgeAlert : ''}`}>{formatTime(scanTime)}</span>
      <span className={`${styles.scanLineBody} ${inSegment ? styles.scanLineBodyAlert : ''}`} />
    </div>
  );
}

function ShowcaseStage({ data, scanTime }: { data: ShowcaseData; scanTime: number }) {
  const currentSegment = activeSegment(scanTime, data.segments);
  return (
    <motion.main
      key={data.key}
      className={styles.stage}
      initial={{ opacity: 0.5, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <TimeAxis duration={data.duration} segments={data.segments} />
      <div className={styles.realZone}>
        <TrackRow label={<TrackLabel index="01" title="原视频帧带" en="Frames" />}>
          <FrameStrip frames={data.realFrames} duration={data.duration} scanTime={scanTime} />
        </TrackRow>
        <TrackRow label={<TrackLabel index="02" title="原音轨波形" en="Audio" />}>
          <WaveformTrack waveform={data.realWaveform} duration={data.duration} />
        </TrackRow>
        <TrackRow label={<TrackLabel index="03" title="原文本对齐" en="Original text" />}>
          <TextAlignTrack words={data.realWords} duration={data.duration} scanTime={scanTime} />
        </TrackRow>
      </div>
      <ZoneDivider />
      {data.key === 'real' ? (
        <div className={styles.fakeZoneEmpty}>
          <p>─ 原始视频，无伪造内容 ─</p>
        </div>
      ) : (
        <div className={styles.fakeZone}>
          <TrackRow label={<TrackLabel index="04" title="新文本对齐" en="Replaced text" emphasis />}>
            <TextAlignTrack words={data.fakeWords} duration={data.duration} scanTime={scanTime} />
          </TrackRow>
          <TrackRow label={<TrackLabel index="05" title="新音轨波形" en="Generated audio" emphasis />}>
            <WaveformTrack waveform={data.fakeWaveform} duration={data.duration} segments={data.segments} />
          </TrackRow>
          <TrackRow label={<TrackLabel index="06" title="唇形关键帧" en="Lip-sync keyframes" emphasis />}>
            <LipKeyframeTrack keyframes={data.lipKeyframes} duration={data.duration} scanTime={scanTime} />
          </TrackRow>
          <TrackRow label={<TrackLabel index="07" title="伪造帧带" en="Final frames" emphasis />}>
            <FrameStrip frames={data.fakeFrames} duration={data.duration} scanTime={scanTime} segments={data.segments} />
          </TrackRow>
        </div>
      )}
      <ScanLine scanTime={scanTime} duration={data.duration} inSegment={!!currentSegment} />
      {currentSegment && (
        <div className={styles.syncWarning}>
          <span className={styles.syncWarningIcon}>!</span>
          SYNC WARNING: MANIPULATION DETECTED
        </div>
      )}
    </motion.main>
  );
}

function ShowcaseFooter({ scanTime, duration, segment, isPlaying, onPlayToggle, onSeek, versionKey }: { scanTime: number; duration: number; segment?: FakeSegment; isPlaying: boolean; onPlayToggle: () => void; onSeek: (time: number) => void; versionKey: VersionKey }) {
  const [showJson, setShowJson] = useState(false);

  const annotationLevels = [
    { label: '视频级', en: 'Video', active: true },
    { label: '片段级', en: 'Segment', active: !!segment },
    { label: '内容级', en: 'Content', active: versionKey !== 'real' },
    { label: '过程级', en: 'Process', active: versionKey !== 'real' },
  ];

  const jsonPreview = versionKey === 'real' ? `{
  "sample_id": "real_video_001",
  "is_fake": 0,
  "type": "original",
  "duration": ${duration.toFixed(3)}
}` : `{
  "sample_id": "fake_${versionKey}_001",
  "is_fake": 1,
  "type": "${versionKey}",
  "duration": ${duration.toFixed(3)},
  "segments": ${JSON.stringify(versionSegments[versionKey].map(s => ({ start: s.start, end: s.end })))},
  "model": "sonic_v2",
  "quality_status": "approved"
}`;

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInfo}>
        <span className={styles.infoLabel}>当前时刻</span>
        <span className={styles.infoValue}>{formatTime(scanTime)}</span>
        {segment ? (
          <>
            <span className={styles.infoDash}>│</span>
            <span className={styles.infoLabel}>段落</span>
            <span className={styles.infoSegBadge}>E-{String(segment.idx + 1).padStart(2, '0')}</span>
            <span className={styles.infoValue}>{formatTime(segment.start)} → {formatTime(segment.end)}</span>
            <span className={styles.infoDash}>│</span>
            <span className={styles.infoLabel}>替换</span>
            <span className={styles.infoReplaceWord}>{segment.replaceText}</span>
          </>
        ) : null}
      </div>

      {/* 标注层级指示 */}
      <div className={styles.annotationLevels}>
        {annotationLevels.map(level => (
          <span
            key={level.en}
            className={`${styles.annotationLevelBadge} ${level.active ? styles.annotationLevelActive : ''}`}
          >
            <span className={styles.annotationLevelDot} />
            <span>{level.label}</span>
          </span>
        ))}
      </div>

      <div className={styles.footerControls}>
        {/* JSON 预览按钮 */}
        <button
          className={`${styles.controlBtn} ${showJson ? styles.controlBtnActive : ''}`}
          type="button"
          onClick={() => setShowJson(v => !v)}
          title="查看 JSON 标注"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 3h2v2H5v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4h2v2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0-2-2v-2a2 2 0 0 0 2-2V5a2 2 0 0 1 2-2m14 0a2 2 0 0 1 2 2v3a2 2 0 0 0 2 2v2a2 2 0 0 0-2 2v3a2 2 0 0 1-2 2h-2v-2h2v-4a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5h-2V3h2z" />
          </svg>
        </button>
        <button className={styles.controlBtn} type="button" onClick={onPlayToggle}>{isPlaying ? <PauseIcon /> : <PlayIcon />}</button>
        <button className={styles.controlBtn} type="button" onClick={() => onSeek(0)}><RewindIcon /></button>
        <span className={styles.controlLabel}>{isPlaying ? '播放中' : '已暂停'} · {Math.round((scanTime / duration) * 100)}%</span>
      </div>

      {/* JSON 预览面板 */}
      {showJson && (
        <div className={styles.jsonPreviewPanel}>
          <div className={styles.jsonPreviewHeader}>
            <span className={styles.jsonPreviewTitle}>sample_annotation.json</span>
            <button type="button" className={styles.jsonPreviewClose} onClick={() => setShowJson(false)}>×</button>
          </div>
          <pre className={styles.jsonPreviewBody}>{jsonPreview}</pre>
        </div>
      )}
    </footer>
  );
}

export function VideoShowcase() {
  const [version, setVersion] = useState<VersionKey>('fake_seg2');
  const data = useMemo(() => buildData(version), [version]);
  const scan = useScanController(data.duration);
  const segment = activeSegment(scan.scanTime, data.segments);
  const changeVersion = (value: VersionKey) => {
    setVersion(value);
    scan.seek(0);
  };

  return (
    <div className={styles.showcase}>
      <ShowcaseHeader selectedVersion={version} onVersionChange={changeVersion} />
      <ShowcaseStage data={data} scanTime={scan.scanTime} />
      <ShowcaseFooter scanTime={scan.scanTime} duration={data.duration} segment={segment} isPlaying={scan.isPlaying} onPlayToggle={scan.togglePlay} onSeek={scan.seek} versionKey={version} />
    </div>
  );
}
