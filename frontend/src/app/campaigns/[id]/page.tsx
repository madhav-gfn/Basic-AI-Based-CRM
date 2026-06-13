'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import { getCampaignAnalytics, CampaignAnalyticsResponse } from '../../../lib/api';

export default function CampaignDashboardPage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<CampaignAnalyticsResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await getCampaignAnalytics(id);
        if (response.success) {
          setData(response.data);
        } else {
          setError('Failed to load analytics.');
        }
      } catch (err) {
        setError('An error occurred while fetching analytics.');
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchAnalytics();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full"
        />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 text-red-500 font-medium">
        {error || 'Data not found.'}
      </div>
    );
  }

  const { metrics, insights } = data;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Campaign Analytics</h1>
          <p className="text-gray-500 mt-2">Real-time performance metrics and AI-driven insights for your campaign.</p>
        </header>

        {insights && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
          >
            <div className="p-6 border-b border-gray-100 bg-indigo-50/30 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 border border-indigo-200">
                <span className="text-indigo-600 font-bold text-xl">✦</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  Copilot Insights
                  <span className="px-2 py-0.5 rounded-full bg-white border border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">AI Generated</span>
                </h2>
                <p className="text-gray-600 mt-2 max-w-4xl leading-relaxed text-sm">
                  {insights.executiveSummary}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              <div className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2 mb-2 text-gray-500">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Top Metric</span>
                </div>
                <p className="text-sm text-gray-900 font-medium">{insights.topPerformingMetric}</p>
              </div>

              <div className="p-6 bg-red-50/20 hover:bg-red-50/40 transition-colors">
                <div className="flex items-center gap-2 mb-2 text-red-500">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Bottleneck</span>
                </div>
                <p className="text-sm text-gray-900 font-medium">{insights.bottleneck}</p>
              </div>

              <div className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2 mb-2 text-indigo-600">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Recommended Action</span>
                </div>
                <p className="text-sm text-gray-900 font-medium">{insights.recommendedAction}</p>
              </div>
            </div>
          </motion.section>
        )}

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6">Funnel Performance</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Delivery Rate"
              value={`${metrics.rates.deliveredRate}%`}
              count={metrics.counts.delivered}
              total={metrics.counts.sent}
              label="Delivered"
            />
            <MetricCard
              title="Open Rate"
              value={`${metrics.rates.openedRate}%`}
              count={metrics.counts.opened}
              total={metrics.counts.delivered}
              label="Opened"
            />
            <MetricCard
              title="Click Rate"
              value={`${metrics.rates.clickedRate}%`}
              count={metrics.counts.clicked}
              total={metrics.counts.opened}
              label="Clicked"
            />
            <MetricCard
              title="Conversion Rate"
              value={`${metrics.rates.conversionRate}%`}
              count={metrics.conversions}
              total={metrics.counts.clicked}
              label="7-Day Conversions"
              highlight
            />
          </div>
        </motion.section>
      </div>
    </main>
  );
}

function MetricCard({ title, value, count, total, label, highlight = false }: any) {
  return (
    <div className={`bg-white border ${highlight ? 'border-indigo-200 ring-1 ring-indigo-50' : 'border-gray-200'} rounded-xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group`}>
      <div className="flex justify-between items-start mb-4">
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{title}</span>
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-bold ${highlight ? 'text-indigo-600' : 'text-gray-900'}`}>{value}</span>
        </div>
        <p className="text-xs text-gray-500 mt-2 font-medium">
          {count} {label} / {total} Total
        </p>
      </div>
    </div>
  );
}
