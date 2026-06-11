import { imageDemo, videoDemoFull } from '@/data/mocks';

export type ReportKind = 'image' | 'video';
export type ReportVerdict = 'fake' | 'real';

export interface ReportEvidence {
  code: string;
  name: string;
  description: string;
  thumb?: string;
  confidence?: number;
  timeRange?: string;
}

export interface DetectionReport {
  id: string;
  kind: ReportKind;
  caseNumber: string;
  createdAt: string;
  title: string;
  sourceName: string;
  sourceSrc: string;
  posterSrc?: string;
  verdict: ReportVerdict;
  confidence: number;
  materialMeta: Array<[string, string]>;
  evidence: ReportEvidence[];
  timeline: Array<[string, string, string]>;
}

const STORAGE_PREFIX = 'develop-report:';
const LATEST_IMAGE_ID = 'image-latest';
const VIDEO_DEMO_ID = 'video-demo';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function nowStamp() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function caseNumber(kind: ReportKind) {
  const now = new Date();
  return `DV-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${kind.toUpperCase()}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function safeSet(report: DetectionReport) {
  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}${report.id}`, JSON.stringify(report));
  } catch {
    // Storage can fail for very large uploaded media; in that case the route falls back to demo data.
  }
}

export function readReport(id = '') {
  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}${id}`);
    if (!raw) return fallbackReport(id);
    return JSON.parse(raw) as DetectionReport;
  } catch {
    return fallbackReport(id);
  }
}

export function saveImageReport(input: {
  src: string;
  sourceName?: string;
  sizeLabel?: string;
  dimensions?: string;
}) {
  const createdAt = nowStamp();
  const report: DetectionReport = {
    id: LATEST_IMAGE_ID,
    kind: 'image',
    caseNumber: caseNumber('image'),
    createdAt,
    title: '图像鉴别报告',
    sourceName: input.sourceName || 'image-evidence.png',
    sourceSrc: input.src,
    verdict: imageDemo.verdict,
    confidence: 0.94,
    materialMeta: [
      ['类型', '图片'],
      ['文件', input.sourceName || '示例样本'],
      ['尺寸', input.dimensions || '检测页实时图像'],
      ['大小', input.sizeLabel || '前端样本'],
      ['送检', createdAt],
    ],
    evidence: imageDemo.marks.map((mark) => ({
      code: mark.label,
      name: mark.name,
      thumb: input.src,
      confidence: mark.confidence,
      description: `${mark.name} 与当前送检图像同步绑定，报告缩略图和证据来源均来自本次检测画面。`,
    })),
    timeline: [
      ['T+00.0s', '材料登记', input.sourceName || '示例样本已进入图像取证队列'],
      ['T+04.2s', '语义读取', '完成全局场景和局部实体解析'],
      ['T+05.9s', '证据定位', '锁定图像中的可疑区域和对应专家贡献'],
      ['T+09.8s', '证据聚合', '融合区域证据、语义链和多专家意见'],
      ['T+11.0s', '报告生成', '将本次检测结果固化为报告快照'],
    ],
  };

  safeSet(report);
  return report.id;
}

export function saveVideoReport() {
  const createdAt = nowStamp();
  const fakeSeconds = videoDemoFull.fakeRanges.reduce((sum, range) => sum + range.end - range.start, 0);
  const report: DetectionReport = {
    id: VIDEO_DEMO_ID,
    kind: 'video',
    caseNumber: caseNumber('video'),
    createdAt,
    title: '视频鉴别报告',
    sourceName: 'fake_seg1s__.mp4',
    sourceSrc: videoDemoFull.src,
    posterSrc: videoDemoFull.frames[0]?.src,
    verdict: videoDemoFull.verdict,
    confidence: videoDemoFull.confidence,
    materialMeta: [
      ['类型', '视频'],
      ['文件', 'fake_seg1s__.mp4'],
      ['时长', `${videoDemoFull.duration.toFixed(3)}s`],
      ['高风险片段', `${videoDemoFull.fakeRanges.length} 段 / ${fakeSeconds.toFixed(2)}s`],
      ['送检', createdAt],
    ],
    evidence: videoDemoFull.fakeRanges.map((range, index) => ({
      code: `E-${pad(index + 1)}`,
      name: range.english,
      thumb: range.keyframes[0],
      confidence: range.confidence,
      timeRange: `${range.start.toFixed(3)}s - ${range.end.toFixed(3)}s`,
      description: `${range.reason}，命中 "${range.fakeWords}" 替换片段，并与关键帧、谱纹异常和专家投票同步归档。`,
    })),
    timeline: [
      ['T+00.0s', '视频登记', '读取视频流、音频流和首帧缩略图'],
      ['T+01.5s', '时间窗口切分', `将 ${videoDemoFull.duration.toFixed(1)}s 材料切分为 ${videoDemoFull.windows.length} 个窗口`],
      ['T+05.5s', '候选片段筛选', '过滤低置信候选，保留高风险时间段'],
      ['T+06.8s', '证据聚合', '绑定关键帧、转录文本、谱纹和专家共识'],
      ['T+07.8s', '报告生成', '将视频检测结果固化为报告快照'],
    ],
  };

  safeSet(report);
  return report.id;
}

function fallbackReport(id: string): DetectionReport {
  return id === VIDEO_DEMO_ID ? fallbackVideoReport() : fallbackImageReport();
}

function fallbackImageReport(): DetectionReport {
  return {
    id: LATEST_IMAGE_ID,
    kind: 'image',
    caseNumber: 'DV-IMAGE-DEMO',
    createdAt: nowStamp(),
    title: '图像鉴别报告',
    sourceName: 'image-demo-01.jpg',
    sourceSrc: imageDemo.src,
    verdict: imageDemo.verdict,
    confidence: imageDemo.confidence,
    materialMeta: [
      ['类型', '图片'],
      ['文件', 'image-demo-01.jpg'],
      ['尺寸', '1920 x 1080'],
      ['送检', 'Demo fallback'],
    ],
    evidence: imageDemo.marks.map((mark) => ({
      code: mark.label,
      name: mark.name,
      thumb: imageDemo.src,
      confidence: mark.confidence,
      description: `${mark.name} 区域与全局语义存在偏移，局部纹理、边缘过渡和光照响应不符合自然成像规律。`,
    })),
    timeline: [
      ['T+00.0s', '材料登记', '示例图片进入图像取证队列'],
      ['T+04.2s', '语义读取', '完成全局场景和局部实体解析'],
      ['T+09.8s', '证据聚合', '输出图像鉴别结论'],
    ],
  };
}

function fallbackVideoReport(): DetectionReport {
  const createdAt = nowStamp();
  const fakeSeconds = videoDemoFull.fakeRanges.reduce((sum, range) => sum + range.end - range.start, 0);
  return {
    id: VIDEO_DEMO_ID,
    kind: 'video',
    caseNumber: 'DV-VIDEO-DEMO',
    createdAt,
    title: '视频鉴别报告',
    sourceName: 'fake_seg1s__.mp4',
    sourceSrc: videoDemoFull.src,
    posterSrc: videoDemoFull.frames[0]?.src,
    verdict: videoDemoFull.verdict,
    confidence: videoDemoFull.confidence,
    materialMeta: [
      ['类型', '视频'],
      ['文件', 'fake_seg1s__.mp4'],
      ['时长', `${videoDemoFull.duration.toFixed(3)}s`],
      ['高风险片段', `${videoDemoFull.fakeRanges.length} 段 / ${fakeSeconds.toFixed(2)}s`],
      ['送检', createdAt],
    ],
    evidence: videoDemoFull.fakeRanges.map((range, index) => ({
      code: `E-${pad(index + 1)}`,
      name: range.english,
      thumb: range.keyframes[0],
      confidence: range.confidence,
      timeRange: `${range.start.toFixed(3)}s - ${range.end.toFixed(3)}s`,
      description: `${range.reason}，命中 "${range.fakeWords}" 替换片段，并与关键帧、谱纹异常和专家投票同步归档。`,
    })),
    timeline: [
      ['T+00.0s', '视频登记', '读取视频流、音频流和首帧缩略图'],
      ['T+01.5s', '时间窗口切分', `将 ${videoDemoFull.duration.toFixed(1)}s 材料切分为 ${videoDemoFull.windows.length} 个窗口`],
      ['T+05.5s', '候选片段筛选', '过滤低置信候选，保留高风险时间段'],
      ['T+06.8s', '证据聚合', '绑定关键帧、转录文本、谱纹和专家共识'],
      ['T+07.8s', '报告生成', '将视频检测结果固化为报告快照'],
    ],
  };
}
