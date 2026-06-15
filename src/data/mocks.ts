export const imageDemo = {
  src: '/images/samples/image-demo-01.jpg',
  verdict: 'fake' as const,
  confidence: 0.93,
  marks: [
    { x: 42, y: 38, w: 18, h: 22, label: 'M-01', confidence: 0.92, name: '手部结构异常' },
    { x: 65, y: 15, w: 12, h: 14, label: 'M-02', confidence: 0.87, name: '光影方向偏离' },
    { x: 20, y: 60, w: 25, h: 15, label: 'M-03', confidence: 0.79, name: '边缘融合不自然' },
  ],
};

export const videoDemo = {
  src: '/videos/video-demo-01.mp4',
  duration: 30,
  fakeRanges: [
    { start: 8.2, end: 14.7, reason: '跨帧身份漂移' },
    { start: 21.0, end: 24.5, reason: '口型不同步' },
  ],
};

export const videoFrames = Array.from({ length: 30 }, (_, index) => ({
  src: `/samples/${String((index % 54) + 1).padStart(2, '0')}.jpg`,
  time: index,
}));

// 视频检测台使用 samples/fake_seg1s__.mp4（单段音频替换伪造，时长 11.744s）
// 来源：fake_seg1s__.json — modify_type: replace
//   fake_segments: [[1.837, 5.277]]
//   fake_info:     ["shallow gasps as you inhale"]
//   transcripts:   "Gotta take shallow gasps as you inhale 1, 2, 3 And then you'll hear a yodel if you listen close to me"
const VIDEO_DURATION = 11.744;
const VIDEO_FRAME_COUNT = 12;

export const videoDemoFull = {
  id: 'DV-2026-0527-V01',
  src: '/samples/fake_seg1s__.mp4',
  duration: VIDEO_DURATION,
  verdict: 'fake' as const,
  confidence: 0.87,
  // 6 个时间窗口，均匀切分（每窗口约 1.96s）
  windows: Array.from({ length: 6 }, (_, i) => ({
    start: parseFloat(((i / 6) * VIDEO_DURATION).toFixed(2)),
    end: parseFloat((((i + 1) / 6) * VIDEO_DURATION).toFixed(2)),
  })),
  // 帧带：从 fake_seg1s__.mp4 实际抽取的 12 帧（均匀分布）
  // 对应时间: 0.00, 1.07, 2.14, 3.20, 4.27, 5.34, 6.41, 7.47, 8.54, 9.61, 10.68, 11.50s
  frames: Array.from({ length: VIDEO_FRAME_COUNT }, (_, i) => ({
    time: parseFloat(((i / (VIDEO_FRAME_COUNT - 1)) * VIDEO_DURATION).toFixed(2)),
    src: `/samples/frames/frame-${String(i + 1).padStart(2, '0')}.jpg`,
  })),
  // 候选时段：2 段高置信（覆盖真实伪造区间）+ 5 段低置信噪声
  candidates: [
    { id: 'c1', start: 0.0,  end: 1.3,  confidence: 0.21 },
    { id: 'c2', start: 1.5,  end: 3.6,  confidence: 0.83 },  // 覆盖伪造段前半
    { id: 'c3', start: 3.4,  end: 5.6,  confidence: 0.79 },  // 覆盖伪造段后半
    { id: 'c4', start: 5.7,  end: 7.2,  confidence: 0.27 },
    { id: 'c5', start: 7.3,  end: 8.9,  confidence: 0.18 },
    { id: 'c6', start: 9.0,  end: 10.3, confidence: 0.23 },
    { id: 'c7', start: 10.5, end: 11.7, confidence: 0.16 },
  ],
  // 最终确认的高风险伪造时段（对齐 fake_seg1s__.json 标注）
  fakeRanges: [
    {
      start: 1.837,
      end: 5.277,
      reason: '音频语音克隆替换',
      english: 'Voice clone replacement',
      confidence: 0.87,
      modifyType: 'replace' as const,
      // 原始转录 & 伪造语段（直接来自 JSON）
      fullTranscript: "Gotta take shallow gasps as you inhale 1, 2, 3 And then you'll hear a yodel if you listen close to me",
      fakeWords: 'shallow gasps as you inhale',
      // 关键证据帧：来自伪造时段 1.837–5.277s 内的实际视频帧
      keyframes: [
        '/samples/frames/frame-03.jpg',  // t≈2.14s — 伪造段前段
        '/samples/frames/frame-04.jpg',  // t≈3.20s — 伪造段中段
        '/samples/frames/frame-05.jpg',  // t≈4.27s — 伪造段后段
      ],
      expertVotes: [
        { type: 'texture'   as const, name: '纹理专家', intensity: 0.28 },
        { type: 'frequency' as const, name: '谱纹专家', intensity: 0.91 },
        { type: 'style'     as const, name: '风格专家', intensity: 0.44 },
        { type: 'semantic'  as const, name: '语义专家', intensity: 0.76 },
        { type: 'lora'      as const, name: '靶向专家', intensity: 0.83 },
      ],
    },
  ],
};

export const expertsCore = [
  { name: '纹理', english: 'Texture', iconType: 'texture' as const, status: 'online' as const },
  { name: '谱纹', english: 'Spectrum', iconType: 'frequency' as const, status: 'online' as const },
  { name: '风格', english: 'Style', iconType: 'style' as const, status: 'online' as const },
  { name: '语义', english: 'Semantic', iconType: 'semantic' as const, status: 'online' as const },
];

export const expertsLora = [
  {
    id: 'α-01',
    generatorName: 'Stable Diffusion 3',
    generatorShort: 'SD3',
    logoSrc: '/images/generators/sd3.png',
    status: 'online' as const,
  },
  {
    id: 'α-02',
    generatorName: 'FLUX.1',
    generatorShort: 'FLUX',
    logoSrc: '/images/generators/flux.png',
    status: 'online' as const,
  },
  {
    id: 'α-03',
    generatorName: 'DALL·E 3',
    generatorShort: 'DALLE3',
    logoSrc: '/images/generators/dalle3.png',
    status: 'training' as const,
    trainingProgress: 0.67,
  },
  {
    id: 'α-04',
    generatorName: 'Midjourney v6.1',
    generatorShort: 'MJv6.1',
    logoSrc: '/images/generators/mjv61.png',
    status: 'pending' as const,
  },
];

export const anomalyPool = Array.from({ length: 12 }, (_, index) => ({
  id: `AN-2026-1121-${String(37 + index).padStart(3, '0')}`,
  src: `/images/anomaly-pool/anomaly-${String(index + 1).padStart(2, '0')}.jpg`,
}));

export const pipelineProducts = Array.from({ length: 8 }, (_, index) => ({
  src: `/images/pipeline-products/product-${String(index + 1).padStart(2, '0')}.jpg`,
  createdAgo: `${index + 2} 分钟前`,
  duration: `${12 + index}s`,
  type: index % 2 === 0 ? '单段替换' : '口型重构',
}));
