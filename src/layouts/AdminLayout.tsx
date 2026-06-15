import { NavLink, Outlet } from 'react-router-dom';
import styles from './AdminLayout.module.css';
import { GlobalHUD } from '@/components/GlobalHUD';

function AdminIcon({ type }: { type: 'overview' | 'pipeline' | 'experts' | 'anomaly' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {type === 'overview' ? <circle cx="12" cy="12" r="5" fill="currentColor" /> : null}
      {type === 'pipeline' ? (
        <>
          <path d="M6 12h12" />
          <rect x="3" y="8" width="6" height="6" />
          <rect x="15" y="8" width="6" height="6" />
          <rect x="9" y="8" width="6" height="6" />
        </>
      ) : null}
      {type === 'experts' ? (
        <>
          {[7, 12, 17].map((x) => [8, 16].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="currentColor" />))}
        </>
      ) : null}
      {type === 'anomaly' ? <path d="m12 3 7 4v7l-5 7-8-2-2-9 4-6z" /> : null}
    </svg>
  );
}

const nav = [
  { to: '/admin', label: '总览', icon: 'overview' as const, end: true },
  { to: '/admin/pipeline', label: 'Pipeline', icon: 'pipeline' as const },
  { to: '/admin/experts', label: '专家库', icon: 'experts' as const },
  { to: '/admin/anomaly', label: '异常池', icon: 'anomaly' as const },
];

export function AdminLayout() {
  return (
    <>
      <GlobalHUD />
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <nav>
            {nav.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? styles.active : '')}>
                <AdminIcon type={item.icon} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </>
  );
}
