import { Link } from 'react-router-dom';
import styles from './NotFound.module.css';

export function NotFound() {
  return (
    <main className={styles.page}>
      <p>─ Lost in development ─</p>
      <h1>页面未显影</h1>
      <span>DV-404</span>
      <Link to="/">─ 回到首页 →</Link>
    </main>
  );
}
