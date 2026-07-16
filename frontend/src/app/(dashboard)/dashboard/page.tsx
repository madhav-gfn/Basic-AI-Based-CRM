'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { getDashboardStats, type Campaign } from '@/lib/api';
import { CAMPAIGN_STATUS_TONE, CHANNEL_ICONS } from '@/lib/constants';
import { Badge, Button, Card, CardHeader, EmptyState, LoadingState, StatCard } from '@/app/components/ui';

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
    return <LoadingState />;
  }

  if (!stats) {
    return <EmptyState title="Failed to load dashboard." />;
  }

  const statCards = [
    { label: 'Total Customers', value: stats.totalCustomers.toLocaleString(), icon: '/customers.png', tone: { background: 'var(--color-primary-soft)', color: 'var(--color-primary)' } },
    { label: 'Total Orders', value: stats.totalOrders.toLocaleString(), icon: '/orders.png', tone: { background: 'var(--color-accent-green-soft)', color: 'var(--color-accent-green)' } },
    { label: 'Revenue', value: `₹${(stats.totalRevenue / 100000).toFixed(1)}L`, icon: '/revenue.png', tone: { background: 'var(--color-accent-amber-soft)', color: 'var(--color-accent-amber)' } },
    { label: 'Campaigns', value: stats.totalCampaigns.toString(), icon: '/campaign.png', tone: { background: 'var(--color-accent-blue-soft)', color: 'var(--color-accent-blue)' } },
    { label: 'Segments', value: stats.totalSegments.toString(), icon: '/segment.png', tone: { background: 'var(--color-accent-rose-soft)', color: 'var(--color-accent-rose)' } },
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
        <Link href="/campaigns/new">
          <Button>+ New Campaign</Button>
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card, i) => (
          <StatCard key={card.label} label={card.label} value={card.value} icon={card.icon} tone={card.tone} delay={i * 0.05} />
        ))}
      </div>

      {/* Recent Campaigns */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Recent Campaigns</h2>
            <Link href="/campaigns" className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
              View all →
            </Link>
          </CardHeader>
          <div className="divide-y divide-[var(--color-border)]">
            {stats.recentCampaigns.map((campaign) => (
              <Link
                key={campaign.id}
                href={`/campaigns/${campaign.id}`}
                className="flex items-center px-6 py-4 transition-colors hover:bg-[var(--color-surface-hover)]"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{campaign.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {campaign.audience?.name ?? 'Unknown audience'} · {CHANNEL_ICONS[campaign.channel] || ''} {campaign.channel}
                  </p>
                </div>
                <Badge tone={CAMPAIGN_STATUS_TONE[campaign.status] || 'neutral'} className="shrink-0">
                  {campaign.status}
                </Badge>
              </Link>
            ))}
            {stats.recentCampaigns.length === 0 && <EmptyState title="No campaigns yet." className="py-8" />}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
