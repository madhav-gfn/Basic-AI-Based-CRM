import type { ReactNode } from 'react';

export function EmptyState({
  title,
  icon,
  action,
  className = 'py-16',
}: {
  title: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 px-6 text-center ${className}`}>
      {icon && <div className="text-3xl opacity-60">{icon}</div>}
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        {title}
      </p>
      {action}
    </div>
  );
}
