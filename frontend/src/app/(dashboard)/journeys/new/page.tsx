'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type JourneyTriggerType } from '@/lib/api';
import { useCreateJourney } from '@/lib/hooks';
import { useSegments } from '@/lib/hooks';
import { Button, Card, CardBody, CardFooter, CardHeader } from '@/app/components/ui';

const INPUT_CLASS =
  'bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg text-sm px-3 py-2.5 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary-soft)] transition-all';

interface StepDraft {
  delayHours: number;
  channel: string;
  message: string;
}

const EMPTY_STEP: StepDraft = { delayHours: 0, channel: 'EMAIL', message: '' };

export default function NewJourneyPage() {
  const router = useRouter();
  const { data: segmentsRes } = useSegments();
  const segments = segmentsRes?.data ?? [];
  const createJourney = useCreateJourney();

  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState<JourneyTriggerType>('CUSTOMER_CREATED');
  const [triggerSegmentId, setTriggerSegmentId] = useState('');
  const [steps, setSteps] = useState<StepDraft[]>([{ ...EMPTY_STEP }]);
  const [error, setError] = useState<string | null>(null);

  const updateStep = (index: number, patch: Partial<StepDraft>) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const addStep = () => setSteps((prev) => [...prev, { ...EMPTY_STEP }]);
  const removeStep = (index: number) => setSteps((prev) => prev.filter((_, i) => i !== index));

  const canSubmit =
    name.trim().length > 0 &&
    steps.length > 0 &&
    steps.every((s) => s.message.trim().length > 0) &&
    (triggerType !== 'SEGMENT_ENTRY' || !!triggerSegmentId);

  const handleSubmit = async () => {
    setError(null);
    try {
      const result = await createJourney.mutateAsync({
        name,
        triggerType,
        ...(triggerType === 'SEGMENT_ENTRY' ? { triggerSegmentId } : {}),
        steps: steps.map((s) => ({
          delayHours: Number(s.delayHours) || 0,
          channel: s.channel,
          message: s.message,
        })),
      });
      router.push(`/journeys/${result.data.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create journey.');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/journeys" className="text-xs font-medium mb-2 inline-block" style={{ color: 'var(--color-text-muted)' }}>
          ← Back to Journeys
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">New Journey</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Automatically enroll customers when a trigger fires, then send an ordered, timed sequence of messages.
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-sm">Journey Details</h2>
        </CardHeader>
        <CardBody className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Journey Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={INPUT_CLASS}
              placeholder="Welcome Series"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Trigger</label>
              <select
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value as JourneyTriggerType)}
                className={INPUT_CLASS}
              >
                <option value="CUSTOMER_CREATED">On signup</option>
                <option value="ORDER_PLACED">On order placed</option>
                <option value="SEGMENT_ENTRY">On entering a segment</option>
              </select>
            </div>

            {triggerType === 'SEGMENT_ENTRY' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Segment</label>
                <select
                  value={triggerSegmentId}
                  onChange={(e) => setTriggerSegmentId(e.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="">Select a segment…</option>
                  {segments.map((seg) => (
                    <option key={seg.id} value={seg.id}>
                      {seg.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Steps</h2>
          <Button variant="secondary" size="sm" onClick={addStep}>+ Add Step</Button>
        </CardHeader>
        <CardBody className="space-y-4">
          {steps.map((step, i) => (
            <div key={i} className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>Step {i + 1}</span>
                {steps.length > 1 && (
                  <button
                    onClick={() => removeStep(i)}
                    className="text-xs font-medium"
                    style={{ color: 'var(--color-accent-rose)' }}
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                    {i === 0 ? 'Send immediately' : 'Wait (hours after previous step)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={step.delayHours}
                    onChange={(e) => updateStep(i, { delayHours: parseInt(e.target.value) || 0 })}
                    className={INPUT_CLASS}
                    disabled={i === 0}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Channel</label>
                  <select
                    value={step.channel}
                    onChange={(e) => updateStep(i, { channel: e.target.value })}
                    className={INPUT_CLASS}
                  >
                    <option value="EMAIL">Email</option>
                    <option value="SMS">SMS</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="RCS">RCS</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Message</label>
                <textarea
                  value={step.message}
                  onChange={(e) => updateStep(i, { message: e.target.value })}
                  className={`${INPUT_CLASS} min-h-[80px] resize-none`}
                  placeholder="Hi {name}, welcome to Saucer AI! Here's 10% off your first order."
                />
              </div>
            </div>
          ))}
        </CardBody>
        <CardFooter className="justify-between items-center">
          {error && (
            <p className="text-xs font-medium" style={{ color: 'var(--color-accent-rose)' }}>{error}</p>
          )}
          <div className="ml-auto flex gap-3">
            <Link href="/journeys">
              <Button variant="secondary">Cancel</Button>
            </Link>
            <Button onClick={handleSubmit} disabled={!canSubmit || createJourney.isPending} loading={createJourney.isPending}>
              Create Journey
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
