import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/primitives';
import { expertsCore, anomalyPool } from '@/data/mocks';
import styles from './AdminOverview.module.css';

function Preview({ title, desc, to, children }: { title: string; desc: string; to: string; children: React.ReactNode }) {
  return (
    <section className={styles.preview}>
      <h2>{title}</h2>
      <p>{desc}</p>
      <div>{children}</div>
      <Link to={to}>[查看 →]</Link>
    </section>
  );
}

export function AdminOverview() {
  return (
    <PageContainer width="normal">
    <div className={styles.page}>
      <header className="pageHeader">
        <p className="italic-quote">─ A workshop for keeping models honest ─</p>
        <h1 className="pageTitle">治 理 中 心</h1>
        <p className="pageEnglish">GOVERN</p>
      </header>
      <hr />
      <section>
        <h2>今日动态</h2>
        {[
          ['系统持续运行', '自上次刷新 04:12', 'ok'],
          ['新增样本', '在过去 1 小时内', 'ok'],
          ['待审样本', '需要您的关注', 'warn'],
          ['专家在线', '运行正常', 'ok'],
        ].map(([a, b, tone]) => (
          <p className={styles.status} key={a}><i className={styles[tone]} /> <span>{a}</span> ─ <em>{b}</em></p>
        ))}
      </section>
      <hr />
      <Preview title="数据流动" desc="生成、标注与入库持续运转。" to="/admin/pipeline">
        <div className={styles.pipeMini}>{[1, 2, 3, 4, 5].map((n) => <span key={n} />)}</div>
      </Preview>
      <hr />
      <Preview title="专家状态" desc="核心专家组保持在线。" to="/admin/experts">
        <div className={styles.expertMini}>{expertsCore.concat(expertsCore).slice(0, 8).map((e, i) => <span key={`${e.name}-${i}`} />)}</div>
      </Preview>
      <hr />
      <Preview title="异常关注" desc="犹豫样本等待确认。" to="/admin/anomaly">
        <div className={styles.anomalyMini}>{anomalyPool.slice(0, 3).map((item) => <img src={item.src} key={item.id} alt="" />)}</div>
      </Preview>
    </div>
    </PageContainer>
  );
}
