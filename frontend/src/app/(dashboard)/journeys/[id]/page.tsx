'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useJourney, useJourneyEnrollments, useUpdateJourneyStatus } from '@/lib/hooks';
import { JOURNEY_STATUS_TONE, JOURNEY_TRIGGER_LABELS, CHANNEL_ICONS } from '@/lib/constants';
import { Badge, Button, Card, LoadingState, StatCard } from '@/app/components/ui';
import type { JourneyStatus } from '@/lib/api';

export default function JourneyDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: res, isLoading, error } = useJourney(id);
  const { data: enrollmentsRes } = useJourneyEnrollments(id);
  const updateStatus = useUpdateJourneyStatus();

  if (isLoading) {
    return <LoadingState />;
  }

  const journey = res?.data;

  if (error || !journey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-sm font-medium" style={{ color: 'var(--color-accent-rose)' }}>
          {(error as Error)?.message || 'Journey not found.'}
        </p>
        <Link href="/journeys" className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>← Back to Journeys</Link>
      </div>
    );
  }

  const stats = journey.enrollmentStats ?? { ACTIVE: 0, COMPLETED: 0, EXITED: 0 };
  const enrollments = enrollmentsRes?.data ?? [];

  const nextStatus: Partial<Record<string, JourneyStatus>> = {
    DRAFT: 'ACTIVE',
    ACTIVE: 'PAUSED',
    PAUSED: 'ACTIVE',
  };
  const actionLabel: Record<string, string> = {
    DRAFT: 'Activate',
    ACTIVE: 'Pause',
    PAUSED: 'Resume',
  };
  const target = nextStatus[journey.status];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/journeys" className="text-xs font-medium mb-2 inline-block" style={{ color: 'var(--color-text-muted)' }}>
            ← Back to Journeys
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{journey.name}</h1>
            <Badge tone={JOURNEY_STATUS_TONE[journey.status] || 'neutral'}>{journey.status}</Badge>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {JOURNEY_TRIGGER_LABELS[journey.triggerType] ?? journey.triggerType}
            {journey.triggerSegment && <> · {journey.triggerSegment.name}</>}
          </p>
        </div>

        {target && (
          <Button
            variant={journey.status === 'ACTIVE' ? 'secondary' : 'success'}
            onClick={() => updateStatus.mutate({ id: journey.id, status: target })}
            loading={updateStatus.isPending}
          >
            {actionLabel[journey.status]}
          </Button>
        )}
      </div>

      {/* Enrollment stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Active" value={stats.ACTIVE} tone={{ background: 'var(--color-accent-blue-soft)', color: 'var(--color-accent-blue)' }} uppercaseLabel />
        <StatCard label="Completed" value={stats.COMPLETED} tone={{ background: 'var(--color-accent-green-soft)', color: 'var(--color-accent-green)' }} uppercaseLabel />
        <StatCard label="Exited" value={stats.EXITED} tone={{ background: 'var(--color-accent-rose-soft)', color: 'var(--color-accent-rose)' }} uppercaseLabel />
      </div>

      {/* Step timeline */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h3 className="text-sm font-semibold mb-4">Steps</h3>
        <div className="space-y-3">
          {(journey.steps ?? []).map((step, i) => (
            <Card key={step.id} className="p-4 flex items-center gap-4">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{step.message}</p>
              </div>
              <Badge tone="neutral" uppercase={false}>
                {CHANNEL_ICONS[step.channel] ?? ''} {step.channel}
              </Badge>
              <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                {i === 0 ? 'Immediately' : `+${step.delayHours}h`}
              </span>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Recent enrollments */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h3 className="text-sm font-semibold mb-4">Recent Enrollments</h3>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Customer</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Step</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Status</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Enrolled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {enrollments.map((e) => (
                <tr key={e.id} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                  <td className="px-6 py-3.5">
                    <p className="font-medium">{e.customer?.name ?? '—'}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{e.customer?.email}</p>
                  </td>
                  <td className="px-4 py-3.5 text-[var(--color-text-muted)]">
                    {e.status === 'COMPLETED' ? 'Finished' : `Step ${e.currentStepIndex + 1}`}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge
                      tone={e.status === 'ACTIVE' ? 'info' : e.status === 'COMPLETED' ? 'success' : 'danger'}
                      uppercase={false}
                    >
                      {e.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-[var(--color-text-muted)]">
                    {new Date(e.enrolledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {enrollments.length === 0 && (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
              No enrollments yet — they'll appear here once the trigger condition is met.
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
