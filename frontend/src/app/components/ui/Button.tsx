'use client';

import type { ButtonHTMLAttributes, CSSProperties } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'success' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANT_STYLES: Record<Variant, { className: string; style?: CSSProperties }> = {
  primary: {
    className: 'text-white shadow-sm hover:shadow-md',
    style: { background: 'var(--color-primary)' },
  },
  success: {
    className: 'text-white shadow-sm hover:shadow-md',
    style: { background: 'var(--color-accent-green)' },
  },
  danger: {
    className: 'text-white shadow-sm hover:shadow-md',
    style: { background: 'var(--color-accent-rose)' },
  },
  secondary: {
    className: 'border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-surface-hover)]',
    style: { color: 'var(--color-text)' },
  },
  ghost: {
    className: 'hover:bg-[var(--color-surface-hover)]',
    style: { color: 'var(--color-text-muted)' },
  },
};

const SIZE_STYLES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-5 py-2.5 text-sm rounded-lg',
  lg: 'px-6 py-3 text-sm rounded-lg',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  style,
  ...props
}: ButtonProps) {
  const v = VARIANT_STYLES[variant];
  const spinnerTone = variant === 'secondary' || variant === 'ghost' ? 'default' : 'inverse';

  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition-all',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none',
        SIZE_STYLES[size],
        v.className,
        className
      )}
      style={{ ...v.style, ...style }}
      {...props}
    >
      {loading && <Spinner size={14} tone={spinnerTone} />}
      {children}
    </button>
  );
}
