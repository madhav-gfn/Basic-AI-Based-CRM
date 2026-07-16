'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getCampaignAnalytics, type CampaignMetrics, type CampaignInsights } from '@/lib/api';
import { Badge, Card, LoadingState, StatCard } from '@/app/components/ui';

export default function CampaignDashboardPage() {
  const params = useParams();
  const id = params.id as string;

  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);
  const [insights, setInsights] = useState<CampaignInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getCampaignAnalytics(id)
      .then((res) => {
        setMetrics(res.data.metrics);
        setInsights(res.data.insights);
      })
      .catch((err) => setError(err.message || 'Failed to load analytics.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <LoadingState />;
  }

  if (error || !metrics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-sm font-medium" style={{ color: 'var(--color-accent-rose)' }}>{error || 'Data not found.'}</p>
        <Link href="/campaigns" className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>← Back to Campaigns</Link>
      </div>
    );
  }

  const funnelCards = [
    {
      title: 'Audience',
      value: metrics.audienceSize.toLocaleString(),
      sub: 'Total recipients',
      tone: { background: 'var(--color-primary-soft)', color: 'var(--color-primary)' },
    },
    {
      title: 'Delivered',
      value: `${metrics.rates.deliveredRate}%`,
      sub: `${metrics.counts.delivered} / ${metrics.counts.sent}`,
      tone: { background: 'var(--color-accent-blue-soft)', color: 'var(--color-accent-blue)' },
    },
    {
      title: 'Opened',
      value: `${metrics.rates.openedRate}%`,
      sub: `${metrics.counts.opened} / ${metrics.counts.delivered}`,
      tone: { background: 'var(--color-accent-green-soft)', color: 'var(--color-accent-green)' },
    },
    {
      title: 'Clicked',
      value: `${metrics.rates.clickedRate}%`,
      sub: `${metrics.counts.clicked} / ${metrics.counts.opened}`,
      tone: { background: 'var(--color-accent-amber-soft)', color: 'var(--color-accent-amber)' },
    },
    {
      title: 'Conversions',
      value: `${metrics.rates.conversionRate}%`,
      sub: `${metrics.conversions} conversions (7-day)`,
      tone: { background: 'var(--color-accent-rose-soft)', color: 'var(--color-accent-rose)' },
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/campaigns" className="text-xs font-medium mb-2 inline-block" style={{ color: 'var(--color-text-muted)' }}>
            ← Back to Campaigns
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Campaign Analytics</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Real-time performance metrics and AI-driven insights.
          </p>
        </div>
        {metrics.counts.failed > 0 && <Badge tone="danger">{metrics.counts.failed} failed</Badge>}
      </div>

      {/* AI Insights */}
      {insights && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-start gap-3" style={{ background: 'var(--color-primary-soft)' }}>
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-base font-bold"
                style={{ background: 'var(--color-primary)', color: 'white' }}
              >
                ✦
              </div>
              <div>
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  Copilot Insights
                  <Badge tone="neutral" className="bg-[var(--color-card)] border border-[var(--color-border)]">AI Generated</Badge>
                </h2>
                <p className="text-sm mt-1.5 leading-relaxed" style={{ color: 'var(--color-text)' }}>
                  {insights.executiveSummary}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--color-border)]">
              <div className="p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-accent-green)' }}>Top Metric</p>
                <p className="text-sm font-medium">{insights.topPerformingMetric}</p>
              </div>
              <div className="p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-accent-rose)' }}>Bottleneck</p>
                <p className="text-sm font-medium">{insights.bottleneck}</p>
              </div>
              <div className="p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-primary)' }}>Recommended Action</p>
                <p className="text-sm font-medium">{insights.recommendedAction}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Funnel Cards */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h3 className="text-sm font-semibold mb-4">Delivery Funnel</h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {funnelCards.map((card, i) => (
            <StatCard
              key={card.title}
              label={card.title}
              value={card.value}
              sub={card.sub}
              badge={i + 1}
              tone={card.tone}
              uppercaseLabel
              delay={0.15 + i * 0.05}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
