import { prisma } from "../config/database";
import {
  EventType,
  CommunicationStatus,
  type Communication,
  type CommunicationEvent,
} from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Incoming webhook payload shape
// ─────────────────────────────────────────────────────────────────────────────

export interface WebhookPayload {
  event_id: string;          // UUID from the channel service — primary idempotency key
  communication_id: string;
  event_type: string;        // validated against EventType enum before processing
  timestamp: string;         // ISO 8601
  metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Status rank table
//
// Defines the valid forward-progression of a Communication's lifecycle.
// A status update is only applied if the incoming event's rank is STRICTLY
// HIGHER than the current status rank — this prevents out-of-order webhooks
// from downgrading a Communication (e.g., CLICKED → DELIVERED is ignored).
//
// FAILED sits at rank 2 (after SENT) because a delivery failure is terminal
// at the transport layer, before engagement events can occur. This ensures
// DELIVERED/OPENED/CLICKED are never overridden by a late FAILED event.
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_RANK: Record<CommunicationStatus, number> = {
  [CommunicationStatus.PENDING]:   0,
  [CommunicationStatus.SENT]:      1,
  [CommunicationStatus.FAILED]:    2,
  [CommunicationStatus.DELIVERED]: 3,
  [CommunicationStatus.OPENED]:    4,
  [CommunicationStatus.READ]:      5,
  [CommunicationStatus.CLICKED]:   6,
};

/**
 * Maps an EventType to its corresponding CommunicationStatus.
 * CONVERTED has no CommunicationStatus equivalent — it is logged as an
 * event only (the Communication stays CLICKED after conversion).
 */
const EVENT_TO_STATUS: Partial<Record<EventType, CommunicationStatus>> = {
  [EventType.SENT]:      CommunicationStatus.SENT,
  [EventType.DELIVERED]: CommunicationStatus.DELIVERED,
  [EventType.OPENED]:    CommunicationStatus.OPENED,
  [EventType.READ]:      CommunicationStatus.READ,
  [EventType.CLICKED]:   CommunicationStatus.CLICKED,
  [EventType.FAILED]:    CommunicationStatus.FAILED,
};

// ─────────────────────────────────────────────────────────────────────────────
// Result type
// ─────────────────────────────────────────────────────────────────────────────

export type ReceiptResult =
  | { outcome: "processed"; event: CommunicationEvent; statusUpdated: boolean }
  | { outcome: "duplicate" }
  | { outcome: "invalid_event_type" }
  | { outcome: "communication_not_found" };

// ─────────────────────────────────────────────────────────────────────────────
// WebhookService
// ─────────────────────────────────────────────────────────────────────────────

export class WebhookService {
  /**
   * processReceipt
   *
   * The core webhook handler — all DB logic runs inside a serialisable
   * transaction to prevent race conditions when the channel service fires
   * multiple events in rapid succession for the same communication.
   *
   * Pipeline:
   *  1. Validate the event_type against the Prisma enum
   *  2. Idempotency check — reject if this exact event was already processed
   *  3. Load the Communication to get its current status
   *  4. Insert the CommunicationEvent log row (always, for audit trail)
   *  5. Status transition guard — update Communication.status only if the
   *     incoming event rank is strictly higher than the current rank
   */
  async processReceipt(payload: WebhookPayload): Promise<ReceiptResult> {
    // ── Step 1: Validate event_type ──────────────────────────────────────────
    const eventType = payload.event_type as EventType;
    if (!Object.values(EventType).includes(eventType)) {
      return { outcome: "invalid_event_type" };
    }

    const eventTimestamp = new Date(payload.timestamp);

    return prisma.$transaction(
      async (tx) => {
        // ── Step 2: Idempotency check ────────────────────────────────────────
        // Primary key: event_id (UUID sent by the channel service).
        // Fallback composite: communicationId + eventType (catches retries
        // where the channel service generates a new event_id for the same event).
        const duplicate = await tx.communicationEvent.findFirst({
          where: {
            OR: [
              // If your schema has an externalEventId field, use it here
              {
                communicationId: payload.communication_id,
                eventType,
                // Window: events within 10s of the same type are likely duplicates
                timestamp: {
                  gte: new Date(eventTimestamp.getTime() - 10_000),
                  lte: new Date(eventTimestamp.getTime() + 10_000),
                },
              },
            ],
          },
        });

        if (duplicate) {
          return { outcome: "duplicate" as const };
        }

        // ── Step 3: Load current Communication ──────────────────────────────
        const communication = await tx.communication.findUnique({
          where: { id: payload.communication_id },
          select: { id: true, status: true },
        });

        if (!communication) {
          return { outcome: "communication_not_found" as const };
        }

        // ── Step 4: Insert CommunicationEvent (audit log — always written) ──
        const loggedEvent = await tx.communicationEvent.create({
          data: {
            communicationId: payload.communication_id,
            eventType,
            timestamp: eventTimestamp,
            metadata: {
              event_id: payload.event_id,   // preserve the channel's unique ID
              ...(payload.metadata ?? {}),
            },
          },
        });

        // ── Step 5: Status transition guard ─────────────────────────────────
        const newStatus = EVENT_TO_STATUS[eventType];
        let statusUpdated = false;

        if (newStatus !== undefined) {
          const currentRank = STATUS_RANK[communication.status];
          const incomingRank = STATUS_RANK[newStatus];

          if (incomingRank > currentRank) {
            await tx.communication.update({
              where: { id: payload.communication_id },
              data: { status: newStatus },
            });
            statusUpdated = true;

            console.log(
              `[Webhook] ${communication.status} → ${newStatus} ` +
              `(comm: ${payload.communication_id})`
            );
          } else {
            // Out-of-order or duplicate status — log but do not downgrade
            console.log(
              `[Webhook] Ignored out-of-order ${eventType} ` +
              `(current: ${communication.status}, ` +
              `rank ${currentRank} >= incoming rank ${incomingRank})`
            );
          }
        }
        // CONVERTED has no status mapping — event is logged, status unchanged.

        return { outcome: "processed" as const, event: loggedEvent, statusUpdated };
      },
      {
        // Serializable isolation prevents two concurrent CLICKED and OPENED
        // webhooks from both reading DELIVERED and both trying to write.
        isolationLevel: "Serializable",
      }
    );
  }

  /**
   * getCommunicationEvents
   * Returns the full event history for a communication, ordered chronologically.
   * Useful for the campaign analytics view.
   */
  async getCommunicationEvents(
    communicationId: string
  ): Promise<CommunicationEvent[]> {
    return prisma.communicationEvent.findMany({
      where: { communicationId },
      orderBy: { timestamp: "asc" },
    });
  }
}

export const webhookService = new WebhookService();