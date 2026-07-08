import { NavLink, Outlet } from 'react-router-dom';
import styles from './AdminLayout.module.css';

type AdminIconType = 'overview' | 'detections' | 'evaluations' | 'models' | 'review';

function AdminIcon({ type }: { type: AdminIconType }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {type === 'overview' ? <circle cx="12" cy="12" r="5" fill="currentColor" /> : null}
      {type === 'detections' ? (
        <>
          <rect x="4" y="5" width="16" height="14" />
          <path d="M7 9h10M7 13h6M16 13l2 2" />
        </>
      ) : null}
      {type === 'evaluations' ? (
        <>
          <path d="M5 18V8M10 18V5M15 18v-7M20 18V9" />
          <path d="M4 18h17" />
        </>
      ) : null}
      {type === 'models' ? (
        <>
          <circle cx="8" cy="8" r="2" fill="currentColor" />
          <circle cx="16" cy="8" r="2" fill="currentColor" />
          <circle cx="12" cy="16" r="2" fill="currentColor" />
          <path d="M9.6 9.6 11 14M14.4 9.6 13 14M10 16h4" />
        </>
      ) : null}
      {type === 'review' ? <path d="m12 3 7 4v7l-5 7-8-2-2-9 4-6z" /> : null}
    </svg>
  );
}

const nav = [
  { to: '/admin', label: 'Overview', icon: 'overview' as const, end: true },
  { to: '/admin/detections', label: 'Detections', icon: 'detections' as const },
  { to: '/admin/evaluations', label: 'Evaluations', icon: 'evaluations' as const },
  { to: '/admin/models', label: 'Models', icon: 'models' as const },
  { to: '/admin/review', label: 'Review', icon: 'review' as const },
];

export function AdminLayout() {
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <nav aria-label="Admin workbench">
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
  );
}
