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

// 视频检测台使用 workflow/fake_seg2.mp4（双段伪造，时长 13.289s）
// 对应 fake_segments: [[1.796, 10.516], [11.9, 12.78]]
const VIDEO_DURATION = 13.289;
const VIDEO_FRAME_COUNT = 18; // workflow-editor 里的帧数

export const videoDemoFull = {
  id: 'DV-2026-1121-V01',
  src: '/videos/workflow/fake_seg2.mp4',
  duration: VIDEO_DURATION,
  verdict: 'fake' as const,
  confidence: 0.91,
  // 6 个时间窗口，均匀切分
  windows: Array.from({ length: 6 }, (_, i) => ({
    start: parseFloat(((i / 6) * VIDEO_DURATION).toFixed(2)),
    end: parseFloat((((i + 1) / 6) * VIDEO_DURATION).toFixed(2)),
  })),
  // 帧带：使用 workflow-editor/fake_seg2 的真实帧
  frames: Array.from({ length: VIDEO_FRAME_COUNT }, (_, i) => ({
    time: parseFloat(((i / (VIDEO_FRAME_COUNT - 1)) * VIDEO_DURATION).toFixed(2)),
    src: `/images/workflow-editor/fake_seg2/frame-${String(i + 1).padStart(2, '0')}.jpg`,
  })),
  // 候选时段（覆盖两个真实伪造段 + 若干低置信噪声）
  candidates: [
    { id: 'c1', start: 0.5,  end: 1.5,  confidence: 0.28 },
    { id: 'c2', start: 1.8,  end: 5.2,  confidence: 0.82 },
    { id: 'c3', start: 5.2,  end: 7.8,  confidence: 0.76 },
    { id: 'c4', start: 7.8,  end: 10.5, confidence: 0.88 },
    { id: 'c5', start: 10.6, end: 11.8, confidence: 0.35 },
    { id: 'c6', start: 11.9, end: 12.8, confidence: 0.79 },
    { id: 'c7', start: 12.8, end: 13.2, confidence: 0.22 },
  ],
  // 最终确认的高风险伪造时段（对齐 fake_seg2 的真实标注）
  fakeRanges: [
    {
      start: 1.796,
      end: 10.516,
      reason: '口型与语音不同步',
      english: 'Lip-sync mismatch',
      confidence: 0.89,
      keyframes: [
        '/images/workflow-editor/fake_seg2/frame-03.jpg',
        '/images/workflow-editor/fake_seg2/frame-09.jpg',
        '/images/workflow-editor/fake_seg2/frame-14.jpg',
      ],
      expertVotes: [
        { type: 'texture' as const,   name: '纹理专家', intensity: 0.45 },
        { type: 'frequency' as const, name: '谱纹专家', intensity: 0.82 },
        { type: 'style' as const,     name: '风格专家', intensity: 0.58 },
        { type: 'semantic' as const,  name: '语义专家', intensity: 0.91 },
        { type: 'lora' as const,      name: '靶向专家', intensity: 0.74 },
      ],
    },
    {
      start: 11.9,
      end: 12.78,
      reason: '语音片段替换痕迹',
      english: 'Audio splice artifact',
      confidence: 0.79,
      keyframes: [
        '/images/workflow-editor/fake_seg2/frame-16.jpg',
        '/images/workflow-editor/fake_seg2/frame-17.jpg',
        '/images/workflow-editor/fake_seg2/frame-18.jpg',
      ],
      expertVotes: [
        { type: 'texture' as const,   name: '纹理专家', intensity: 0.3 },
        { type: 'frequency' as const, name: '谱纹专家', intensity: 0.72 },
        { type: 'style' as const,     name: '风格专家', intensity: 0.48 },
        { type: 'semantic' as const,  name: '语义专家', intensity: 0.65 },
        { type: 'lora' as const,      name: '靶向专家', intensity: 0.55 },
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
