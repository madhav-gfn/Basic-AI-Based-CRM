import { Router, Request, Response } from "express";
import { webhookService, type WebhookPayload } from "../services/webhook.service";

const router = Router();

async function handleReceipt(req: Request, res: Response): Promise<void> {
  const payload = req.body as Partial<WebhookPayload>;

  // ── Basic payload validation ────────────────────────────────────────────────
  if (!payload.event_id || !payload.communication_id || !payload.event_type || !payload.timestamp) {
    res.status(400).json({
      success: false,
      error: "Missing required fields: event_id, communication_id, event_type, timestamp.",
    });
    return;
  }

  const result = await webhookService.processReceipt(payload as WebhookPayload);

  switch (result.outcome) {
    case "processed":
      res.status(200).json({
        success: true,
        outcome: "processed",
        event_id: result.event.id,
        status_updated: result.statusUpdated,
      });
      break;

    case "duplicate":
      // Return 200 so the simulator does not retry — duplicates are expected,
      // not failures. The response signals the event was safely ignored.
      res.status(200).json({
        success: true,
        outcome: "duplicate",
        message: "Event already processed. Ignored.",
      });
      break;

    case "invalid_event_type":
      res.status(400).json({
        success: false,
        outcome: "invalid_event_type",
        error: `Unknown event_type: "${payload.event_type}".`,
      });
      break;

    case "communication_not_found":
      res.status(404).json({
        success: false,
        outcome: "communication_not_found",
        error: `No communication found for id: "${payload.communication_id}".`,
      });
      break;

    default:
      res.status(500).json({ success: false, error: "Unhandled outcome." });
  }
}

/**
 * POST /api/webhooks/receipt
 * POST /api/receipts
 *
 * Receives delivery and engagement events from the Channel Simulator.
 * Delegates all DB logic to WebhookService; this controller only handles
 * HTTP concerns (parsing, status codes, response shaping).
 *
 * Response map:
 *   processed (status updated)     → 200 { outcome: "processed", statusUpdated: true }
 *   processed (rank guard blocked) → 200 { outcome: "processed", statusUpdated: false }
 *   duplicate event                → 200 { outcome: "duplicate" }   (idempotent — not an error)
 *   invalid event_type             → 400
 *   communication not found        → 404
 *   unexpected error               → 500
 */
router.post("/receipt", handleReceipt);
router.post("/receipts", handleReceipt);

export default router;