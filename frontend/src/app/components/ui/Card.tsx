import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Card({
  className,
  hover = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div
      className={cn(
        'bg-[var(--color-card)] rounded-xl border border-[var(--color-border)]',
        hover && 'transition-shadow hover:shadow-sm',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] flex items-center justify-between gap-3',
        className
      )}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6', className)} {...props} />;
}

/** No default `justify-*` — pass `justify-end` or `justify-between` via className. */
export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface-muted)] flex items-center gap-3',
        className
      )}
      {...props}
    />
  );
}
