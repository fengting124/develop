import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/primitives';
import styles from './AdminPipeline.module.css';

type UploadStatus = 'queued' | 'processing' | 'done';

interface ShowcaseCardProps {
  title: string;
  english: string;
  description: string;
  thumbnail: string;
  to: string;
  disabled?: boolean;
}

interface UploadFile {
  id: string;
  name: string;
  size: number;
  status: UploadStatus;
  progress: number;
}

interface LocalFileSystemEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
}

interface LocalFileSystemFileEntry extends LocalFileSystemEntry {
  file: (callback: (file: File) => void) => void;
}

interface LocalFileSystemDirectoryEntry extends LocalFileSystemEntry {
  createReader: () => {
    readEntries: (callback: (entries: LocalFileSystemEntry[]) => void) => void;
  };
}

interface UploadCardBatchProps {
  title: string;
  english: string;
  description: string;
  acceptType: 'video' | 'image';
  disabled?: boolean;
}

function makeId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

async function collectFilesFromEntry(entry: LocalFileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    return new Promise((resolve) => {
      (entry as LocalFileSystemFileEntry).file((file) => resolve([file]));
    });
  }

  if (entry.isDirectory) {
    const reader = (entry as LocalFileSystemDirectoryEntry).createReader();
    const entries = await new Promise<LocalFileSystemEntry[]>((resolve) => reader.readEntries(resolve));
    const nested = await Promise.all(entries.map((child) => collectFilesFromEntry(child)));
    return nested.flat();
  }

  return [];
}

async function collectDroppedFiles(dataTransfer: DataTransfer) {
  const entries = Array.from(dataTransfer.items)
    .map((item) => {
      const withEntry = item as DataTransferItem & { webkitGetAsEntry?: () => LocalFileSystemEntry | null };
      return (withEntry.webkitGetAsEntry?.() ?? null) as LocalFileSystemEntry | null;
    })
    .filter(Boolean) as LocalFileSystemEntry[];

  if (entries.length === 0) return Array.from(dataTransfer.files);

  const files = await Promise.all(entries.map((entry) => collectFilesFromEntry(entry)));
  return files.flat();
}

function UploadCloudIcon() {
  return (
    <svg className={styles.uploadIcon} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M16 36h20a9 9 0 0 0 0-18 13 13 0 0 0-25 4 7 7 0 0 0 5 14Z" />
      <path d="M24 35V20" />
      <path d="m17 27 7-7 7 7" />
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

function ShowcaseCard({ title, english, description, thumbnail, to, disabled }: ShowcaseCardProps) {
  const navigate = useNavigate();

  return (
    <article className={`${styles.showcaseCard} ${disabled ? styles.disabledCard : ''}`} onClick={() => !disabled && navigate(to)}>
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
            <span>{disabled ? '暂未开放' : '查看完整流程'}</span>
            {!disabled ? <span className={styles.showcaseArrow}>→</span> : null}
          </span>
        </div>
      </div>
    </article>
  );
}

function QueueItem({ file }: { file: UploadFile }) {
  return (
    <li className={styles.queueItem}>
      <div className={styles.queueItemMeta}>
        <span className={`${styles.queueStatus} ${styles[`status${file.status}`]}`}>
          {file.status === 'queued' ? '○' : null}
          {file.status === 'processing' ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{ display: 'inline-block' }}
            >
              ⋯
            </motion.span>
          ) : null}
          {file.status === 'done' ? '✓' : null}
        </span>
        <span className={styles.queueFileName}>{file.name}</span>
        <span className={styles.queueFileSize}>{formatFileSize(file.size)}</span>
      </div>
      {file.status === 'processing' ? (
        <div className={styles.queueProgress}>
          <div className={styles.queueProgressFill} style={{ width: `${file.progress * 100}%` }} />
        </div>
      ) : null}
    </li>
  );
}

function UploadCardBatch({ title, english, description, acceptType, disabled }: UploadCardBatchProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = (id: string) => {
    setFiles((current) => current.map((file) => (file.id === id ? { ...file, status: 'processing' } : file)));
    const interval = window.setInterval(() => {
      setFiles((current) => {
        const target = current.find((file) => file.id === id);
        if (!target || target.status !== 'processing') {
          window.clearInterval(interval);
          return current;
        }
        const progress = Math.min(target.progress + 0.08, 1);
        if (progress >= 1) window.clearInterval(interval);
        return current.map((file) => (file.id === id ? { ...file, progress, status: progress >= 1 ? 'done' : 'processing' } : file));
      });
    }, 150);
  };

  const addFilesToQueue = (fileList: File[]) => {
    if (disabled) return;
    const acceptedExts = acceptType === 'video' ? ['.mp4', '.mov', '.webm'] : ['.jpg', '.jpeg', '.png', '.webp'];
    const accepted = fileList.filter((file) => acceptedExts.some((ext) => file.name.toLowerCase().endsWith(ext)));
    const nextFiles = accepted.map((file) => ({ id: makeId(), name: file.name, size: file.size, status: 'queued' as const, progress: 0 }));
    setFiles((current) => [...current, ...nextFiles]);
    nextFiles.forEach((file, index) => window.setTimeout(() => processFile(file.id), index * 600));
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    addFilesToQueue(await collectDroppedFiles(event.dataTransfer));
  };

  return (
    <article className={`${styles.uploadCard} ${disabled ? styles.uploadCardDisabled : ''}`}>
      <div className={styles.uploadCardHeader}>
        <p className={styles.uploadCardEnglish}>
          <span className={styles.uploadDash}>─</span>
          <span>{english}</span>
        </p>
        <h3 className={styles.uploadCardTitle}>{title}</h3>
        <p className={styles.uploadCardDesc}>{description}</p>
      </div>

      {files.length === 0 ? (
        <div
          className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''}`}
          onClick={() => !disabled && inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <UploadCloudIcon />
          <p className={styles.dropHint}>拖入文件或文件夹</p>
          <p className={styles.dropSubHint}>{disabled ? '此功能暂未开放' : acceptType === 'video' ? '支持 MP4 · MOV · WebM · 可批量处理' : '支持 JPG · PNG · WebP'}</p>
        </div>
      ) : (
        <div className={styles.queueArea}>
          <div className={styles.queueHeader}>
            <span className={styles.queueLabel}>处理队列</span>
            <span className={styles.queueStat}>{files.filter((file) => file.status === 'done').length} / {files.length}</span>
          </div>
          <ul className={styles.queueList}>
            {files.map((file) => <QueueItem key={file.id} file={file} />)}
          </ul>
          <button className={styles.queueAddMore} type="button" onClick={() => inputRef.current?.click()}>
            <span>＋</span>
            <span>继续添加</span>
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        hidden
        multiple
        type="file"
        accept={acceptType === 'video' ? 'video/mp4,video/quicktime,video/webm' : 'image/jpeg,image/png,image/webp'}
        onChange={(event) => addFilesToQueue(Array.from(event.target.files ?? []))}
      />

      {acceptType === 'video' ? (
        <div className={styles.uploadOptions}>
          <p className={styles.optionsLabel}>默认参数</p>
          <div className={styles.optionsRow}>
            <ToggleOption checked label="音轨替换" />
            <ToggleOption checked label="唇形对齐" />
            <ToggleOption label="帧插值" />
          </div>
        </div>
      ) : null}
    </article>
  );
}

function DataBlock({ index, title, english, children }: { index: string; title: string; english: string; children: React.ReactNode }) {
  return (
    <section className={styles.dataBlock}>
      <header className={styles.dataBlockHeader}>
        <span className={styles.dataBlockIndex}>{index}</span>
        <h2 className={styles.dataBlockTitle}>{title}</h2>
        <span className={styles.dataBlockEnglish}>{english}</span>
      </header>
      {children}
    </section>
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

        <div className={styles.dataBlocksGrid}>
          <DataBlock index="①" title="视频数据" english="VIDEO DATA">
            <ShowcaseCard
              title="样例可视化"
              english="Process Showcase"
              description="一段真实视频如何被构造为伪造样本，包含从音轨分离到帧合成的完整工作流。"
              thumbnail="/samples/09.jpg"
              to="/admin/pipeline/showcase/video"
            />
            <UploadCardBatch
              title="开始生成"
              english="Start Generating"
              description="拖入单个或多个视频，系统将自动构造伪造样本。"
              acceptType="video"
            />
          </DataBlock>

          <DataBlock index="②" title="图片数据" english="IMAGE DATA">
            <ShowcaseCard
              title="样例可视化"
              english="Process Showcase"
              description="图片样例可视化模块开发中。"
              thumbnail="/images/图片检测示例图/image.png"
              to="/admin/pipeline/showcase/image"
              disabled
            />
            <UploadCardBatch
              title="开始生成"
              english="Start Generating"
              description="图片数据生成模块暂未开放。"
              acceptType="image"
              disabled
            />
          </DataBlock>
        </div>
      </div>
    </PageContainer>
  );
}
