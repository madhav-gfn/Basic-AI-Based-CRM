import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { Tone } from '@/lib/constants';

const TONE_STYLES: Record<Tone, CSSProperties> = {
  primary: { background: 'var(--color-primary-soft)', color: 'var(--color-primary)' },
  success: { background: 'var(--color-accent-green-soft)', color: 'var(--color-accent-green)' },
  warning: { background: 'var(--color-accent-amber-soft)', color: 'var(--color-accent-amber)' },
  danger: { background: 'var(--color-accent-rose-soft)', color: 'var(--color-accent-rose)' },
  info: { background: 'var(--color-accent-blue-soft)', color: 'var(--color-accent-blue)' },
  neutral: { background: 'var(--color-chip)', color: 'var(--color-text-muted)' },
};

export function Badge({
  tone = 'neutral',
  children,
  className,
  uppercase = true,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  uppercase?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider whitespace-nowrap',
        uppercase && 'uppercase',
        className
      )}
      style={TONE_STYLES[tone]}
    >
      {children}
    </span>
  );
}
