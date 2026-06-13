import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SendPayload {
  customer_id: string;
  campaign_id: string;
  channel: string;
  message: string;
}

type SimulatedEvent = "DELIVERED" | "OPENED" | "CLICKED" | "FAILED";

interface WebhookPayload {
  event_id: string;
  communication_id: string;
  event_type: SimulatedEvent;
  timestamp: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Event simulation config
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Outcome weights — spread controls probability without a math lib.
 * DELIVERED: 30% | OPENED: 35% | CLICKED: 20% | FAILED: 15%
 */
const OUTCOME_POOL: SimulatedEvent[] = [
  "DELIVERED", "DELIVERED", "DELIVERED",
  "OPENED",    "OPENED",    "OPENED",    "OPENED",
  "CLICKED",   "CLICKED",
  "FAILED",    "FAILED",    "FAILED",
];

/**
 * Event chains — every terminal outcome implies all preceding delivery steps.
 * Sending these in sequence is far more realistic than a single event.
 *
 *   FAILED   → [FAILED]
 *   DELIVERED → [DELIVERED]
 *   OPENED   → [DELIVERED, OPENED]
 *   CLICKED  → [DELIVERED, OPENED, CLICKED]
 */
const EVENT_CHAIN: Record<SimulatedEvent, SimulatedEvent[]> = {
  FAILED:    ["FAILED"],
  DELIVERED: ["DELIVERED"],
  OPENED:    ["DELIVERED", "OPENED"],
  CLICKED:   ["DELIVERED", "OPENED", "CLICKED"],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

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
  const crmUrl =
    process.env.CRM_RECEIPT_URL ??
    "http://localhost:3001/api/webhooks/receipt";

  const chain = EVENT_CHAIN[outcome];

  for (const eventType of chain) {
    const payload: WebhookPayload = {
      event_id: randomUUID(),          // unique per event — used for CRM idempotency
      communication_id: communicationId,
      event_type: eventType,
      timestamp: new Date().toISOString(),
    };

    try {
      const res = await fetch(crmUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error(
          `[Channel] Webhook delivery failed for ${eventType} ` +
          `(comm: ${communicationId}): HTTP ${res.status}`
        );
      } else {
        console.log(
          `[Channel] ✓ Fired ${eventType} for comm ${communicationId}`
        );
      }
    } catch (err) {
      // Network error — log and continue (fire-and-forget; no retry in mock)
      console.error(
        `[Channel] Network error dispatching ${eventType}:`,
        (err as Error).message
      );
    }

    // Small inter-event gap (300–800 ms) so the CRM can process in sequence
    if (chain.indexOf(eventType) < chain.length - 1) {
      await delay(randInt(300, 800));
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Express router  —  POST /simulator/send
// ─────────────────────────────────────────────────────────────────────────────

export const simulatorRouter = Router();

/**
 * POST /simulator/send
 *
 * 1. Validates incoming payload.
 * 2. Generates a communication_id (UUID) as the tracking reference.
 * 3. Immediately responds 202 Accepted — caller is unblocked instantly.
 * 4. Schedules async event dispatch via setTimeout so the response is
 *    guaranteed to leave before any webhook fires.
 */
simulatorRouter.post("/send", (req: Request, res: Response): void => {
  const { customer_id, campaign_id, channel, message } =
    req.body as Partial<SendPayload>;

  if (!customer_id || !campaign_id || !channel || !message) {
    res.status(400).json({
      error: "Missing required fields: customer_id, campaign_id, channel, message.",
    });
    return;
  }

  const communicationId = randomUUID();
  const outcome = pick(OUTCOME_POOL);

  // ── Respond immediately (202 Accepted) ───────────────────────────────────
  res.status(202).json({
    communication_id: communicationId,
    status: "queued",
    accepted_at: new Date().toISOString(),
  });

  // ── Schedule async event chain (2–5 s network delay) ─────────────────────
  // setTimeout ensures this runs after the HTTP response is flushed.
  const deliveryDelayMs = randInt(2_000, 5_000);

  setTimeout(() => {
    dispatchEventChain(communicationId, outcome).catch((err) =>
      console.error("[Channel] Unhandled dispatch error:", err)
    );
  }, deliveryDelayMs);

  console.log(
    `[Channel] Queued comm ${communicationId} | ` +
    `outcome: ${outcome} | delay: ${deliveryDelayMs}ms`
  );
});