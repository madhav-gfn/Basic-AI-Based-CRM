import { cn } from '@/lib/cn';

type SpinnerTone = 'default' | 'inverse';

const TONE_CLASSES: Record<SpinnerTone, string> = {
  default: 'border-[var(--color-primary-soft)] border-t-[var(--color-primary)]',
  inverse: 'border-white/30 border-t-white',
};

export function Spinner({
  size = 32,
  tone = 'default',
  className,
}: {
  size?: number;
  tone?: SpinnerTone;
  className?: string;
}) {
  return (
    <span
      className={cn('inline-block rounded-full animate-spin', TONE_CLASSES[tone], className)}
      style={{ width: size, height: size, borderWidth: Math.max(2, Math.round(size / 10)), borderStyle: 'solid' }}
    />
  );
}

export function LoadingState({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <Spinner size={32} />
      {label && (
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {label}
        </p>
      )}
    </div>
  );
}
