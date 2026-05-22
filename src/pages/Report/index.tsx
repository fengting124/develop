import { Link } from 'react-router-dom';
import { ForensicMark } from '@/components/ForensicMark/ForensicMark';
import { UserTopbar } from '@/components/UserTopbar/UserTopbar';
import { VerdictCard } from '@/components/VerdictCard/VerdictCard';
import { marks } from '@/pages/DetectImage/mock';
import styles from './Report.module.css';

export function Report() {
  return (
    <main className={styles.page}>
      <UserTopbar title="鉴别报告" english="FORENSIC REPORT" />
      <section className={styles.report}>
        <header className={styles.header}>
          <p className="mono">REPORT / DEMO</p>
          <h1>视觉生成内容鉴别报告</h1>
          <Link to="/detect/image">─ 返回检测台 →</Link>
        </header>
        <div className={styles.grid}>
          <div className={styles.imageWrap}>
            <img src="/images/samples/image-demo-01.jpg" alt="" />
            {marks.map((mark) => (
              <ForensicMark key={mark.label} {...mark} />
            ))}
          </div>
          <aside className={styles.side}>
            <VerdictCard verdict="fake" confidence={0.93} />
            <section>
              <h2>关键线索</h2>
              {marks.map((mark) => (
                <p key={mark.label}>
                  <span>{mark.label}</span>
                  {mark.clue}
                </p>
              ))}
            </section>
            <section>
              <h2>系统说明</h2>
              <p>本报告基于语义一致性、局部纹理、边缘融合与专家协同结果生成。</p>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
