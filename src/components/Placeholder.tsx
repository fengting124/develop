interface PlaceholderProps {
  name: string;
}

export function Placeholder({ name }: PlaceholderProps) {
  return (
    <div style={{ padding: '64px', fontFamily: 'var(--font-serif)' }}>
      <h1 style={{ fontSize: 'var(--text-3xl)' }}>{name}</h1>
      <p style={{ marginTop: '24px', color: 'var(--ink-2)' }}>等待实现</p>
    </div>
  );
}
