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
