import type { Communication } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Shared dispatch primitives — used by both CampaignExecution and Journeys so
// the two send paths hit the channel service identically and render the same
// personalisation tokens. Keeping this in one place means a future channel
// integration only needs to change here, not in every caller.
// ─────────────────────────────────────────────────────────────────────────────

// Local dev default is 3004; production sets CHANNEL_SERVICE_URL to the
// Channel service's real deployed URL (see render.yaml).
const CHANNEL_URL = process.env.CHANNEL_SERVICE_URL ?? "http://localhost:3004";

export interface DispatchPayload {
  communication_id: string; // our Prisma ID — simulator echoes it in callbacks
  customer_id: string;
  campaign_id: string; // channel service treats this as an opaque grouping ID
  channel: string;
  message: string;
  // Email address or phone number, chosen by channel. The simulator ignores
  // it; a real provider (Resend/Twilio, see Channel/src/providers) needs it
  // to actually send. Optional so a missing contact never blocks dispatch —
  // it just means a real provider would reject that one communication.
  recipient?: string;
}

/** Per-customer contact info needed to address a real provider send. */
export interface CustomerContact {
  email: string;
  phone: string | null;
}

export type DispatchOutcome =
  | { status: "fulfilled"; communicationId: string }
  | { status: "rejected"; communicationId: string; reason: string };

/** Splits an array into sequential chunks of a given size. */
export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Renders a message template for a single customer.
 * Substitutes {name}, {city}, {email} tokens (case-insensitive) with the
 * customer's own values. Unknown tokens are stripped so no customer ever
 * receives a literal "{name}". Missing values fall back to a friendly default.
 */
export function renderMessage(
  template: string,
  customer: { name: string; city: string | null; email: string }
): string {
  const values: Record<string, string> = {
    name: customer.name?.trim() || "there",
    city: customer.city?.trim() || "your city",
    email: customer.email,
  };

  return template.replace(/\{\s*(\w+)\s*\}/g, (_match, token: string) => {
    const key = token.toLowerCase();
    return key in values ? values[key] : "";
  });
}

/**
 * Dispatches a single chunk of communications concurrently to the channel
 * service. Uses Promise.allSettled — one failed request does NOT abort the rest.
 * `groupId` is sent as `campaign_id` in the payload (the channel service treats
 * it as opaque); journeys pass their journeyId so simulator logs stay legible.
 */
export async function dispatchChunk(
  communications: Communication[],
  groupId: string,
  contactById?: Map<string, CustomerContact>
): Promise<DispatchOutcome[]> {
  const settled = await Promise.allSettled(
    communications.map(async (comm) => {
      const contact = contactById?.get(comm.customerId);
      // WhatsApp/SMS need a phone number; everything else (EMAIL, RCS) uses email.
      const recipient =
        comm.channel === "SMS" || comm.channel === "WHATSAPP"
          ? contact?.phone ?? undefined
          : contact?.email;

      const payload: DispatchPayload = {
        communication_id: comm.id,
        customer_id: comm.customerId,
        campaign_id: groupId,
        channel: comm.channel,
        message: comm.message,
        recipient,
      };

      const res = await fetch(`${CHANNEL_URL}/simulator/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Channel returned HTTP ${res.status} for comm ${comm.id}`);
      }

      return comm.id;
    })
  );

  return settled.map((result, i) =>
    result.status === "fulfilled"
      ? { status: "fulfilled", communicationId: result.value }
      : { status: "rejected", communicationId: communications[i].id, reason: String(result.reason) }
  );
}
