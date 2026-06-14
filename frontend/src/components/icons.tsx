// Набор контурных иконок оГород (rounded-stroke, 24×24, ~1.9) — замена эмодзи.
// Наследуют цвет через currentColor. См. design_handoff_home_map.
import type { ReactNode, SVGProps } from 'react';

type IcoProps = { size?: number } & SVGProps<SVGSVGElement>;

function Ico({ size = 22, children, ...rest }: IcoProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const PinIcon = (p: IcoProps) => (
  <Ico {...p}>
    <path d="M12 21c-4-4.5-7-7.8-7-11a7 7 0 0 1 14 0c0 3.2-3 6.5-7 11z" />
    <circle cx="12" cy="10" r="2.4" />
  </Ico>
);

export const RefreshIcon = (p: IcoProps) => (
  <Ico {...p}>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    <path d="M3 21v-5h5" />
  </Ico>
);

export const FieldIcon = (p: IcoProps) => (
  <Ico {...p}>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="M8 9v6M12 9v6M16 9v6" />
  </Ico>
);

export const BookIcon = (p: IcoProps) => (
  <Ico {...p}>
    <path d="M12 6c-1.6-1-4.2-1.5-6.3-1.5V18c2.1 0 4.7.5 6.3 1.5 1.6-1 4.2-1.5 6.3-1.5V4.5c-2.1 0-4.7.5-6.3 1.5z" />
    <path d="M12 6v13.5" />
  </Ico>
);

// Монета — заливочная (карротовые тона), не контурная.
export function CoinIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="var(--carrot-400)" />
      <circle cx="12" cy="12" r="9" fill="none" stroke="var(--carrot-700)" strokeWidth="1.4" opacity="0.45" />
      <circle cx="12" cy="12" r="5.5" fill="none" stroke="var(--carrot-700)" strokeWidth="1.4" opacity="0.5" />
    </svg>
  );
}
