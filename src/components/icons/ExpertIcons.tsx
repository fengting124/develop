interface ExpertIconProps {
  size?: number;
  color?: string;
}

export const TextureIcon = ({ size = 56, color = 'var(--ink)' }: ExpertIconProps) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden="true">
    <g stroke={color} strokeWidth="1.5" strokeLinecap="round">
      <line x1="14" y1="38" x2="42" y2="10" />
      <line x1="10" y1="42" x2="38" y2="14" />
      <line x1="18" y1="42" x2="46" y2="14" />
      <line x1="14" y1="46" x2="42" y2="18" />
      <line x1="22" y1="46" x2="50" y2="18" />
      <line x1="18" y1="50" x2="46" y2="22" />
    </g>
    <circle cx="42" cy="14" r="2" fill="var(--accent)" />
  </svg>
);

export const SpectrumIcon = ({ size = 56, color = 'var(--ink)' }: ExpertIconProps) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden="true">
    <g stroke={color} fill="none">
      <circle cx="28" cy="28" r="22" strokeWidth="1" opacity="0.3" />
      <circle cx="28" cy="28" r="16" strokeWidth="1.2" opacity="0.5" />
      <circle cx="28" cy="28" r="10" strokeWidth="1.4" opacity="0.7" />
      <circle cx="28" cy="28" r="5" strokeWidth="1.5" />
    </g>
    <circle cx="28" cy="28" r="2" fill="var(--accent)" />
    <line x1="28" y1="2" x2="28" y2="6" stroke={color} strokeWidth="1.5" />
  </svg>
);

export const StyleIcon = ({ size = 56, color = 'var(--ink)' }: ExpertIconProps) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden="true">
    <path
      d="M 8 36 Q 16 18, 28 24 T 48 20"
      stroke={color}
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
    />
    <path d="M 48 20 L 45 18 L 45 22 Z" fill={color} />
    <circle cx="8" cy="36" r="3" fill="none" stroke={color} strokeWidth="1.5" />
    <line x1="14" y1="42" x2="22" y2="38" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    <line x1="32" y1="34" x2="40" y2="30" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
  </svg>
);

export const SemanticIcon = ({ size = 56, color = 'var(--ink)' }: ExpertIconProps) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden="true">
    <g stroke={color} strokeWidth="1.2" fill="none" opacity="0.6">
      <line x1="12" y1="14" x2="28" y2="24" />
      <line x1="28" y1="24" x2="44" y2="14" />
      <line x1="28" y1="24" x2="20" y2="40" />
      <line x1="28" y1="24" x2="40" y2="40" />
      <line x1="20" y1="40" x2="40" y2="40" />
    </g>
    <circle cx="12" cy="14" r="2.5" fill={color} />
    <circle cx="44" cy="14" r="2.5" fill={color} />
    <circle cx="28" cy="24" r="3" fill="var(--accent)" />
    <circle cx="20" cy="40" r="2.5" fill={color} />
    <circle cx="40" cy="40" r="2.5" fill={color} />
  </svg>
);
