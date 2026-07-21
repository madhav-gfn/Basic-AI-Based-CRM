import { randomUUID } from "crypto";
import type { ChannelProvider, SendPayload, SendResult } from "./types";

// Local dev default is 3004; production sets CRM_RECEIPT_URL.
const CRM_RECEIPT_URL =
  process.env.CRM_RECEIPT_URL?.trim().replace(/\/+$/, "") ??
  "http://localhost:3001/api/webhooks/receipt";

type SimulatedEvent = "SENT" | "DELIVERED" | "OPENED" | "READ" | "CLICKED" | "FAILED";

interface WebhookPayload {
  event_id: string;
  communication_id: string;
  event_type: SimulatedEvent;
  timestamp: string;
}

/**
 * Outcome weights — spread controls probability without a math lib.
 * DELIVERED: 25% | OPENED: 30% | CLICKED: 20% | FAILED: 15% | (implies SENT first)
 */
const OUTCOME_POOL: SimulatedEvent[] = [
  "DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED",
  "OPENED",    "OPENED",    "OPENED",    "OPENED",    "OPENED",    "OPENED",
  "READ",      "READ",      "READ",
  "CLICKED",   "CLICKED",   "CLICKED",   "CLICKED",
  "FAILED",    "FAILED",    "FAILED",
];

/**
 * Event chains — every terminal outcome implies all preceding delivery steps.
 * Sending these in sequence is far more realistic than a single event.
 *
 *   FAILED    → [SENT, FAILED]
 *   DELIVERED → [SENT, DELIVERED]
 *   OPENED    → [SENT, DELIVERED, OPENED]
 *   READ      → [SENT, DELIVERED, OPENED, READ]
 *   CLICKED   → [SENT, DELIVERED, OPENED, READ, CLICKED]
 */
const EVENT_CHAIN: Record<SimulatedEvent, SimulatedEvent[]> = {
  SENT:      ["SENT"],
  FAILED:    ["SENT", "FAILED"],
  DELIVERED: ["SENT", "DELIVERED"],
  OPENED:    ["SENT", "DELIVERED", "OPENED"],
  READ:      ["SENT", "DELIVERED", "OPENED", "READ"],
  CLICKED:   ["SENT", "DELIVERED", "OPENED", "READ", "CLICKED"],
};

/** Returns a random integer between min and max (inclusive). */
const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/** Picks a random element from an array. */
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** Promise-based delay. */
const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

// ─────────────────────────────────────────────────────────────────────────────
// Webhook dispatcher
// Fires each event in the chain with a small inter-event gap so the CRM
// receives them in correct sequence (but deliberately not guaranteed —
// network jitter is simulated by the random initial delay).
// ─────────────────────────────────────────────────────────────────────────────

async function dispatchEventChain(
  communicationId: string,
  outcome: SimulatedEvent
): Promise<void> {
  const chain = EVENT_CHAIN[outcome];

  for (const eventType of chain) {
    const payload: WebhookPayload = {
      event_id: randomUUID(),
      communication_id: communicationId,
      event_type: eventType,
      timestamp: new Date().toISOString(),
    };

    const maxRetries = 2;
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= maxRetries) {
      try {
        const res = await fetch(CRM_RECEIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} -> ${CRM_RECEIPT_URL}`);
        } else {
          console.log(
            `[Simulator] ✓ Fired ${eventType} for comm ${communicationId} -> ${CRM_RECEIPT_URL}`
          );
        }
        break;
      } catch (err) {
        lastError = err as Error;
        attempt += 1;
        if (attempt > maxRetries) {
          console.error(
            `[Simulator] Network error dispatching ${eventType} to ${CRM_RECEIPT_URL}:`,
            lastError.message
          );
        } else {
          await delay(100 * attempt);
        }
      }
    }

    // Small inter-event gap (300–800 ms) so the CRM can process in sequence
    if (chain.indexOf(eventType) < chain.length - 1) {
      await delay(randInt(300, 800));
    }
  }
}

/**
 * SimulatorProvider — the default provider for every channel. Fakes delivery
 * by picking a random outcome and firing the matching webhook chain back to
 * the CRM after a random 2–10s delay. Ignores `recipient` entirely; it exists
 * only so real providers further down the registry have something to send to.
 */
export const simulatorProvider: ChannelProvider = {
  name: "simulator",

  async send(payload: SendPayload): Promise<SendResult> {
    const outcome = pick(OUTCOME_POOL);
    const deliveryDelayMs = randInt(2_000, 10_000);

    setTimeout(() => {
      dispatchEventChain(payload.communication_id, outcome).catch((err) =>
        console.error("[Simulator] Unhandled dispatch error:", err)
      );
    }, deliveryDelayMs);

    console.log(
      `[Simulator] Queued comm ${payload.communication_id} | ` +
      `outcome: ${outcome} | delay: ${deliveryDelayMs}ms`
    );

    return { accepted: true };
  },
};
