'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  suggestSegment,
  createSegment,
  draftCampaign,
  updateCampaignStatus,
  type DraftCampaignResponse,
} from '../../../lib/api';

type Step = 'input' | 'segment-review' | 'campaign-draft' | 'done';

interface SegmentSuggestion {
  filters: Record<string, any>;
  explanation: string;
  audienceCount: number;
}

export default function NewCampaignPage() {
  const router = useRouter();

  // ── Form state ──────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('Re-engagement');
  const [prompt, setPrompt] = useState('');

  // ── Step state ──────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Data between steps ─────────────────────────────────────────────────
  const [segmentSuggestion, setSegmentSuggestion] = useState<SegmentSuggestion | null>(null);
  const [savedSegmentId, setSavedSegmentId] = useState<string | null>(null);
  const [draftResult, setDraftResult] = useState<DraftCampaignResponse['data'] | null>(null);

  // ── Step 1: AI suggests segment filters ────────────────────────────────
  const handleSuggestSegment = async () => {
    if (!prompt.trim()) {
      setError('Please describe your target audience.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await suggestSegment(prompt);
      setSegmentSuggestion(res.data);
      setStep('segment-review');
    } catch (err: any) {
      setError(err.message || 'Failed to generate segment.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Save segment and draft campaign ───────────────────────────
  const handleConfirmAndDraft = async () => {
    if (!segmentSuggestion || !name.trim()) return;
    setError(null);
    setLoading(true);

    try {
      // Save the segment
      const segmentName = `${name} — AI Audience`;
      const segRes = await createSegment({
        name: segmentName,
        filters: segmentSuggestion.filters,
        createdBy: 'user',
      });

      const audienceId = segRes.data.segment.id;
      setSavedSegmentId(audienceId);

      // Draft the campaign with AI
      const draftRes = await draftCampaign({
        name,
        objective,
        audienceId,
      });

      setDraftResult(draftRes.data);
      setStep('campaign-draft');
    } catch (err: any) {
      setError(err.message || 'Failed to draft campaign.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Schedule and execute ──────────────────────────────────────
  const handleExecute = async () => {
    if (!draftResult) return;
    setError(null);
    setLoading(true);

    try {
      await updateCampaignStatus(draftResult.campaign.id, 'SCHEDULED');
      setStep('done');
      // Navigate to the campaign analytics page after a brief delay
      setTimeout(() => router.push(`/campaigns/${draftResult.campaign.id}`), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to schedule campaign.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step indicator ────────────────────────────────────────────────────
  const steps = [
    { key: 'input', label: 'Describe Audience' },
    { key: 'segment-review', label: 'Review Segment' },
    { key: 'campaign-draft', label: 'AI Draft' },
  ];

  const currentStepIdx = steps.findIndex((s) => s.key === step);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <span style={{ color: 'var(--color-primary)' }}>✦</span> Campaign Copilot
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Describe your goal in plain English — AI handles segmentation, channel selection, and copywriting.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <React.Fragment key={s.key}>
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  background: i <= currentStepIdx ? 'var(--color-primary)' : 'var(--color-border)',
                  color: i <= currentStepIdx ? 'white' : 'var(--color-text-muted)',
                }}
              >
                {i + 1}
              </div>
              <span
                className="text-xs font-medium transition-colors"
                style={{ color: i <= currentStepIdx ? 'var(--color-text)' : 'var(--color-text-muted)' }}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="flex-1 h-px mx-2"
                style={{ background: i < currentStepIdx ? 'var(--color-primary)' : 'var(--color-border)' }}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-3 rounded-lg text-sm font-medium"
          style={{ background: 'var(--color-accent-rose-soft)', color: '#c0392b' }}
        >
          {error}
        </motion.div>
      )}

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {/* ── STEP 1: Input ──────────────────────────────────────────────── */}
        {step === 'input' && (
          <motion.div
            key="input"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Left: Form */}
            <div className="bg-white rounded-xl border border-[var(--color-border)] flex flex-col">
              <div className="px-6 py-4 border-b border-[var(--color-border)] bg-gray-50/30">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <span style={{ color: 'var(--color-primary)' }}>✦</span> Campaign Details
                </h2>
              </div>
              <div className="p-6 flex-1 flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Campaign Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-white border border-[var(--color-border)] rounded-lg text-sm px-3 py-2.5 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary-soft)] transition-all"
                      placeholder="Summer Win-Back"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Objective</label>
                    <select
                      value={objective}
                      onChange={(e) => setObjective(e.target.value)}
                      className="bg-white border border-[var(--color-border)] rounded-lg text-sm px-3 py-2.5 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary-soft)] transition-all"
                    >
                      <option>Re-engagement</option>
                      <option>Promotional Broadcast</option>
                      <option>Cart Abandonment</option>
                      <option>Post-Purchase Upsell</option>
                      <option>New Product Launch</option>
                      <option>Loyalty Reward</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Describe your audience</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="flex-1 min-h-[160px] bg-white border border-[var(--color-border)] rounded-lg text-sm p-4 resize-none outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary-soft)] transition-all"
                    placeholder="e.g. 'High-spending female customers in Mumbai who bought beauty products in the last 30 days'"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-[var(--color-border)] bg-gray-50/30 flex justify-end">
                <button
                  onClick={handleSuggestSegment}
                  disabled={loading || !prompt.trim() || !name.trim()}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>✦ Generate Segment</>
                  )}
                </button>
              </div>
            </div>

            {/* Right: Help */}
            <div className="bg-white rounded-xl border border-[var(--color-border)] p-6 flex flex-col justify-center items-center text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-2xl" style={{ background: 'var(--color-primary-soft)' }}>
                ✦
              </div>
              <h3 className="text-lg font-bold mb-2">AI-Powered Workflow</h3>
              <p className="text-sm leading-relaxed max-w-sm" style={{ color: 'var(--color-text-muted)' }}>
                Describe your target audience in natural language. Our AI will translate it into database filters,
                find matching customers, suggest the best channel, and write the campaign message — all in one flow.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-4 text-center w-full max-w-sm">
                <div>
                  <p className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>1</p>
                  <p className="text-[10px] font-medium text-[var(--color-text-muted)]">Describe</p>
                </div>
                <div>
                  <p className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>2</p>
                  <p className="text-[10px] font-medium text-[var(--color-text-muted)]">Review</p>
                </div>
                <div>
                  <p className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>3</p>
                  <p className="text-[10px] font-medium text-[var(--color-text-muted)]">Launch</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: Segment Review ─────────────────────────────────────── */}
        {step === 'segment-review' && segmentSuggestion && (
          <motion.div
            key="segment-review"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Segment Details */}
            <div className="bg-white rounded-xl border border-[var(--color-border)]">
              <div className="px-6 py-4 border-b border-[var(--color-border)] bg-gray-50/30 flex items-center justify-between">
                <h2 className="text-sm font-semibold">AI-Suggested Segment</h2>
                <span
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: 'var(--color-accent-green-soft)', color: 'var(--color-accent-green)' }}
                >
                  {segmentSuggestion.audienceCount} customers matched
                </span>
              </div>
              <div className="p-6 space-y-4">
                <div className="p-4 rounded-lg" style={{ background: 'var(--color-primary-soft)' }}>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
                    {segmentSuggestion.explanation}
                  </p>
                </div>

                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Applied Filters</h3>
                  <div className="space-y-2">
                    {Object.entries(segmentSuggestion.filters)
                      .filter(([, v]) => v !== null && v !== undefined)
                      .map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                          <span className="text-xs font-medium text-[var(--color-text-muted)]">{key}</span>
                          <span className="text-xs font-bold">{String(value)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-[var(--color-border)] bg-gray-50/30 flex justify-between">
                <button
                  onClick={() => setStep('input')}
                  className="text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleConfirmAndDraft}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all shadow-sm hover:shadow-md disabled:opacity-40 flex items-center gap-2"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Drafting Campaign...
                    </>
                  ) : (
                    'Confirm & Draft Campaign →'
                  )}
                </button>
              </div>
            </div>

            {/* Preview card */}
            <div className="bg-white rounded-xl border border-[var(--color-border)] p-6 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center mb-4 text-4xl font-bold" style={{ background: 'var(--color-accent-green-soft)', color: 'var(--color-accent-green)' }}>
                {segmentSuggestion.audienceCount}
              </div>
              <p className="text-sm font-semibold mb-1">Customers Matched</p>
              <p className="text-xs max-w-xs" style={{ color: 'var(--color-text-muted)' }}>
                This segment will be saved and the AI copilot will draft a personalized campaign for this audience.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: Campaign Draft ─────────────────────────────────────── */}
        {step === 'campaign-draft' && draftResult && (
          <motion.div
            key="campaign-draft"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Draft Details */}
            <div className="bg-white rounded-xl border border-[var(--color-border)]">
              <div className="px-6 py-4 border-b border-[var(--color-border)] bg-gray-50/30 flex items-center justify-between">
                <h2 className="text-sm font-semibold">AI Campaign Draft</h2>
                <span
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}
                >
                  Draft Ready
                </span>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">AI Rationale</h3>
                  <p className="text-sm leading-relaxed">{draftResult.aiExplanation}</p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg text-center" style={{ background: 'var(--color-accent-blue-soft)' }}>
                    <p className="text-lg font-bold" style={{ color: 'var(--color-accent-blue)' }}>{draftResult.audienceMetrics.audienceSize}</p>
                    <p className="text-[10px] font-medium text-[var(--color-text-muted)]">Audience</p>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ background: 'var(--color-accent-green-soft)' }}>
                    <p className="text-lg font-bold" style={{ color: 'var(--color-accent-green)' }}>₹{Math.round(draftResult.audienceMetrics.averageOrderValue)}</p>
                    <p className="text-[10px] font-medium text-[var(--color-text-muted)]">Avg. Order</p>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ background: 'var(--color-accent-amber-soft)' }}>
                    <p className="text-lg font-bold" style={{ color: 'var(--color-accent-amber)' }}>₹{(draftResult.audienceMetrics.totalRevenue / 1000).toFixed(0)}K</p>
                    <p className="text-[10px] font-medium text-[var(--color-text-muted)]">Revenue</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-[var(--color-border)] bg-gray-50/30 flex justify-between">
                <button
                  onClick={() => setStep('segment-review')}
                  className="text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleExecute}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all shadow-sm hover:shadow-md disabled:opacity-40 flex items-center gap-2"
                  style={{ background: 'var(--color-accent-green)' }}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    '🚀 Schedule & Execute'
                  )}
                </button>
              </div>
            </div>

            {/* Message Preview */}
            <div className="bg-white rounded-xl border border-[var(--color-border)] flex flex-col">
              <div className="px-6 py-4 border-b border-[var(--color-border)] bg-gray-50/30">
                <h2 className="text-sm font-semibold">Message Preview</h2>
              </div>
              <div className="flex-1 p-6 flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
                <div className="w-full max-w-sm bg-white rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden">
                  <div className="px-5 py-3 flex items-center justify-between" style={{ background: 'var(--color-primary)' }}>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">{draftResult.campaign.channel}</span>
                    <span className="text-white/60 text-xs">Preview</span>
                  </div>
                  <div className="p-5">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{draftResult.campaign.message}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── DONE ──────────────────────────────────────────────────────── */}
        {step === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl border border-[var(--color-border)] p-12 text-center"
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl" style={{ background: 'var(--color-accent-green-soft)' }}>
              ✓
            </div>
            <h2 className="text-xl font-bold mb-2">Campaign Scheduled!</h2>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Redirecting to campaign analytics...
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
