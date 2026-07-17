'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useCustomerProfile, useCustomerMetrics, useCustomerActivity, useUpdateConsent } from '@/lib/hooks';
import { Badge, Button, Card, LoadingState, StatCard } from '@/app/components/ui';
import type { Tone } from '@/lib/constants';

const CONSENT_TONE: Record<string, Tone> = {
  OPTED_IN: 'success',
  OPTED_OUT: 'danger',
  UNKNOWN: 'neutral',
};

export default function CustomerDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: profileRes, isLoading: profileLoading, error } = useCustomerProfile(id);
  const { data: metricsRes } = useCustomerMetrics(id);
  const { data: activityRes } = useCustomerActivity(id);
  const updateConsent = useUpdateConsent();

  if (profileLoading) {
    return <LoadingState />;
  }

  const customer = profileRes?.data;

  if (error || !customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-sm font-medium" style={{ color: 'var(--color-accent-rose)' }}>
          {(error as Error)?.message || 'Customer not found.'}
        </p>
        <Link href="/customers" className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>← Back to Customers</Link>
      </div>
    );
  }

  const metrics = metricsRes?.data;
  const activity = activityRes?.data ?? [];
  const consentStatus = customer.consentStatus ?? 'UNKNOWN';

  const toggleConsent = () => {
    const next = consentStatus === 'OPTED_OUT' ? 'OPTED_IN' : 'OPTED_OUT';
    updateConsent.mutate({ customerId: id, consentStatus: next });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/customers" className="text-xs font-medium mb-2 inline-block" style={{ color: 'var(--color-text-muted)' }}>
            ← Back to Customers
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
            <Badge tone={CONSENT_TONE[consentStatus]} uppercase={false}>
              {consentStatus === 'OPTED_OUT' ? 'Opted out' : consentStatus === 'OPTED_IN' ? 'Opted in' : 'Unknown'}
            </Badge>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {customer.email} {customer.phone && <>· {customer.phone}</>} {customer.city && <>· {customer.city}</>}
          </p>
        </div>

        <Button
          variant={consentStatus === 'OPTED_OUT' ? 'success' : 'secondary'}
          size="sm"
          onClick={toggleConsent}
          loading={updateConsent.isPending}
        >
          {consentStatus === 'OPTED_OUT' ? 'Re-subscribe' : 'Unsubscribe'}
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Orders"
          value={metrics?.totalOrders ?? customer.orders.length}
          tone={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}
          uppercaseLabel
        />
        <StatCard
          label="Lifetime Spend"
          value={`₹${(metrics?.lifetimeSpend ?? 0).toLocaleString('en-IN')}`}
          tone={{ background: 'var(--color-accent-green-soft)', color: 'var(--color-accent-green)' }}
          uppercaseLabel
        />
        <StatCard
          label="Avg Order Value"
          value={`₹${(metrics?.averageOrderValue ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          tone={{ background: 'var(--color-accent-blue-soft)', color: 'var(--color-accent-blue)' }}
          uppercaseLabel
        />
        <StatCard
          label="Last Purchase"
          value={metrics?.lastPurchaseDate ? new Date(metrics.lastPurchaseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
          tone={{ background: 'var(--color-accent-amber-soft)', color: 'var(--color-accent-amber)' }}
          uppercaseLabel
        />
      </div>

      {/* Activity timeline */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h3 className="text-sm font-semibold mb-4">Activity Timeline</h3>
        <Card className="overflow-hidden">
          {activity.length === 0 ? (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
              No activity recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {activity.map((entry, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-3.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs"
                    style={{
                      background: entry.type === 'order' ? 'var(--color-accent-green-soft)' : 'var(--color-primary-soft)',
                      color: entry.type === 'order' ? 'var(--color-accent-green)' : 'var(--color-primary)',
                    }}
                  >
                    {entry.type === 'order' ? '🛍' : '✉️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.title}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{entry.detail}</p>
                  </div>
                  {entry.status && (
                    <Badge tone="neutral" uppercase={false}>{entry.status}</Badge>
                  )}
                  <span className="text-xs whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                    {new Date(entry.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
