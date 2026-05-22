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
