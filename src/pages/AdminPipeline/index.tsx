import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer, useToast } from '@/components/primitives';
import styles from './AdminPipeline.module.css';

interface ShowcaseCardProps {
  title: string;
  english: string;
  description: string;
  thumbnail: string;
  to: string;
}

interface UploadCardProps {
  title: string;
  english: string;
  description: string;
}

function UploadIcon() {
  return (
    <svg className={styles.uploadIcon} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 34V12" />
      <path d="m15 21 9-9 9 9" />
      <path d="M11 34v6h26v-6" />
    </svg>
  );
}

function ToggleOption({ checked, label }: { checked?: boolean; label: string }) {
  const [isOn, setIsOn] = useState(Boolean(checked));

  return (
    <label className={styles.toggleRow}>
      <span
        className={`${styles.toggle} ${isOn ? styles.toggleOn : ''}`}
        onClick={() => setIsOn((value) => !value)}
        role="switch"
        aria-checked={isOn}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setIsOn((value) => !value);
          }
        }}
      >
        <span className={styles.toggleKnob} />
      </span>
      <span className={styles.toggleLabel}>{label}</span>
    </label>
  );
}

function ShowcaseCard({ title, english, description, thumbnail, to }: ShowcaseCardProps) {
  const navigate = useNavigate();

  return (
    <article className={styles.showcaseCard} onClick={() => navigate(to)}>
      <div className={styles.showcaseThumb}>
        <img src={thumbnail} alt="" />
        <div className={styles.showcaseOverlay}>
          <span className={styles.overlayBadge}>SHOWCASE</span>
        </div>
      </div>
      <div className={styles.showcaseInfo}>
        <p className={styles.showcaseLabel}>
          <span className={styles.labelDash}>─</span>
          <span>{english}</span>
        </p>
        <h3 className={styles.showcaseTitle}>{title}</h3>
        <p className={styles.showcaseDesc}>{description}</p>
        <div className={styles.showcaseFooter}>
          <span className={styles.showcaseCTA}>
            <span>查看完整流程</span>
            <span className={styles.showcaseArrow}>→</span>
          </span>
        </div>
      </div>
    </article>
  );
}

function UploadCard({ title, english, description }: UploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  return (
    <article className={styles.uploadCard}>
      <div className={styles.uploadInfo}>
        <p className={styles.uploadLabel}>
          <span className={styles.labelDash}>─</span>
          <span>{english}</span>
        </p>
        <h3 className={styles.uploadTitle}>{title}</h3>
        <p className={styles.uploadDesc}>{description}</p>
      </div>

      <button className={styles.uploadZone} type="button" onClick={() => inputRef.current?.click()}>
        <UploadIcon />
        <p className={styles.uploadHint}>拖入或点击选择视频</p>
        <p className={styles.uploadFormats}>支持 MP4 · MOV · WebM</p>
      </button>
      <input
        ref={inputRef}
        hidden
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        onChange={() => showToast('视频已进入生成队列', 'success')}
      />

      <div className={styles.uploadOptions}>
        <p className={styles.optionsLabel}>默认参数</p>
        <div className={styles.optionsList}>
          <ToggleOption checked label="启用音轨替换" />
          <ToggleOption checked label="启用唇形对齐" />
          <ToggleOption label="启用帧插值" />
        </div>
      </div>
    </article>
  );
}

export function AdminPipeline() {
  return (
    <PageContainer width="wide">
      <div className={styles.page}>
        <header className="pageHeader">
          <p className="italic-quote">─ The workshop runs day and night ─</p>
          <h1 className="pageTitle">数 据 生 成</h1>
          <p className="pageEnglish">PIPELINE</p>
        </header>

        <section className={styles.dataBlock}>
          <header className={styles.blockHeader}>
            <span className={styles.blockIndex}>①</span>
            <h2 className={styles.blockTitle}>视频数据</h2>
            <span className={styles.blockEnglish}>VIDEO DATA</span>
          </header>

          <div className={styles.blockGrid}>
            <ShowcaseCard
              title="样例可视化"
              english="Process Showcase"
              description="查看一段真实视频如何被构造为伪造样本，包含从音轨分离到帧合成的完整工作流。"
              thumbnail="/samples/09.jpg"
              to="/admin/pipeline/showcase/video"
            />
            <UploadCard
              title="导入新视频"
              english="Start Generating"
              description="上传一段真实视频，系统将自动完成整个伪造样本的构造流程。"
            />
          </div>
        </section>

        <section className={styles.dataBlock}>
          <header className={styles.blockHeader}>
            <span className={styles.blockIndex}>②</span>
            <h2 className={styles.blockTitle}>图片数据</h2>
            <span className={styles.blockEnglish}>IMAGE DATA</span>
          </header>

          <div className={styles.placeholderBlock}>
            <p className={styles.placeholderQuote}>─ Coming in next revision ─</p>
            <p className={styles.placeholderText}>图片数据生成模块暂未开放</p>
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
