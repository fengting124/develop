export type ProcessState = 'idle' | 'processing' | 'done';

export const steps = [
  { name: '全局语义读取', english: 'Global semantic reading', duration: 1200 },
  { name: '局部细节核查', english: 'Local detail review', duration: 1800 },
  { name: '异构专家协同', english: 'Expert ensemble', duration: 2400 },
  { name: '证据汇总', english: 'Evidence aggregation', duration: 1000 },
  { name: '出具结论', english: 'Final verdict', duration: 600 },
];

export const evidences = [
  { name: '光影方向不一致', appearAt: 3000 },
  { name: '局部纹理异常', appearAt: 4500 },
  { name: '边缘融合不自然', appearAt: 5800 },
];

export const marks = [
  { x: 42, y: 38, w: 18, h: 22, label: 'M-01', confidence: 0.92, appearAt: 3000, clue: '手部结构异常' },
  { x: 65, y: 15, w: 12, h: 14, label: 'M-02', confidence: 0.87, appearAt: 4500, clue: '光影方向偏离' },
  { x: 20, y: 60, w: 25, h: 15, label: 'M-03', confidence: 0.79, appearAt: 5800, clue: '边缘融合不自然' },
];
