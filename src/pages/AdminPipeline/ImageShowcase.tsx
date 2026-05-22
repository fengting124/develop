import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/primitives';
import styles from './ImageShowcase.module.css';

export function ImageShowcase() {
  return (
    <PageContainer width="wide">
      <div className={styles.page}>
        <Link className={styles.backLink} to="/admin/pipeline">← 返回数据生成</Link>
        <header className="pageHeader">
          <p className="italic-quote">─ Image pipeline showcase ─</p>
          <h1 className="pageTitle">图片标注 · 完整工作流</h1>
          <p className="pageEnglish">IMAGE PIPELINE SHOWCASE</p>
        </header>

        <div className={styles.imagePlaceholder}>
          <p className={styles.placeholderQuote}>─ Coming in next revision ─</p>
          <p className={styles.placeholderText}>图片样例可视化模块开发中</p>
        </div>
      </div>
    </PageContainer>
  );
}
