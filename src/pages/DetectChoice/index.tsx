import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/primitives';
import { ImageFrame } from '@/components/icons';
import { UserTopbar } from '@/components/UserTopbar/UserTopbar';
import styles from './DetectChoice.module.css';

export function DetectChoice() {
  return (
    <main className={styles.page}>
      <UserTopbar title="检测选择" english="DETECT CHOICE" />
      <PageContainer width="narrow">
        <section className={styles.body}>
          <p className={styles.kicker}>- Choose the material to develop -</p>
          <h1>请选择待检测材料</h1>
          <div className={styles.cards}>
            <Link className={styles.choiceCard} to="/detect/image">
              <ImageFrame className={styles.imageIcon} />
              <span className={styles.center}>
                <strong>图片</strong>
                <em>IMAGE</em>
              </span>
              <span className={styles.bottom}>
                单张图片真实性分析
                <em>- Image authenticity analysis</em>
              </span>
            </Link>
          </div>
        </section>
      </PageContainer>
    </main>
  );
}
