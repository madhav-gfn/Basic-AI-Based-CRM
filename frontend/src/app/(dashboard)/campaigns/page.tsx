'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { type Campaign } from '@/lib/api';
import { useCampaigns } from '@/lib/hooks';
import { CAMPAIGN_STATUS_TONE, CHANNEL_ICONS } from '@/lib/constants';
import { Badge, Button, Card, EmptyState, LoadingState } from '@/app/components/ui';

export default function CampaignsPage() {
  const { data: res, isLoading } = useCampaigns();
  const campaigns: Campaign[] = res?.data ?? [];

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link href="/campaigns/new">
          <Button>+ New Campaign</Button>
        </Link>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Campaign</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Audience</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Channel</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Status</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {campaigns.map((c, i) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="transition-colors hover:bg-[var(--color-surface-hover)]"
                >
                  <td className="px-6 py-4">
                    <Link href={`/campaigns/${c.id}`} className="font-semibold hover:text-[var(--color-primary)] transition-colors">
                      {c.name}
                    </Link>
                    {c.objective && (
                      <p className="text-xs mt-0.5 text-[var(--color-text-muted)] truncate max-w-xs">{c.objective}</p>
                    )}
                  </td>
                  <td className="px-4 py-4 text-[var(--color-text-muted)]">{c.audience?.name ?? '—'}</td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1.5">
                      <span>{CHANNEL_ICONS[c.channel] || ''}</span>
                      <span className="text-xs font-medium">{c.channel}</span>
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <Badge tone={CAMPAIGN_STATUS_TONE[c.status] || 'neutral'}>{c.status}</Badge>
                  </td>
                  <td className="px-4 py-4 text-xs text-[var(--color-text-muted)]">
                    {new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {campaigns.length === 0 && <EmptyState title="No campaigns yet. Create your first one!" />}
        </Card>
      </motion.div>
    </div>
  );
}
