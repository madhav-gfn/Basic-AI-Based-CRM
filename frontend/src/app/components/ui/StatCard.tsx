import type { CSSProperties, ReactNode } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: string; // image src, mutually exclusive with `badge`
  badge?: ReactNode; // pre-rendered node (emoji, number, etc.)
  tone?: CSSProperties;
  uppercaseLabel?: boolean;
  delay?: number;
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  badge,
  tone,
  uppercaseLabel = false,
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-5 hover:shadow-sm transition-shadow"
    >
      {(icon || badge) && (
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 text-xs font-bold"
          style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)', ...tone }}
        >
          {icon ? <Image src={icon} alt={label} width={20} height={20} className="opacity-80" /> : badge}
        </div>
      )}
      <p className="text-2xl font-bold">{value}</p>
      <p
        className={
          uppercaseLabel
            ? 'text-[10px] font-bold uppercase tracking-wider mt-1'
            : 'text-xs font-medium mt-1'
        }
        style={{ color: 'var(--color-text-muted)' }}
      >
        {label}
      </p>
      {sub && (
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {sub}
        </p>
      )}
    </motion.div>
  );
}
