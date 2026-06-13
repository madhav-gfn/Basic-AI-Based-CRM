import { prisma } from "../config/database";
import {
  CampaignStatus,
  CommunicationStatus,
  type Communication,
} from "@prisma/client";
import { segmentService, type SegmentDefinition } from "../services/segment.service";

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const CHANNEL_URL =
  process.env.CHANNEL_SERVICE_URL ??
  `http://localhost:${process.env.PORT ?? 3001}`;

const CHUNK_SIZE = 50; // communications dispatched per concurrent batch

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DispatchPayload {
  communication_id: string; // our Prisma ID — simulator echoes it in callbacks
  customer_id: string;
  campaign_id: string;
  channel: string;
  message: string;
}

type DispatchOutcome =
  | { status: "fulfilled"; communicationId: string }
  | { status: "rejected"; communicationId: string; reason: string };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Splits an array into sequential chunks of a given size. */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Dispatches a single chunk of communications concurrently.
 * Uses Promise.allSettled — one failed request does NOT abort the rest.
 */
async function dispatchChunk(
  communications: Communication[]
): Promise<DispatchOutcome[]> {
  const settled = await Promise.allSettled(
    communications.map(async (comm) => {
      const payload: DispatchPayload = {
        communication_id: comm.id,
        customer_id:      comm.customerId,
        campaign_id:      comm.campaignId,
        channel:          comm.channel,
        message:          comm.message,
      };

      const res = await fetch(`${CHANNEL_URL}/simulator/send`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
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
      : { status: "rejected",  communicationId: communications[i].id, reason: String(result.reason) }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ExecutionService
// ─────────────────────────────────────────────────────────────────────────────

export class ExecutionService {
  /**
   * executeCampaign
   *
   * Full execution pipeline for a single campaign. Each step is logged so
   * failures are easy to diagnose in production logs.
   *
   *  A. State Lock          — claim the campaign atomically
   *  B. Audience Resolution — re-evaluate segment filters → customer IDs
   *  C. Tracking Init       — createMany Communication records (PENDING)
   *  D. Chunked Dispatch    — fan out to Channel Service in batches of 50
   *  E. Completion          — write final Campaign status + Communication statuses
   */
  async executeCampaign(campaignId: string): Promise<void> {
    console.log(`[Execution] Starting campaign ${campaignId}`);

    try {
      // ── Step A: State Lock ───────────────────────────────────────────────
      // updateMany with status guard is atomic — if two cron ticks fire
      // simultaneously, only one will find count > 0 and proceed.
      const claimed = await prisma.campaign.updateMany({
        where: { id: campaignId, status: CampaignStatus.SCHEDULED },
        data:  { status: CampaignStatus.RUNNING, launchedAt: new Date() },
      });

      if (claimed.count === 0) {
        console.log(
          `[Execution] Campaign ${campaignId} already claimed or not in SCHEDULED state. Skipping.`
        );
        return;
      }

      // ── Step B: Audience Resolution ──────────────────────────────────────
      const campaign = await prisma.campaign.findUnique({
        where:   { id: campaignId },
        include: { audience: true },
      });

      if (!campaign) throw new Error(`Campaign ${campaignId} not found after lock.`);

      const whereClause = await segmentService.buildPrismaWhereClause(
        campaign.audience.definition as SegmentDefinition
      );

      const matchingCustomers = await prisma.customer.findMany({
        where:  whereClause,
        select: { id: true },
      });

      const customerIds = matchingCustomers.map((c) => c.id);

      if (customerIds.length === 0) {
        console.warn(`[Execution] Campaign ${campaignId} resolved to 0 customers. Marking Completed.`);
        await prisma.campaign.update({
          where: { id: campaignId },
          data:  { status: CampaignStatus.COMPLETED },
        });
        return;
      }

      console.log(
        `[Execution] Campaign ${campaignId} | segment: "${campaign.audience.name}" ` +
        `| audience: ${customerIds.length} customers`
      );

      // ── Step C: Tracking Initialisation ──────────────────────────────────
      // One Communication record per customer — the channel, message, and
      // status are initialised here. Status starts at PENDING until the
      // channel service accepts the dispatch (then moves to SENT).
      const campaignMessage = campaign.message ?? campaign.objective ?? "";

      await prisma.communication.createMany({
        data: customerIds.map((customerId) => ({
          campaignId,
          customerId,
          channel: campaign.channel,
          message: campaignMessage,
          status:  CommunicationStatus.PENDING,
        })),
        skipDuplicates: true, // guards against re-runs on the same campaign
      });

      // Fetch the newly created records to get their generated UUIDs
      const communications = await prisma.communication.findMany({
        where: { campaignId, status: CommunicationStatus.PENDING },
      });

      console.log(
        `[Execution] Created ${communications.length} communication records for campaign ${campaignId}`
      );

      // ── Step D: Chunked Dispatch ──────────────────────────────────────────
      const chunks   = chunkArray(communications, CHUNK_SIZE);
      const succeededIds: string[] = [];
      const failedIds:    string[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(
          `[Execution] Dispatching chunk ${i + 1}/${chunks.length} ` +
          `(${chunk.length} comms) for campaign ${campaignId}`
        );

        const outcomes = await dispatchChunk(chunk);

        for (const outcome of outcomes) {
          if (outcome.status === "fulfilled") {
            succeededIds.push(outcome.communicationId);
          } else {
            failedIds.push(outcome.communicationId);
            console.error(
              `[Execution] Dispatch failed for comm ${outcome.communicationId}: ${outcome.reason}`
            );
          }
        }

        // Brief breathing room between chunks to avoid overwhelming the simulator
        if (i < chunks.length - 1) {
          await new Promise((res) => setTimeout(res, 100));
        }
      }

      // ── Step E: Completion ────────────────────────────────────────────────
      // Batch-update Communication statuses in two queries (SENT / FAILED)
      await Promise.all([
        succeededIds.length > 0
          ? prisma.communication.updateMany({
              where: { id: { in: succeededIds } },
              data:  { status: CommunicationStatus.SENT },
            })
          : Promise.resolve(),

        failedIds.length > 0
          ? prisma.communication.updateMany({
              where: { id: { in: failedIds } },
              data:  { status: CommunicationStatus.FAILED },
            })
          : Promise.resolve(),
      ]);

      await prisma.campaign.update({
        where: { id: campaignId },
        data:  { status: CampaignStatus.COMPLETED },
      });

      console.log(
        `[Execution] ✓ Campaign ${campaignId} completed | ` +
        `sent: ${succeededIds.length} | failed: ${failedIds.length}`
      );
    } catch (err) {
      // Catastrophic failure — mark campaign FAILED so cron does not retry it
      console.error(`[Execution] ✗ Campaign ${campaignId} failed catastrophically:`, err);

      await prisma.campaign
        .update({
          where: { id: campaignId },
          data:  { status: CampaignStatus.FAILED },
        })
        .catch((updateErr) =>
          // If even the failure update fails, log it — don't throw again
          console.error(`[Execution] Could not update campaign ${campaignId} to FAILED:`, updateErr)
        );
    }
  }
}

export const executionService = new ExecutionService();
