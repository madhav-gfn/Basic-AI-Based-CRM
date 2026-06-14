'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { getCampaigns, type Campaign } from '@/lib/api';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  COMPLETED: { bg: 'var(--color-accent-green-soft)', text: 'var(--color-accent-green)' },
  RUNNING: { bg: 'var(--color-accent-blue-soft)', text: 'var(--color-accent-blue)' },
  SCHEDULED: { bg: 'var(--color-accent-amber-soft)', text: 'var(--color-accent-amber)' },
  DRAFT: { bg: '#f3f4f6', text: 'var(--color-text-muted)' },
  FAILED: { bg: 'var(--color-accent-rose-soft)', text: 'var(--color-accent-rose)' },
};

const CHANNEL_ICONS: Record<string, string> = {
  WHATSAPP: '💬',
  EMAIL: '✉️',
  SMS: '📱',
  RCS: '🔗',
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCampaigns()
      .then((res) => setCampaigns(res.data))
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link
          href="/campaigns/new"
          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all shadow-sm hover:shadow-md"
          style={{ background: 'var(--color-primary)' }}
        >
          + New Campaign
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden"
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-gray-50/50">
              <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Campaign</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Audience</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Channel</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Status</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {campaigns.map((c, i) => {
              const statusStyle = STATUS_COLORS[c.status] || STATUS_COLORS.DRAFT;
              return (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <Link href={`/campaigns/${c.id}`} className="font-semibold hover:text-[var(--color-primary)] transition-colors">
                      {c.name}
                    </Link>
                    {c.objective && (
                      <p className="text-xs mt-0.5 text-[var(--color-text-muted)] truncate max-w-xs">{c.objective}</p>
                    )}
                  </td>
                  <td className="px-4 py-4 text-[var(--color-text-muted)]">
                    {c.audience?.name ?? '—'}
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1.5">
                      <span>{CHANNEL_ICONS[c.channel] || ''}</span>
                      <span className="text-xs font-medium">{c.channel}</span>
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: statusStyle.bg, color: statusStyle.text }}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-[var(--color-text-muted)]">
                    {new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
        {campaigns.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">No campaigns yet. Create your first one!</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
