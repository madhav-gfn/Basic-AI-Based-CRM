import type { ChannelProvider, SendPayload, SendResult } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// ResendProvider — real email send via Resend's HTTP API. Inert until
// RESEND_API_KEY is set (see Channel/env.example); activate by setting
// EMAIL_PROVIDER=resend.
//
// TODO (when going live): Resend fires its own delivery-event webhooks
// (email.delivered / email.opened / email.clicked / email.bounced, etc.) to
// a URL you configure in the Resend dashboard. Add a route in this service
// (or directly in Backend/src/controllers/webhook.controller.ts) that:
//   1. Verifies the Resend webhook signature (svix headers).
//   2. Maps Resend's event names -> CRM CommunicationEvent types
//      (delivered -> DELIVERED, opened -> OPENED, clicked -> CLICKED,
//       bounced/complained -> FAILED).
//   3. Recovers our communication_id from the `tags` set on send (below) and
//      forwards { event_id, communication_id, event_type, timestamp } to
//      CRM_RECEIPT_URL exactly like the simulator does.
// ─────────────────────────────────────────────────────────────────────────────

const RESEND_API_URL = "https://api.resend.com/emails";

export const resendProvider: ChannelProvider = {
  name: "resend",

  async send(payload: SendPayload): Promise<SendResult> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM;

    if (!apiKey || !from) {
      const error = "Resend provider not configured — set RESEND_API_KEY and RESEND_FROM.";
      console.error(`[Resend] ${error}`);
      return { accepted: false, error };
    }

    if (!payload.recipient) {
      const error = `Resend send for comm ${payload.communication_id} missing recipient email.`;
      console.error(`[Resend] ${error}`);
      return { accepted: false, error };
    }

    try {
      const res = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [payload.recipient],
          subject: "New message", // TODO: thread a real subject line through the campaign/journey message model
          text: payload.message,
          // Lets the Resend webhook (once wired) recover our own ID.
          tags: [{ name: "communication_id", value: payload.communication_id }],
        }),
      });

      const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };

      if (!res.ok) {
        const error = `Resend HTTP ${res.status}: ${body.message ?? "unknown error"}`;
        console.error(`[Resend] ${error}`);
        return { accepted: false, error };
      }

      console.log(`[Resend] ✓ Sent comm ${payload.communication_id} -> ${payload.recipient} (id: ${body.id})`);
      return { accepted: true, providerMessageId: body.id };
    } catch (err) {
      const error = `Resend request failed: ${(err as Error).message}`;
      console.error(`[Resend] ${error}`);
      return { accepted: false, error };
    }
  },
};
