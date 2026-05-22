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

export const videoDemoFull = {
  id: 'DV-2026-1121-V01',
  src: '/videos/video-demo-01.mp4',
  duration: 30,
  verdict: 'fake' as const,
  confidence: 0.91,
  windows: [
    { start: 0, end: 5 },
    { start: 5, end: 10 },
    { start: 10, end: 15 },
    { start: 15, end: 20 },
    { start: 20, end: 25 },
    { start: 25, end: 30 },
  ],
  frames: Array.from({ length: 30 }, (_, index) => ({
    time: index,
    src: `/samples/${String((index % 54) + 1).padStart(2, '0')}.jpg`,
  })),
  candidates: [
    { id: 'c1', start: 2.1, end: 3.5, confidence: 0.32 },
    { id: 'c2', start: 4.8, end: 6.2, confidence: 0.45 },
    { id: 'c3', start: 8.0, end: 14.9, confidence: 0.89 },
    { id: 'c4', start: 15.5, end: 17.0, confidence: 0.28 },
    { id: 'c5', start: 18.2, end: 19.5, confidence: 0.51 },
    { id: 'c6', start: 20.8, end: 25.0, confidence: 0.83 },
    { id: 'c7', start: 26.0, end: 27.5, confidence: 0.38 },
  ],
  fakeRanges: [
    {
      start: 8.2,
      end: 14.7,
      reason: '跨帧身份漂移',
      english: 'Cross-frame identity drift',
      confidence: 0.89,
      keyframes: ['/samples/18.jpg', '/samples/19.jpg', '/samples/20.jpg'],
      expertVotes: [
        { type: 'texture' as const, name: '纹理专家', intensity: 0.4 },
        { type: 'frequency' as const, name: '谱纹专家', intensity: 0.85 },
        { type: 'style' as const, name: '风格专家', intensity: 0.6 },
        { type: 'semantic' as const, name: '语义专家', intensity: 0.92 },
        { type: 'lora' as const, name: '靶向专家', intensity: 0.75 },
      ],
    },
    {
      start: 21.0,
      end: 24.5,
      reason: '口型不同步',
      english: 'Lip-sync mismatch',
      confidence: 0.83,
      keyframes: ['/samples/31.jpg', '/samples/32.jpg', '/samples/33.jpg'],
      expertVotes: [
        { type: 'texture' as const, name: '纹理专家', intensity: 0.3 },
        { type: 'frequency' as const, name: '谱纹专家', intensity: 0.6 },
        { type: 'style' as const, name: '风格专家', intensity: 0.55 },
        { type: 'semantic' as const, name: '语义专家', intensity: 0.78 },
        { type: 'lora' as const, name: '靶向专家', intensity: 0.5 },
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
