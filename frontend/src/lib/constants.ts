// ─────────────────────────────────────────────────────────────────────────────
// Shared display constants — single source of truth so campaign status colors
// and channel icons don't drift between the dashboard, campaigns list, and
// campaign detail pages.
// ─────────────────────────────────────────────────────────────────────────────

export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export const CAMPAIGN_STATUS_TONE: Record<string, Tone> = {
  COMPLETED: 'success',
  RUNNING: 'info',
  SCHEDULED: 'warning',
  DRAFT: 'neutral',
  FAILED: 'danger',
};

export const CHANNEL_ICONS: Record<string, string> = {
  WHATSAPP: '💬',
  EMAIL: '✉️',
  SMS: '📱',
  RCS: '🔗',
};

export const JOURNEY_STATUS_TONE: Record<string, Tone> = {
  ACTIVE: 'success',
  PAUSED: 'warning',
  DRAFT: 'neutral',
  ARCHIVED: 'danger',
};

export const JOURNEY_TRIGGER_LABELS: Record<string, string> = {
  CUSTOMER_CREATED: 'On signup',
  ORDER_PLACED: 'On order placed',
  SEGMENT_ENTRY: 'On entering segment',
};
