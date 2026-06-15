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

export interface ReportSemanticNode {
  index: string;
  label: string;
  english: string;
  result: string;
  danger?: string;
}

export interface ReportExpertNode {
  key: string;
  label: string;
  english: string;
  weight: number;
  target?: boolean;
  summary: string;
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
  semanticChain?: ReportSemanticNode[];
  expertNetwork?: ReportExpertNode[];
  timeline: Array<[string, string, string]>;
}

const STORAGE_PREFIX = 'develop-report:';
const LATEST_IMAGE_ID = 'image-latest';
const VIDEO_DEMO_ID = 'video-demo';

const imageSemanticChain: ReportSemanticNode[] = [
  {
    index: '01',
    label: '全局场景锚定',
    english: 'Global Scene',
    result: '视觉编码命中：农家厨房与烹饪场景，置信度 0.91。',
  },
  {
    index: '02',
    label: '局部实体解析',
    english: 'Entity Parsing',
    result: '识别人物、明火、盆碗、炒锅、青菜和墙面挂件。',
    danger: '锁定语义离群点：塑料材质容器置于明火上方。',
  },
  {
    index: '03',
    label: '逻辑与常识校验',
    english: 'Logic Validation',
    result: '知识图谱给出〈塑料盆, 在上方, 明火〉语义距离 0.93。',
    danger: '大模型评估：物理矛盾 0.90；面部光照反向 0.83。',
  },
  {
    index: '04',
    label: '证据融合与判决',
    english: 'Evidence Fusion',
    result: '三处异常区域触发告警，区域证据、语义链和专家网络共同支撑结论。',
  },
];

const imageExpertNetwork: ReportExpertNode[] = [
  {
    key: 'texture',
    label: '纹理专家',
    english: 'Texture',
    weight: 0.45,
    summary: '负责局部纹理、边缘过渡和重绘痕迹检查，支撑 M-02 与 M-03。',
  },
  {
    key: 'frequency',
    label: '频域专家',
    english: 'Frequency',
    weight: 0.38,
    summary: '负责 FFT 高频残差与周期噪声检查，主要支撑 M-03。',
  },
  {
    key: 'style',
    label: '风格专家',
    english: 'Style',
    weight: 0.42,
    summary: '负责材质、笔触和光照风格一致性检查，主要支撑 M-02。',
  },
  {
    key: 'semantic',
    label: '语义专家',
    english: 'Semantic',
    weight: 0.78,
    summary: '负责场景关系与常识约束，主要支撑 M-01 的物理矛盾判断。',
  },
  {
    key: 'lora',
    label: 'Nano Banana',
    english: 'Targeted',
    weight: 0.92,
    target: true,
    summary: '靶向专家命中生成模型残差，提升本次图像判定置信度。',
  },
];

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
    semanticChain: imageSemanticChain,
    expertNetwork: imageExpertNetwork,
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
    semanticChain: imageSemanticChain,
    expertNetwork: imageExpertNetwork,
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
