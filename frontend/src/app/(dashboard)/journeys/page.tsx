'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { type Journey } from '@/lib/api';
import { useJourneys } from '@/lib/hooks';
import { JOURNEY_STATUS_TONE, JOURNEY_TRIGGER_LABELS } from '@/lib/constants';
import { Badge, Button, Card, EmptyState, LoadingState } from '@/app/components/ui';

export default function JourneysPage() {
  const { data: res, isLoading } = useJourneys();
  const journeys: Journey[] = res?.data ?? [];

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Journeys</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Trigger-based automation — {journeys.length} journey{journeys.length !== 1 ? 's' : ''} configured.
          </p>
        </div>
        <Link href="/journeys/new">
          <Button>+ New Journey</Button>
        </Link>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Journey</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Trigger</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Steps</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Active</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {journeys.map((j, i) => (
                <motion.tr
                  key={j.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="transition-colors hover:bg-[var(--color-surface-hover)]"
                >
                  <td className="px-6 py-4">
                    <Link href={`/journeys/${j.id}`} className="font-semibold hover:text-[var(--color-primary)] transition-colors">
                      {j.name}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-[var(--color-text-muted)]">
                    {JOURNEY_TRIGGER_LABELS[j.triggerType] ?? j.triggerType}
                    {j.triggerSegment && (
                      <span className="ml-1.5 font-medium" style={{ color: 'var(--color-text)' }}>
                        · {j.triggerSegment.name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-[var(--color-text-muted)]">{j._count?.steps ?? 0}</td>
                  <td className="px-4 py-4">
                    <Badge tone="info" uppercase={false}>{j.activeEnrollments ?? 0} active</Badge>
                  </td>
                  <td className="px-4 py-4">
                    <Badge tone={JOURNEY_STATUS_TONE[j.status] || 'neutral'}>{j.status}</Badge>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {journeys.length === 0 && (
            <EmptyState
              title="No journeys yet. Build a welcome series or win-back flow."
              action={
                <Link href="/journeys/new">
                  <Button size="sm">+ New Journey</Button>
                </Link>
              }
            />
          )}
        </Card>
      </motion.div>
    </div>
  );
}
