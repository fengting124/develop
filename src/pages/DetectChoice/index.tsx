import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/primitives';
import { FilmReel, ImageFrame } from '@/components/icons';
import { UserTopbar } from '@/components/UserTopbar/UserTopbar';
import styles from './DetectChoice.module.css';

export function DetectChoice() {
  return (
    <main className={styles.page}>
      <UserTopbar title="检测选择" english="DETECT CHOICE" />
      <PageContainer width="narrow">
      <section className={styles.body}>
        <p className={styles.kicker}>─ Choose the material to develop ─</p>
        <h1>请选择待检材料</h1>
        <div className={styles.cards}>
          <Link className={styles.choiceCard} to="/detect/image">
            <ImageFrame className={styles.imageIcon} />
            <span className={styles.center}>
              <strong>图片</strong>
              <em>IMAGE</em>
            </span>
            <span className={styles.bottom}>
              一帧一帧地显影
              <em>─ Frame by frame</em>
            </span>
          </Link>
          <Link className={styles.choiceCard} to="/detect/video">
            <FilmReel className={styles.videoIcon} />
            <span className={styles.center}>
              <strong>视频</strong>
              <em>VIDEO</em>
            </span>
            <span className={styles.bottom}>
              沿着时间显影
              <em>─ Along the time</em>
            </span>
          </Link>
        </div>
      </section>
      </PageContainer>
    </main>
  );
}
