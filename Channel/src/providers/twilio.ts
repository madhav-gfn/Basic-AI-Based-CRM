import type { ChannelProvider, SendPayload, SendResult } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// TwilioProvider — real SMS/WhatsApp send via Twilio's Messages API. Inert
// until TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN are set (see Channel/env.example);
// activate per channel with SMS_PROVIDER=twilio and/or WHATSAPP_PROVIDER=twilio.
//
// WhatsApp note: unlike SMS, Twilio's WhatsApp sender must be a Meta-approved
// WhatsApp Business number, and any message sent outside a 24h customer-service
// window must use a pre-approved message template (free-text marketing blasts
// are rejected by Meta) — this adapter sends `payload.message` as free text,
// which only works inside that 24h window or in sandbox testing.
//
// TODO (when going live): Twilio posts delivery status to the `StatusCallback`
// URL given at send time (queued/sent/delivered/failed/read). Add a route
// (this service, or Backend/src/controllers/webhook.controller.ts) that:
//   1. Validates the Twilio request signature (X-Twilio-Signature).
//   2. Maps Twilio's MessageStatus -> CRM CommunicationEvent types.
//   3. Recovers communication_id from a query param on the callback URL
//      (append it when POSTing below, e.g. `${CRM_RECEIPT_URL}?comm=...`)
//      and forwards the normalized receipt to CRM_RECEIPT_URL.
// ─────────────────────────────────────────────────────────────────────────────

function twilioApiUrl(accountSid: string): string {
  return `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
}

async function sendViaTwilio(
  payload: SendPayload,
  fromEnvVar: string,
  addressPrefix: "" | "whatsapp:"
): Promise<SendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env[fromEnvVar];

  if (!accountSid || !authToken || !from) {
    const error = `Twilio provider not configured — set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and ${fromEnvVar}.`;
    console.error(`[Twilio] ${error}`);
    return { accepted: false, error };
  }

  if (!payload.recipient) {
    const error = `Twilio send for comm ${payload.communication_id} missing recipient phone number.`;
    console.error(`[Twilio] ${error}`);
    return { accepted: false, error };
  }

  try {
    const body = new URLSearchParams({
      To: `${addressPrefix}${payload.recipient}`,
      From: `${addressPrefix}${from}`,
      Body: payload.message,
    });

    const res = await fetch(twilioApiUrl(accountSid), {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const responseBody = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };

    if (!res.ok) {
      const error = `Twilio HTTP ${res.status}: ${responseBody.message ?? "unknown error"}`;
      console.error(`[Twilio] ${error}`);
      return { accepted: false, error };
    }

    console.log(
      `[Twilio] ✓ Sent comm ${payload.communication_id} -> ${payload.recipient} (sid: ${responseBody.sid})`
    );
    return { accepted: true, providerMessageId: responseBody.sid };
  } catch (err) {
    const error = `Twilio request failed: ${(err as Error).message}`;
    console.error(`[Twilio] ${error}`);
    return { accepted: false, error };
  }
}

export const twilioSmsProvider: ChannelProvider = {
  name: "twilio-sms",
  send: (payload) => sendViaTwilio(payload, "TWILIO_FROM", ""),
};

export const twilioWhatsAppProvider: ChannelProvider = {
  name: "twilio-whatsapp",
  send: (payload) => sendViaTwilio(payload, "TWILIO_WHATSAPP_FROM", "whatsapp:"),
};
