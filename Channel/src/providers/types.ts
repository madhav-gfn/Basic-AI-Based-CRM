// ─────────────────────────────────────────────────────────────────────────────
// Provider abstraction — every channel (EMAIL, SMS, WHATSAPP, RCS) resolves to
// one ChannelProvider via the registry (./index.ts). Swapping the simulator for
// a real provider later means adding/enabling an adapter file here, not
// touching index.ts's routing or the CRM's dispatch pipeline.
// ─────────────────────────────────────────────────────────────────────────────

export interface SendPayload {
  communication_id: string;
  customer_id: string;
  campaign_id: string;
  channel: string;
  message: string;
  // Email address or E.164 phone number. Required by real providers; the
  // simulator ignores it. Optional so the simulator-only demo path never
  // breaks against older callers that don't send it yet.
  recipient?: string;
}

export interface SendResult {
  accepted: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface ChannelProvider {
  name: string;
  send(payload: SendPayload): Promise<SendResult>;
}
