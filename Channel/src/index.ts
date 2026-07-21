import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import { getProvider, type SendPayload } from "./providers";

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

// Local dev default is 3004; Render injects its own PORT in production.
const PORT = process.env.PORT ?? 3004;

const VALID_CHANNELS = new Set(["WHATSAPP", "SMS", "EMAIL", "RCS"]);

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
 * 3. Hands off to whichever ChannelProvider is configured for this channel
 *    (simulator by default; see Channel/src/providers). The simulator fires
 *    fake webhook events asynchronously; a real provider (once enabled) sends
 *    the message immediately and its own delivery webhooks arrive later,
 *    out of band, from the provider itself.
 */
app.post("/simulator/send", (req: Request, res: Response): void => {
  const { communication_id, customer_id, campaign_id, channel, message, recipient } =
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

  // ── Respond immediately (202 Accepted) ─────────────────────────────────
  res.status(202).json({
    communication_id,
    status: "queued",
    accepted_at: new Date().toISOString(),
  });

  // ── Hand off to the configured provider for this channel ────────────────
  let provider;
  try {
    provider = getProvider(channel);
  } catch (err) {
    console.error(`[Channel] ${(err as Error).message}`);
    return;
  }

  provider
    .send({ communication_id, customer_id, campaign_id, channel, message, recipient })
    .then((result) => {
      if (!result.accepted) {
        console.error(`[Channel] Provider "${provider.name}" rejected comm ${communication_id}: ${result.error}`);
      }
    })
    .catch((err) => console.error(`[Channel] Unhandled provider error for comm ${communication_id}:`, err));
});

// ─────────────────────────────────────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[Channel Service] Running on port ${PORT}`);
});
