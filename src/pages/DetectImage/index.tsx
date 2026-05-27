import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { UserTopbar } from '@/components/UserTopbar/UserTopbar';
import { ForensicMark } from '@/components/ForensicMark/ForensicMark';
import styles from './DetectImage.module.css';

type ProcessState = 'idle' | 'processing' | 'done';

const demoImage = '/images/图片检测示例图/image.png';

const logsData = [
  { time: 200, text: '初始化图像取证引擎...' },
  { time: 800, text: '加载通用检测与靶向适配专家权重...' },
  { time: 1400, text: '建立与知识图谱 (ConceptNet) 的连接...' },
  { time: 2100, text: '尝试提取 EXIF 元数据... [失败] 平台已剥离元数据。' },
  { time: 2800, text: '[空域分析] 多尺度卷积网络检测局部篡改...' },
  { time: 3500, text: '[频域分析] 快速傅里叶变换完成，提取高频异常分布...' },
  { time: 4200, text: '[语义对齐] CLIP 与 Grounding DINO 启动...' },
  { time: 5100, text: '[警告] 检测到全局逻辑矛盾: 塑料盆置于明火。' },
  { time: 6400, text: '[门控协同] 动态激活靶向专家...' },
  { time: 7200, text: '[LoRA 适配] 注入 Nano Banana Pro 专用模型权重...' },
  { time: 8500, text: '[大模型推理] 校验时空因果与常识逻辑...' },
  { time: 9800, text: '证据聚合计算完成。' },
  { time: 10500, text: '[最终结论] 确认内容为 AI 生成/篡改。' },
];

const marks = [
  { id: '全局常识冲突', x: 35, y: 45, w: 35, h: 40, title: '物理逻辑矛盾', desc: '塑料盆置于明火', appearAt: 5100, tooltip: '【全局语义违和】SGG提取三元组〈塑料盆, 在上方, 火〉。知识图谱计算语义距离 E_KG 极高，LLM输出逻辑违和度 0.90。' },
  { id: '局部重绘异常', x: 45, y: 45, w: 15, h: 15, title: '实体不匹配', desc: '异常的石块纹理', appearAt: 6800, tooltip: '【局部像素异常】该区域图像噪声梯度与全局分布完全断裂，大概率为生成模型局部重绘(Inpainting)强行插入的实体。' },
  { id: '光影残差定位', x: 25, y: 5, w: 20, h: 25, title: '光源方向背离', desc: '面部高光位置错误', appearAt: 8400, tooltip: '【全局-局部一致性】空域专家通过多尺度特征提取，发现人物面部的高频残差所反映的光源方向，与环境主光源呈明显背离。' },
];

const totalDuration = 11000;

function TerminalLogs({ elapsed }: { elapsed: number }) {
  const visibleLogs = logsData.filter(l => elapsed >= l.time);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleLogs.length]);

  return (
    <div className={styles.terminal}>
      <div className={styles.terminalHeader}>推 理 日 志 ─ Log</div>
      <div className={styles.terminalBody}>
        {visibleLogs.map((log, i) => (
          <div key={i} className={log.text.includes('[警告]') || log.text.includes('[最终结论]') ? styles.logDanger : styles.logInfo}>
            <span className={styles.logTimestamp}>{(log.time / 1000).toFixed(3)}s</span>
            {log.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

function RightSidebar({ elapsed, hoveredMarkId, setHoveredMarkId }: { elapsed: number, hoveredMarkId: string | null, setHoveredMarkId: (id: string | null) => void }) {
  return (
    <motion.div className={styles.hudPanel} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
      
      <div className={styles.hudSection}>
        <div className={styles.sectionHeader}>重点证据锚点 (Anchors)</div>
        <div className={styles.evidenceList}>
          {marks.map((mark) => {
            const isVisible = elapsed >= mark.appearAt;
            const isActive = hoveredMarkId === mark.id;
            return (
              <div 
                key={mark.id} 
                className={`${styles.evidenceItem} ${isVisible ? styles.evidenceItemVisible : ''} ${isActive ? styles.evidenceItemActive : ''}`}
                onMouseEnter={() => isVisible && setHoveredMarkId(mark.id)}
                onMouseLeave={() => isVisible && setHoveredMarkId(null)}
              >
                <div className={styles.evidenceId}>{mark.id}</div>
                <div className={styles.evidenceDetails}>
                  <strong>{mark.title}</strong>
                  <span>{mark.desc}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.hudSection}>
        <div className={styles.sectionHeader}>异构专家网络 (Expert Routing)</div>
        <div className={styles.expertGrid}>
          <div className={`${styles.expertBox} ${elapsed > 1000 ? styles.expertActive : ''} ${styles.hasTooltip}`}>
            <span>通用: 空域检测专家 <i className={styles.tooltipIcon}>?</i></span>
            {elapsed > 1000 && <div className={styles.expertBar} style={{ width: '45%' }}/>}
            <div className={styles.tooltipContent}>【像素空间分析】检测全局几何畸变与拼接伪影。当前贡献权重: 0.45</div>
          </div>
          <div className={`${styles.expertBox} ${elapsed > 1000 ? styles.expertActive : ''} ${styles.hasTooltip}`}>
            <span>通用: 频域检测专家 <i className={styles.tooltipIcon}>?</i></span>
            {elapsed > 1000 && <div className={styles.expertBar} style={{ width: '38%' }}/>}
            <div className={styles.tooltipContent}>【信号频率分析】利用FFT计算高频噪声残差。当前贡献权重: 0.38</div>
          </div>
          <div className={`${styles.expertBox} ${elapsed > 4000 ? styles.expertActive : ''} ${styles.hasTooltip}`}>
            <span>通用: 语义检测专家 <i className={styles.tooltipIcon}>?</i></span>
            {elapsed > 4000 && <div className={styles.expertBar} style={{ width: '78%' }}/>}
            <div className={styles.tooltipContent}>【认知逻辑分析】通过大模型提取场景与实体分布。当前贡献权重: 0.78</div>
          </div>
          <div className={`${styles.expertBox} ${elapsed > 7000 ? styles.expertTarget : ''} ${styles.hasTooltip}`}>
            <span>靶向: Nano Banana 检测器 <i className={styles.tooltipIcon}>?</i></span>
            {elapsed > 7000 && <div className={styles.expertBar} style={{ width: '92%' }}/>}
            <div className={styles.tooltipContent}>【LoRA精准打击】挂载专用权重，极速匹配其底层生成指纹。置信度: 0.92</div>
          </div>
        </div>
      </div>

      <div className={styles.hudSection}>
        <div className={styles.sectionHeader}>语义思维链 (Semantic Chain)</div>
        <div className={styles.chainWrap}>
          {elapsed > 4200 && (
            <motion.div className={styles.chainStep} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className={styles.chainTitle}>全局场景锚定</div>
              <div className={styles.chainResult}>视觉编码命中: 厨房 (置信度 0.91)</div>
            </motion.div>
          )}
          {elapsed > 5100 && (
            <motion.div className={styles.chainStep} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className={styles.chainTitle}>全局-局部一致性校验</div>
              <div className={styles.chainResult}>实体解析: 锅, 人, 青菜, 塑料盆, 石头</div>
              <div className={styles.chainDanger}>锁定语义离群点: [塑料盆, 石头]</div>
            </motion.div>
          )}
          {elapsed > 8500 && (
            <motion.div className={styles.chainStep} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className={styles.chainTitle}>双分支逻辑校验</div>
              <div className={styles.chainResult}>知识图谱: 〈塑料盆, 在上方, 火〉距离极高</div>
              <div className={styles.chainDanger}>大模型评估: 荒谬 (0.90) - 违背物理常识</div>
            </motion.div>
          )}
        </div>
      </div>

      <div className={styles.hudSection}>
        <div className={styles.sectionHeader}>底层物理特征 (Physical Data)</div>
        <div className={styles.dataRow}><span>相机型号</span> <em>未定义</em></div>
        <div className={styles.dataRow}><span>处理软件</span> <em>Adobe Photoshop 24.0</em></div>
        <div className={styles.chartBox} style={{ marginTop: 12 }}>
          {elapsed > 3500 ? (
            <div className={styles.fftGraph}>
              <div className={styles.fftBar} style={{ height: '30%' }} />
              <div className={styles.fftBar} style={{ height: '45%' }} />
              <div className={styles.fftBar} style={{ height: '80%' }} />
              <div className={styles.fftBar} style={{ height: '60%' }} />
              <div className={styles.fftBar} style={{ height: '90%' }} />
              <div className={styles.fftBar} style={{ height: '40%' }} />
            </div>
          ) : (
            <div className={styles.scanningText}>等待 FFT 转换...</div>
          )}
        </div>
      </div>

    </motion.div>
  );
}

export function DetectImage() {
  const [state, setState] = useState<ProcessState>('idle');
  const [imageSrc, setImageSrc] = useState(demoImage);
  const [elapsed, setElapsed] = useState(0);
  const [hoveredMarkId, setHoveredMarkId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const startProcessing = (src = demoImage) => {
    setImageSrc(src);
    setElapsed(0);
    setState('processing');
  };

  useEffect(() => {
    if (state !== 'processing') return;
    const startedAt = Date.now();
    const interval = window.setInterval(() => setElapsed(Date.now() - startedAt), 50);
    const doneTimer = window.setTimeout(() => setState('done'), totalDuration);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(doneTimer);
    };
  }, [state]);

  const handleFile = (file?: File) => {
    if (!file) return;
    startProcessing(URL.createObjectURL(file));
  };

  return (
    <div className={styles.detectPage}>
      <UserTopbar title="图像取证" english="FORENSICS" />

      {state === 'idle' ? (
        <div className={styles.idleState}>
          <div className={styles.uploadBox} onClick={() => inputRef.current?.click()}>
            <div className={styles.uploadIcon}>+</div>
            <div className={styles.uploadText}>上传待核验样本</div>
            <div className={styles.uploadSub}>支持 JPG · PNG · WebP 格式</div>
          </div>
          <input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => handleFile(event.target.files?.[0])} />
          <button className={styles.demoBtn} onClick={() => startProcessing(demoImage)}>使用示例样本</button>
        </div>
      ) : (
        <div className={styles.workspace}>
          
          <div className={styles.centerCanvas} style={{ justifyContent: 'flex-start' }}>
            <div className={styles.canvasFrame} style={{ maxWidth: '100%', aspectRatio: '16/10' }}>
              
              <div className={styles.imageContainer}>
                <img src={imageSrc} alt="Subject" className={styles.subjectImage} />
                
                {/* Scanner Effects */}
                {state === 'processing' && (
                  <>
                    <div className={styles.scanLineVertical} />
                    <div className={styles.scanGrid} />
                  </>
                )}

                {/* Bounding Boxes */}
                <AnimatePresence>
                  {marks.filter(m => elapsed >= m.appearAt).map((mark) => (
                    <ForensicMark
                      key={mark.id}
                      x={mark.x}
                      y={mark.y}
                      w={mark.w}
                      h={mark.h}
                      label={mark.title}
                      confidence={0.99}
                      active={hoveredMarkId === mark.id}
                    />
                  ))}
                </AnimatePresence>

                {state === 'done' && (
                  <div className={styles.verdictOverlay}>
                    <div className={styles.verdictStamp}>AI 生成</div>
                  </div>
                )}
              </div>
            </div>
            
            {state === 'done' && (
              <div className={styles.actionsBox}>
                <button className={styles.reportBtn} onClick={() => navigate('/detect/report/demo')}>查看详细报告</button>
                <button className={styles.resetBtn} onClick={() => setState('idle')}>重新检测</button>
              </div>
            )}
          </div>

          <RightSidebar elapsed={elapsed} hoveredMarkId={hoveredMarkId} setHoveredMarkId={setHoveredMarkId} />
        </div>
      )}

      {/* Bottom Console */}
      <footer className={styles.bottomConsole}>
        <div className={styles.timelineBox}>
          <div className={styles.timelineBar}>
            <div className={styles.timelineFill} style={{ width: `${Math.min(100, (elapsed / totalDuration) * 100)}%` }} />
          </div>
          <div className={styles.timelineLabels}>
            <span>0%</span>
            <span>分析进度</span>
            <span>100%</span>
          </div>
        </div>
        <div className={styles.terminalWrap}>
          <TerminalLogs elapsed={elapsed} />
        </div>
      </footer>
    </div>
  );
}
