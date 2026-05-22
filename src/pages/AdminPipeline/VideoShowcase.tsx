import { useMemo, useRef, useState } from 'react';
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
  renderInput: () => JSX.Element;
  renderOutput: () => JSX.Element;
}

const image = (index: number) => `/samples/${String(index).padStart(2, '0')}.jpg`;

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
      {type === 'audio' ? <>{[12, 18, 24, 30, 36].map((x, i) => <path key={x} d={`M${x} ${30 - i * 3}v${8 + i * 5}`} />)}</> : null}
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
          style={{
            height: `${height * 100}%`,
            background: colored ? 'var(--accent)' : 'var(--ink-2)',
          }}
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

function FullVideoPreview() {
  return (
    <div className={styles.fullVideoPreview}>
      <img src={image(9)} alt="" />
      <p className={styles.timestamp}>0:00 ──→ 0:30 · 全段</p>
    </div>
  );
}

function SceneStrip() {
  return (
    <div className={styles.sceneStrip}>
      {[10, 11, 12, 13, 14, 15].map((src, index) => (
        <div key={src} className={styles.sceneItem}>
          <img src={image(src)} alt="" />
          <span className={styles.sceneNum}>S-{String(index + 1).padStart(2, '0')}</span>
        </div>
      ))}
    </div>
  );
}

function AudioInputView() {
  return (
    <div className={styles.audioInputView}>
      <img src={image(16)} className={styles.audioFrame} alt="" />
      <div className={styles.audioBadge}>含音轨</div>
    </div>
  );
}

function AudioOutputView() {
  return (
    <div className={styles.audioOutputView}>
      <WaveformViz />
      <p className={styles.transcript}>
        <span className={styles.transcriptDash}>─</span>
        "今天我们要讨论一个重要的话题..."
      </p>
    </div>
  );
}

function TextBlockPair({ fake = false }: { fake?: boolean }) {
  return (
    <div className={`${styles.textBlock} ${fake ? styles.textBlockFake : ''}`}>
      <span className={styles.textLabel}>{fake ? 'REPLACED' : 'ORIGINAL'}</span>
      <p className={fake ? styles.replacedText : styles.originalText}>
        {fake ? '"今天我们要谈一下完全不同的事情。"' : '"今天我们要讨论一个重要的话题。"'}
      </p>
    </div>
  );
}

function SpeechInput() {
  return (
    <div className={styles.speechInput}>
      <div className={styles.textBlockSmall}>
        <p>"今天我们要谈一下..."</p>
      </div>
      <div className={styles.voiceSample}>
        <span className={styles.voiceLabel}>VOICE</span>
        <WaveformViz mini />
      </div>
    </div>
  );
}

function SpeechOutput() {
  return (
    <div className={styles.speechOutput}>
      <WaveformViz colored />
      <p className={styles.matchScore}>音色匹配度 ─ 0.92</p>
    </div>
  );
}

function LipView({ output = false }: { output?: boolean }) {
  return (
    <div className={output ? styles.lipsyncOutput : styles.lipsyncInput}>
      <img src={image(output ? 22 : 21)} alt="" />
      <div className={styles.lipMarker}>
        <span>{output ? '对齐后唇形' : '原始唇形'}</span>
        {output ? <span className={styles.markerHighlight}>●</span> : null}
      </div>
    </div>
  );
}

function ComposeInput() {
  return (
    <div className={styles.composeInput}>
      {[23, 24, 25, 26, 27, 28].map((src) => (
        <div key={src} className={styles.composeFragment}>
          <img src={image(src)} alt="" />
        </div>
      ))}
    </div>
  );
}

function ComposeOutput() {
  return (
    <div className={styles.composeOutput}>
      <video src="/videos/showcase/final.mp4" poster={image(29)} />
      <p className={styles.composeMark}>
        <span>─</span>
        <span>最终输出 · 0:30</span>
      </p>
    </div>
  );
}

const steps: StepConfig[] = [
  {
    id: 'scene-cut',
    cn: '分镜',
    en: 'Scene Cut',
    icon: 'scene',
    description: '将完整视频按场景边界切分为若干片段，便于后续逐段处理。',
    inputLabel: '完整视频',
    outputLabel: '6 个分镜片段',
    processName: '镜头分割',
    renderInput: () => <FullVideoPreview />,
    renderOutput: () => <SceneStrip />,
  },
  {
    id: 'audio',
    cn: '音轨',
    en: 'Audio Extract',
    icon: 'audio',
    description: '从视频中提取出音频轨道，并得到文本转写。',
    inputLabel: '带音频的视频片段',
    outputLabel: '音轨与文字转写',
    processName: '音轨分离',
    renderInput: () => <AudioInputView />,
    renderOutput: () => <AudioOutputView />,
  },
  {
    id: 'text',
    cn: '文本',
    en: 'Text Replace',
    icon: 'text',
    description: '替换原文本内容，生成含义不同但语法自然的新文本。',
    inputLabel: '原始文本',
    outputLabel: '替换后文本',
    processName: '文本改写',
    renderInput: () => <TextBlockPair />,
    renderOutput: () => <TextBlockPair fake />,
  },
  {
    id: 'speech',
    cn: '合成',
    en: 'Speech Synthesis',
    icon: 'speech',
    description: '将新文本合成为说话人音色一致的语音，与原视频风格匹配。',
    inputLabel: '新文本与音色样本',
    outputLabel: '合成音频',
    processName: '声音克隆',
    renderInput: () => <SpeechInput />,
    renderOutput: () => <SpeechOutput />,
  },
  {
    id: 'lipsync',
    cn: '唇形',
    en: 'Lip-Sync',
    icon: 'lip',
    description: '根据合成音频调整人物嘴部动作，使口型与新内容匹配。',
    inputLabel: '原视频与新音频',
    outputLabel: '唇形已对齐的视频',
    processName: '唇形重建',
    renderInput: () => <LipView />,
    renderOutput: () => <LipView output />,
  },
  {
    id: 'compose',
    cn: '帧合',
    en: 'Frame Compose',
    icon: 'compose',
    description: '将处理后的片段按时序重新合成为完整视频，输出最终结果。',
    inputLabel: '6 个处理后片段',
    outputLabel: '完整伪造视频',
    processName: '时序合成',
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
          <p className="italic-quote">─ How a forgery is born, step by step ─</p>
          <h1 className="pageTitle">视频标注 · 完整工作流</h1>
          <p className="pageEnglish">VIDEO PIPELINE SHOWCASE</p>
        </header>

        <section className={styles.section}>
          <SectionHeader index="01" title="输入与输出" english="INPUT & OUTPUT" />
          <div className={styles.comparisonGrid}>
            <VideoTile label="真实视频" english="ORIGINAL" labelType="real" videoSrc="/videos/showcase/real-original.mp4" thumbnail={image(9)} />
            <div className={styles.arrowBridge}>
              <span className={styles.bridgeDash}>─────</span>
              <span className={styles.bridgeArrow}>→</span>
              <span className={styles.bridgeText}>经过 6 步处理</span>
              <span className={styles.bridgeArrow}>→</span>
              <span className={styles.bridgeDash}>─────</span>
            </div>
            <VideoTile label="伪造视频" english="GENERATED" labelType="fake" videoSrc="/videos/showcase/fake-result.mp4" thumbnail={image(29)} />
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeader index="02" title="处理流程" english="PROCESSING" />
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
          <SectionHeader index="03" title="逐步详解" english="STEP BY STEP" />
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
