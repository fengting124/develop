import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ArrowRight(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </IconBase>
  );
}

export function ArrowLeft(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </IconBase>
  );
}

export function Close(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </IconBase>
  );
}

export function Check(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m5 12 4 4L19 6" />
    </IconBase>
  );
}

export function Plus(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </IconBase>
  );
}

export function ChevronDown(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m6 9 6 6 6-6" />
    </IconBase>
  );
}

export function Spinner(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3a9 9 0 1 1-8 5" />
    </IconBase>
  );
}

export function ImageFrame(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 5h16v14H4z" />
      <path d="M7 15c2-4 4-4 6 0 1.4-2.2 2.8-2.2 4.2 0" />
      <path d="M8 9h.1" />
      <path d="M10 11c1.4-1.2 2.8-1.2 4.2 0" />
    </IconBase>
  );
}

export function FilmReel(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 6h14v12H5z" />
      <path d="M8 6v12" />
      <path d="M16 6v12" />
      <path d="M8 9h8" />
      <path d="M8 15h8" />
      <path d="M11 11.2 14 13l-3 1.8z" />
    </IconBase>
  );
}
