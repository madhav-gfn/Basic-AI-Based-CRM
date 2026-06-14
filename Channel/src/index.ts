import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import { randomUUID } from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT ?? 3002;
const CRM_RECEIPT_URL =
  process.env.CRM_RECEIPT_URL?.trim().replace(/\/+$/, "") ??
  "http://localhost:3004/api/webhooks/receipt";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SendPayload {
  communication_id: string;
  customer_id: string;
  campaign_id: string;
  channel: string;
  message: string;
}

type SimulatedEvent = "SENT" | "DELIVERED" | "OPENED" | "CLICKED" | "FAILED";

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
 * DELIVERED: 25% | OPENED: 30% | CLICKED: 20% | FAILED: 15% | (implies SENT first)
 */
const OUTCOME_POOL: SimulatedEvent[] = [
  "DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED",
  "OPENED",    "OPENED",    "OPENED",    "OPENED",    "OPENED",    "OPENED",
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
 *   CLICKED   → [SENT, DELIVERED, OPENED, CLICKED]
 */
const EVENT_CHAIN: Record<SimulatedEvent, SimulatedEvent[]> = {
  SENT:      ["SENT"],
  FAILED:    ["SENT", "FAILED"],
  DELIVERED: ["SENT", "DELIVERED"],
  OPENED:    ["SENT", "DELIVERED", "OPENED"],
  CLICKED:   ["SENT", "DELIVERED", "OPENED", "CLICKED"],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const VALID_CHANNELS = new Set(["WHATSAPP", "SMS", "EMAIL", "RCS"]);

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
            `[Channel] ✓ Fired ${eventType} for comm ${communicationId} -> ${CRM_RECEIPT_URL}`
          );
        }
        break;
      } catch (err) {
        lastError = err as Error;
        attempt += 1;
        if (attempt > maxRetries) {
          console.error(
            `[Channel] Network error dispatching ${eventType} to ${CRM_RECEIPT_URL}:`,
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

// ─────────────────────────────────────────────────────────────────────────────
// Express app
// ─────────────────────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

/**
 * Health check
 */
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "channel-simulator", timestamp: new Date().toISOString() });
});

/**
 * POST /simulator/send
 *
 * 1. Validates incoming payload.
 * 2. Immediately responds 202 Accepted — caller is unblocked instantly.
 * 3. Schedules async event dispatch via setTimeout so the response is
 *    guaranteed to leave before any webhook fires.
 */
app.post("/simulator/send", (req: Request, res: Response): void => {
  const { communication_id, customer_id, campaign_id, channel, message } =
    req.body as Partial<SendPayload>;

  // ── Validation ──────────────────────────────────────────────────────────
  if (!communication_id || !customer_id || !campaign_id || !channel || !message) {
    res.status(400).json({
      error:
        "Missing required fields: communication_id, customer_id, campaign_id, channel, message.",
    });
    return;
  }

  if (!VALID_CHANNELS.has(channel.toUpperCase())) {
    res.status(400).json({ error: `Invalid channel: ${channel}.` });
    return;
  }

  const outcome = pick(OUTCOME_POOL);

  // ── Respond immediately (202 Accepted) ─────────────────────────────────
  res.status(202).json({
    communication_id,
    status: "queued",
    accepted_at: new Date().toISOString(),
  });

  // ── Schedule async event chain (2–10 s simulated network delay) ─────────
  const deliveryDelayMs = randInt(2_000, 10_000);

  setTimeout(() => {
    dispatchEventChain(communication_id, outcome).catch((err) =>
      console.error("[Channel] Unhandled dispatch error:", err)
    );
  }, deliveryDelayMs);

  console.log(
    `[Channel] Queued comm ${communication_id} | ` +
    `outcome: ${outcome} | delay: ${deliveryDelayMs}ms`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[Channel Service] Running on port ${PORT}`);
  console.log(`[Channel Service] CRM callback URL: ${CRM_RECEIPT_URL}`);
});
