'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { getDashboardStats, type Campaign } from '../lib/api';

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

export default function DashboardPage() {
  const [stats, setStats] = useState<{
    totalCustomers: number;
    totalOrders: number;
    totalCampaigns: number;
    totalSegments: number;
    totalRevenue: number;
    recentCampaigns: Campaign[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then((res) => setStats(res.data))
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

  if (!stats) return <p className="text-[var(--color-text-muted)]">Failed to load dashboard.</p>;

  const statCards = [
    { label: 'Total Customers', value: stats.totalCustomers.toLocaleString(), color: 'var(--color-primary)', bg: 'var(--color-primary-soft)' },
    { label: 'Total Orders', value: stats.totalOrders.toLocaleString(), color: 'var(--color-accent-green)', bg: 'var(--color-accent-green-soft)' },
    { label: 'Revenue', value: `₹${(stats.totalRevenue / 100000).toFixed(1)}L`, color: 'var(--color-accent-amber)', bg: 'var(--color-accent-amber-soft)' },
    { label: 'Campaigns', value: stats.totalCampaigns.toString(), color: 'var(--color-accent-blue)', bg: 'var(--color-accent-blue-soft)' },
    { label: 'Segments', value: stats.totalSegments.toString(), color: 'var(--color-accent-rose)', bg: 'var(--color-accent-rose-soft)' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Overview of your CRM performance and recent activity.
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

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-xl border border-[var(--color-border)] p-5 hover:shadow-sm transition-shadow"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 text-sm font-bold"
              style={{ background: card.bg, color: card.color }}
            >
              {card.value.charAt(0) === '₹' ? '₹' : '#'}
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs font-medium mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {card.label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Recent Campaigns */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent Campaigns</h2>
          <Link href="/campaigns" className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
            View all →
          </Link>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {stats.recentCampaigns.map((campaign) => {
            const statusStyle = STATUS_COLORS[campaign.status] || STATUS_COLORS.DRAFT;
            return (
              <Link
                key={campaign.id}
                href={`/campaigns/${campaign.id}`}
                className="flex items-center px-6 py-4 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{campaign.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {campaign.audience?.name ?? 'Unknown audience'} · {CHANNEL_ICONS[campaign.channel] || ''} {campaign.channel}
                  </p>
                </div>
                <span
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0"
                  style={{ background: statusStyle.bg, color: statusStyle.text }}
                >
                  {campaign.status}
                </span>
              </Link>
            );
          })}
          {stats.recentCampaigns.length === 0 && (
            <div className="px-6 py-8 text-center">
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No campaigns yet.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
