'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getSegments, type Segment } from '@/lib/api';

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSegments()
      .then((res) => setSegments(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-[var(--color-primary-soft)] border-t-[var(--color-primary)] rounded-full animate-spin" />
      </div>
    );
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
              className="bg-white rounded-xl border border-[var(--color-border)] p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold truncate">{seg.name}</h3>
                {def.operator && (
                  <span
                    className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                    style={{
                      background: def.operator === 'AND' ? 'var(--color-accent-blue-soft)' : 'var(--color-accent-amber-soft)',
                      color: def.operator === 'AND' ? 'var(--color-accent-blue)' : 'var(--color-accent-amber)',
                    }}
                  >
                    {def.operator}
                  </span>
                )}
              </div>

              {/* Rules */}
              {rules.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {rules.map((rule: any, j: number) => (
                    <div key={j} className="flex items-center justify-between px-2.5 py-1.5 bg-gray-50 rounded-md">
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
                    <div key={key} className="flex items-center justify-between px-2.5 py-1.5 bg-gray-50 rounded-md">
                      <span className="text-[11px] font-medium text-[var(--color-text-muted)]">{key}</span>
                      <span className="text-[11px] font-bold">{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
                <span className="text-[10px] font-medium text-[var(--color-text-muted)]">
                  by {seg.createdBy}
                </span>
                <span className="text-[10px] font-medium text-[var(--color-text-muted)]">
                  {new Date(seg.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {segments.length === 0 && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-12 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">No segments created yet.</p>
        </div>
      )}
    </div>
  );
}
