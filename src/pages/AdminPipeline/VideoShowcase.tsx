import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/primitives';
import styles from './VideoShowcase.module.css';

type StepIconType = 'scene' | 'audio' | 'text' | 'speech' | 'lip' | 'compose';

interface VideoTileProps {
  label: string;
  english: string;
  labelType: 'real' | 'fake';
  videoSrc: string;
  thumbnail: string;
}

interface StepConfig {
  id: string;
  cn: string;
  en: string;
  icon: StepIconType;
  description: string;
  inputLabel: string;
  outputLabel: string;
  processName: string;
  renderInput: () => ReactNode;
  renderOutput: () => ReactNode;
}

const frame = (name: string) => `/images/workflow-frames/${name}.jpg`;

const workflow = {
  realVideo: '/videos/workflow/real.mp4',
  fakeVideo: '/videos/workflow/fake_seg2.mp4',
  realJson: '/videos/workflow/real.json',
  fakeJson: '/videos/workflow/fake_seg2.json',
  duration: 13.289,
  fps: 30,
  videoFrames: 398,
  originalText: 'And in my head I paint a picture',
  replacedText: 'And through my hands I sculpt a form',
  fakeInfo: ['through my hands', 'sculpt a form'],
  fakeSegments: [
    {
      id: 'SEG-01',
      start: 1.796,
      end: 10.516,
      text: 'through my hands',
      frames: ['fake-seg1-start', 'fake-seg1-mid', 'fake-seg1-end'],
    },
    {
      id: 'SEG-02',
      start: 11.9,
      end: 12.78,
      text: 'sculpt a form',
      frames: ['fake-seg2-start', 'fake-seg2-mid', 'fake-seg2-end'],
    },
  ],
};

function formatTime(value: number) {
  return `${value.toFixed(3)}s`;
}

function PlayIcon() {
  return (
    <svg className={styles.playIcon} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="20" />
      <path d="m20 16 14 8-14 8z" />
    </svg>
  );
}

function PipelineIcon({ type }: { type: StepIconType }) {
  return (
    <svg className={styles.pipelineIcon} viewBox="0 0 48 48" aria-hidden="true">
      {type === 'scene' ? <><rect x="8" y="14" width="32" height="20" /><path d="M16 14v20M24 14v20M32 14v20" /></> : null}
      {type === 'audio' ? <>{[12, 18, 24, 30, 36].map((x, index) => <path key={x} d={`M${x} ${28 - index * 2}v${8 + index * 3}`} />)}</> : null}
      {type === 'text' ? <><path d="M10 15h28M10 24h22M10 33h16" /><path d="M38 31v6" /></> : null}
      {type === 'speech' ? <><path d="M9 28c7-14 12 14 20 0s9 4 10 0" /><path d="m34 13 2 5 5 2-5 2-2 5-2-5-5-2 5-2z" /></> : null}
      {type === 'lip' ? <><path d="M10 24c7-8 21-8 28 0-7 8-21 8-28 0z" /><path d="M15 24h18" /></> : null}
      {type === 'compose' ? <><rect x="10" y="10" width="12" height="12" /><rect x="26" y="10" width="12" height="12" /><rect x="10" y="26" width="12" height="12" /><rect x="26" y="26" width="12" height="12" /></> : null}
    </svg>
  );
}

function WaveformViz({ mini = false, colored = false }: { mini?: boolean; colored?: boolean }) {
  const bars = useMemo(
    () => Array.from({ length: 32 }, (_, index) => Math.abs(Math.sin(index * 0.5) * Math.cos(index * 0.3)) * 0.7 + 0.3),
    [],
  );

  return (
    <div className={`${styles.waveform} ${mini ? styles.waveMini : ''}`}>
      {bars.map((height, index) => (
        <span
          key={index}
          className={styles.waveBar}
          style={{ height: `${height * 100}%`, background: colored ? 'var(--accent)' : 'var(--ink-2)' }}
        />
      ))}
    </div>
  );
}

function SectionHeader({ index, title, english }: { index: string; title: string; english: string }) {
  return (
    <div className={styles.sectionHeader}>
      <span className={styles.sectionIndex}>{index}</span>
      <span className={styles.sectionDash}>──</span>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <span className={styles.sectionEnglish}>{english}</span>
    </div>
  );
}

function VideoTile({ label, english, labelType, videoSrc, thumbnail }: VideoTileProps) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const toggle = () => {
    if (playing) videoRef.current?.pause();
    else void videoRef.current?.play();
    setPlaying((value) => !value);
  };

  return (
    <div className={styles.videoTile}>
      <div className={`${styles.tileLabel} ${styles[labelType]}`}>
        <span className={styles.tileLabelDot} />
        <span className={styles.tileLabelText}>{label}</span>
        <span className={styles.tileLabelEnglish}>{english}</span>
      </div>
      <button className={styles.videoWrap} type="button" onClick={toggle}>
        <video ref={videoRef} src={videoSrc} poster={thumbnail} loop muted playsInline />
        {!playing ? (
          <div className={styles.playButton}>
            <PlayIcon />
          </div>
        ) : null}
      </button>
    </div>
  );
}

function FlowConnector() {
  return (
    <div className={styles.flowConnector}>
      <svg viewBox="0 0 60 2" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" y1="1" x2="60" y2="1" stroke="var(--accent)" strokeWidth="1.2" strokeDasharray="3 3" className={styles.dashFlow} />
      </svg>
    </div>
  );
}

function PipelineMiniCard({ step, index }: { step: StepConfig; index: number }) {
  return (
    <div className={styles.miniCard}>
      <span className={styles.miniIndex}>{String(index).padStart(2, '0')}</span>
      <div className={styles.miniIcon}>
        <PipelineIcon type={step.icon} />
      </div>
      <div className={styles.miniNames}>
        <p className={styles.miniCn}>{step.cn}</p>
        <p className={styles.miniEn}>{step.en}</p>
      </div>
    </div>
  );
}

function JsonSummary() {
  return (
    <div className={styles.jsonPanel}>
      <div>
        <span className={styles.jsonLabel}>JSON</span>
        <p className={styles.jsonValue}>fake_seg2.json</p>
      </div>
      <div>
        <span className={styles.jsonLabel}>modify_type</span>
        <p className={styles.jsonValue}>replace</p>
      </div>
      <div>
        <span className={styles.jsonLabel}>fake_segments</span>
        <p className={styles.jsonValue}>{workflow.fakeSegments.length}</p>
      </div>
      <div>
        <span className={styles.jsonLabel}>duration</span>
        <p className={styles.jsonValue}>{workflow.duration}s</p>
      </div>
    </div>
  );
}

function FullVideoPreview() {
  return (
    <div className={styles.fullVideoPreview}>
      <img src={frame('real-poster')} alt="" />
      <p className={styles.timestamp}>0.000s → {workflow.duration}s · JSON 标注全段</p>
    </div>
  );
}

function SegmentTimeline() {
  return (
    <div className={styles.segmentTimeline}>
      {workflow.fakeSegments.map((segment) => (
        <span
          key={segment.id}
          className={styles.segmentBlock}
          style={{
            left: `${(segment.start / workflow.duration) * 100}%`,
            width: `${((segment.end - segment.start) / workflow.duration) * 100}%`,
          }}
        >
          <span className={styles.segmentTag}>{segment.id}</span>
        </span>
      ))}
    </div>
  );
}

function SceneStrip() {
  return (
    <div className={styles.sceneStrip}>
      {[1, 2, 3, 4, 5, 6].map((index) => (
        <div key={index} className={styles.sceneItem}>
          <img src={frame(`scene-0${index}`)} alt="" />
          <span className={styles.sceneNum}>K-{String(index).padStart(2, '0')}</span>
        </div>
      ))}
    </div>
  );
}

function AudioInputView() {
  return (
    <div className={styles.audioInputView}>
      <img src={frame('scene-02')} className={styles.audioFrame} alt="" />
      <div className={styles.audioBadge}>视频音轨 · real.mp4</div>
    </div>
  );
}

function AudioOutputView() {
  return (
    <div className={styles.audioOutputView}>
      <WaveformViz />
      <p className={styles.transcript}>
        <span className={styles.transcriptDash}>─</span>
        {workflow.originalText}
      </p>
    </div>
  );
}

function TextBlockPair({ fake = false }: { fake?: boolean }) {
  return (
    <div className={`${styles.textBlock} ${fake ? styles.textBlockFake : ''}`}>
      <span className={styles.textLabel}>{fake ? 'REPLACED' : 'ORIGINAL'}</span>
      <p className={fake ? styles.replacedText : styles.originalText}>{fake ? workflow.replacedText : workflow.originalText}</p>
    </div>
  );
}

function SpeechInput() {
  return (
    <div className={styles.speechInput}>
      <div className={styles.textBlockSmall}>
        <p>{workflow.fakeInfo.join(' / ')}</p>
      </div>
      <div className={styles.voiceSample}>
        <span className={styles.voiceLabel}>VOICE SAMPLE</span>
        <WaveformViz mini />
      </div>
    </div>
  );
}

function SpeechOutput() {
  return (
    <div className={styles.speechOutput}>
      <WaveformViz colored />
      <p className={styles.matchScore}>fake_info · {workflow.fakeInfo.length} segments</p>
    </div>
  );
}

function LipView({ output = false }: { output?: boolean }) {
  return (
    <div className={output ? styles.lipsyncOutput : styles.lipsyncInput}>
      <img src={frame(output ? 'fake-seg1-mid' : 'scene-03')} alt="" />
      <div className={styles.lipMarker}>
        <span>{output ? '替换片段关键帧' : '原始片段关键帧'}</span>
        {output ? <span className={styles.markerHighlight}>●</span> : null}
      </div>
    </div>
  );
}

function ComposeInput() {
  return (
    <div className={styles.composeInput}>
      {workflow.fakeSegments.flatMap((segment) => segment.frames).map((name) => (
        <div key={name} className={styles.composeFragment}>
          <img src={frame(name)} alt="" />
        </div>
      ))}
    </div>
  );
}

function ComposeOutput() {
  return (
    <div className={styles.composeOutput}>
      <video src={workflow.fakeVideo} poster={frame('fake-poster')} muted controls />
      <p className={styles.composeMark}>
        <span>─</span>
        <span>fake_seg2.mp4 · {workflow.videoFrames} frames</span>
      </p>
    </div>
  );
}

function SegmentCards() {
  return (
    <div className={styles.segmentCards}>
      {workflow.fakeSegments.map((segment) => (
        <article key={segment.id} className={styles.segmentCard}>
          <header className={styles.segmentCardHeader}>
            <span className={styles.segmentId}>{segment.id}</span>
            <span>{formatTime(segment.start)} → {formatTime(segment.end)}</span>
          </header>
          <div className={styles.segmentFrames}>
            {segment.frames.map((name) => (
              <img key={name} src={frame(name)} alt="" />
            ))}
          </div>
          <p className={styles.segmentText}>{segment.text}</p>
        </article>
      ))}
    </div>
  );
}

const steps: StepConfig[] = [
  {
    id: 'scene-cut',
    cn: '分帧',
    en: 'Frame Sampling',
    icon: 'scene',
    description: '读取 JSON 中的 duration、fps、video_frames，并按时间点从视频中抽取流程展示关键帧。',
    inputLabel: 'real.mp4 + real.json',
    outputLabel: '抽取的关键帧序列',
    processName: '按 JSON 时间轴抽帧',
    renderInput: () => <FullVideoPreview />,
    renderOutput: () => <SceneStrip />,
  },
  {
    id: 'audio',
    cn: '音轨',
    en: 'Audio Track',
    icon: 'audio',
    description: '读取真实视频转写文本，作为后续替换内容的对照基准。',
    inputLabel: '真实视频音轨',
    outputLabel: '原始转写文本',
    processName: '音轨读取',
    renderInput: () => <AudioInputView />,
    renderOutput: () => <AudioOutputView />,
  },
  {
    id: 'text',
    cn: '文本',
    en: 'Text Replace',
    icon: 'text',
    description: '对照 real.json 与 fake_seg2.json 的 transcripts，显示语义替换后的伪造文本。',
    inputLabel: 'real.json transcripts',
    outputLabel: 'fake_seg2.json transcripts',
    processName: '文本替换',
    renderInput: () => <TextBlockPair />,
    renderOutput: () => <TextBlockPair fake />,
  },
  {
    id: 'speech',
    cn: '标注',
    en: 'Fake Info',
    icon: 'speech',
    description: '使用 fake_info 标注被替换的文本片段，和 fake_segments 建立一一对应关系。',
    inputLabel: 'fake_info',
    outputLabel: '片段标注',
    processName: '片段绑定',
    renderInput: () => <SpeechInput />,
    renderOutput: () => <SpeechOutput />,
  },
  {
    id: 'lipsync',
    cn: '片段',
    en: 'Fake Segments',
    icon: 'lip',
    description: 'fake_segments 给出伪造区间的起止时间，页面根据这些时间点抽取片段关键帧。',
    inputLabel: '原始关键帧',
    outputLabel: '伪造片段关键帧',
    processName: '区间定位',
    renderInput: () => <LipView />,
    renderOutput: () => <LipView output />,
  },
  {
    id: 'compose',
    cn: '合成',
    en: 'Final Video',
    icon: 'compose',
    description: '把抽取出的伪造区间关键帧和 fake_seg2.mp4 放在同一流程内，形成可复核样例。',
    inputLabel: '两个 fake segment 的抽帧',
    outputLabel: 'fake_seg2.mp4',
    processName: '样例归档',
    renderInput: () => <ComposeInput />,
    renderOutput: () => <ComposeOutput />,
  },
];

function StepDetailCard({ step, index }: { step: StepConfig; index: number }) {
  return (
    <article className={styles.stepCard}>
      <header className={styles.stepHeader}>
        <span className={styles.stepIndexBig}>{String(index).padStart(2, '0')}</span>
        <div>
          <h3 className={styles.stepCn}>{step.cn}</h3>
          <p className={styles.stepEn}>{step.en}</p>
        </div>
        <p className={styles.stepDescription}>{step.description}</p>
      </header>

      <div className={styles.stepBody}>
        <div className={styles.stepIO}>
          <header className={styles.ioHeader}>
            <span className={styles.ioBadge}>INPUT</span>
            <span className={styles.ioLabel}>{step.inputLabel}</span>
          </header>
          <div className={styles.ioContent}>{step.renderInput()}</div>
        </div>

        <div className={styles.stepArrow}>
          <span className={styles.stepArrowDash}>───</span>
          <span className={styles.stepArrowText}>{step.processName}</span>
          <span className={styles.stepArrowMark}>→</span>
          <span className={styles.stepArrowDash}>───</span>
        </div>

        <div className={styles.stepIO}>
          <header className={styles.ioHeader}>
            <span className={`${styles.ioBadge} ${styles.outputBadge}`}>OUTPUT</span>
            <span className={styles.ioLabel}>{step.outputLabel}</span>
          </header>
          <div className={styles.ioContent}>{step.renderOutput()}</div>
        </div>
      </div>
    </article>
  );
}

export function VideoShowcase() {
  return (
    <PageContainer width="wide">
      <div className={styles.page}>
        <Link className={styles.backLink} to="/admin/pipeline">← 返回数据生成</Link>
        <header className="pageHeader">
          <p className="italic-quote">─ Workflow sample from local videos metadata ─</p>
          <h1 className="pageTitle">视频标注 · 完整工作流</h1>
          <p className="pageEnglish">VIDEO PIPELINE SHOWCASE</p>
        </header>

        <section className={styles.section}>
          <SectionHeader index="01" title="输入与输出" english="INPUT & OUTPUT" />
          <JsonSummary />
          <div className={styles.comparisonGrid}>
            <VideoTile label="真实视频" english="REAL.MP4" labelType="real" videoSrc={workflow.realVideo} thumbnail={frame('real-poster')} />
            <div className={styles.arrowBridge}>
              <span className={styles.bridgeDash}>─────</span>
              <span className={styles.bridgeArrow}>→</span>
              <span className={styles.bridgeText}>JSON 标注驱动</span>
              <span className={styles.bridgeArrow}>→</span>
              <span className={styles.bridgeDash}>─────</span>
            </div>
            <VideoTile label="伪造视频" english="FAKE_SEG2.MP4" labelType="fake" videoSrc={workflow.fakeVideo} thumbnail={frame('fake-poster')} />
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeader index="02" title="伪造区间" english="FAKE SEGMENTS" />
          <SegmentTimeline />
          <SegmentCards />
        </section>

        <section className={styles.section}>
          <SectionHeader index="03" title="处理流程" english="PROCESSING" />
          <div className={styles.pipelineOverview}>
            {steps.map((step, index) => (
              <div className={styles.pipelineUnit} key={step.id}>
                <PipelineMiniCard step={step} index={index + 1} />
                {index < steps.length - 1 ? <FlowConnector /> : null}
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeader index="04" title="逐步详解" english="STEP BY STEP" />
          <div className={styles.stepsList}>
            {steps.map((step, index) => (
              <StepDetailCard key={step.id} step={step} index={index + 1} />
            ))}
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
