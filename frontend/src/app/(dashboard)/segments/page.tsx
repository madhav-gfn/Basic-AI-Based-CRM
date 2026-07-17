'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { type Segment } from '@/lib/api';
import { useSegments } from '@/lib/hooks';
import { Badge, Card, EmptyState, LoadingState } from '@/app/components/ui';

export default function SegmentsPage() {
  const { data: res, isLoading } = useSegments();
  const segments: Segment[] = res?.data ?? [];

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Segments</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {segments.length} audience segment{segments.length !== 1 ? 's' : ''} defined.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {segments.map((seg, i) => {
          const def = seg.definition as any;
          const rules = def?.rules ?? [];
          const filterEntries = Object.entries(def).filter(
            ([key]) => key !== 'rules' && key !== 'operator'
          );

          return (
            <motion.div
              key={seg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card hover className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold truncate">{seg.name}</h3>
                  {def.operator && (
                    <Badge tone={def.operator === 'AND' ? 'info' : 'warning'} className="text-[9px]">
                      {def.operator}
                    </Badge>
                  )}
                </div>

                {/* Rules */}
                {rules.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {rules.map((rule: any, j: number) => (
                      <div key={j} className="flex items-center justify-between px-2.5 py-1.5 bg-[var(--color-surface-muted)] rounded-md">
                        <span className="text-[11px] font-medium text-[var(--color-text-muted)]">{rule.field}</span>
                        <span className="text-[11px] font-bold">
                          {rule.op} {Array.isArray(rule.value) ? rule.value.join(', ') : String(rule.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Flat filters */}
                {filterEntries.length > 0 && rules.length === 0 && (
                  <div className="space-y-1.5 mb-3">
                    {filterEntries.map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between px-2.5 py-1.5 bg-[var(--color-surface-muted)] rounded-md">
                        <span className="text-[11px] font-medium text-[var(--color-text-muted)]">{key}</span>
                        <span className="text-[11px] font-bold">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
                  <span className="text-[10px] font-medium text-[var(--color-text-muted)]">by {seg.createdBy}</span>
                  <span className="text-[10px] font-medium text-[var(--color-text-muted)]">
                    {new Date(seg.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {segments.length === 0 && (
        <Card>
          <EmptyState title="No segments created yet." className="py-12" />
        </Card>
      )}
    </div>
  );
}
