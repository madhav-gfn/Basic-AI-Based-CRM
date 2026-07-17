'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { type MessageTemplate } from '@/lib/api';
import { useTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate } from '@/lib/hooks';
import { CHANNEL_ICONS } from '@/lib/constants';
import { Badge, Button, Card, CardBody, CardFooter, CardHeader, EmptyState, LoadingState, Modal } from '@/app/components/ui';

const INPUT_CLASS =
  'bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg text-sm px-3 py-2.5 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary-soft)] transition-all';

interface FormState {
  name: string;
  channel: string;
  body: string;
  description: string;
}

const EMPTY_FORM: FormState = { name: '', channel: 'EMAIL', body: '', description: '' };

export default function TemplatesPage() {
  const { data: res, isLoading } = useTemplates();
  const templates: MessageTemplate[] = res?.data ?? [];

  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (t: MessageTemplate) => {
    setEditingId(t.id);
    setForm({ name: t.name, channel: t.channel, body: t.body, description: t.description ?? '' });
    setError(null);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const handleSubmit = async () => {
    setError(null);
    try {
      if (editingId) {
        await updateTemplate.mutateAsync({ id: editingId, ...form });
      } else {
        await createTemplate.mutateAsync(form);
      }
      setModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save template.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    await deleteTemplate.mutateAsync(id);
  };

  if (isLoading) {
    return <LoadingState />;
  }

  const saving = createTemplate.isPending || updateTemplate.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Message Templates</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Reusable campaign copy — {templates.length} template{templates.length !== 1 ? 's' : ''}.
          </p>
        </div>
        <Button onClick={openCreate}>+ New Template</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <Card hover className="p-5 flex flex-col h-full">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold truncate">{t.name}</h3>
                <Badge tone="neutral" uppercase={false}>
                  {CHANNEL_ICONS[t.channel] ?? ''} {t.channel}
                </Badge>
              </div>

              <p className="text-xs flex-1 mb-3 line-clamp-4" style={{ color: 'var(--color-text-muted)' }}>
                {t.body}
              </p>

              {t.description && (
                <p className="text-[11px] mb-3 italic" style={{ color: 'var(--color-text-muted)' }}>
                  {t.description}
                </p>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
                <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  by {t.createdBy}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(t)}
                    className="text-xs font-medium"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="text-xs font-medium"
                    style={{ color: 'var(--color-accent-rose)' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {templates.length === 0 && (
        <Card>
          <EmptyState
            title="No templates yet."
            className="py-12"
            action={<Button size="sm" onClick={openCreate}>+ New Template</Button>}
          />
        </Card>
      )}

      <Modal open={modalOpen} onClose={closeModal}>
        <CardHeader>
          <h3 className="font-semibold text-lg">{editingId ? 'Edit Template' : 'New Template'}</h3>
          <button onClick={closeModal} aria-label="Close" className="text-lg leading-none" style={{ color: 'var(--color-text-muted)' }}>✕</button>
        </CardHeader>

        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={INPUT_CLASS}
                placeholder="Welcome Email"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Channel</label>
              <select
                value={form.channel}
                onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}
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
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Message Body</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              className={`${INPUT_CLASS} min-h-[100px] resize-none`}
              placeholder="Hi {name}, here's something special for you in {city}!"
            />
            <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              Supports {'{name}'}, {'{city}'}, {'{email}'} tokens.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Description (optional)</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={INPUT_CLASS}
              placeholder="Used for the post-signup welcome flow"
            />
          </div>

          {error && (
            <p className="text-xs font-medium" style={{ color: 'var(--color-accent-rose)' }}>{error}</p>
          )}
        </CardBody>

        <CardFooter className="justify-end">
          <Button variant="secondary" onClick={closeModal} disabled={saving}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !form.name.trim() || !form.body.trim()}
            loading={saving}
          >
            {editingId ? 'Save Changes' : 'Create Template'}
          </Button>
        </CardFooter>
      </Modal>
    </div>
  );
}
