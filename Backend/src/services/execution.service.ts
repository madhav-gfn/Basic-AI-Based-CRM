import { prisma } from "../config/database";
import {
  CampaignStatus,
  CommunicationStatus,
  ConsentStatus,
} from "@prisma/client";
import { segmentService, type SegmentDefinition } from "../services/segment.service";
import { chunkArray, renderMessage, dispatchChunk } from "./dispatch.util";

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const CHUNK_SIZE = 50; // communications dispatched per concurrent batch

// ── Deliverability guards ────────────────────────────────────────────────────
// Frequency cap: don't message a customer more than once within this window.
// Set FREQUENCY_CAP_HOURS=0 to disable. Default 24h.
const FREQUENCY_CAP_HOURS = Number(process.env.FREQUENCY_CAP_HOURS ?? 24);

// Quiet hours: skip dispatch during a local-time window (e.g. 22 → 8). Both
// must be set to enable. The campaign stays SCHEDULED and the cron retries once
// the window closes, so no send is lost — only deferred.
const QUIET_HOURS_START = process.env.QUIET_HOURS_START;
const QUIET_HOURS_END = process.env.QUIET_HOURS_END;
const QUIET_TIMEZONE = process.env.CRON_TIMEZONE ?? "Asia/Kolkata";

/** Returns true when `now` falls inside the configured quiet-hours window. */
function isWithinQuietHours(now: Date): boolean {
  if (QUIET_HOURS_START === undefined || QUIET_HOURS_END === undefined) return false;

  const start = Number(QUIET_HOURS_START);
  const end = Number(QUIET_HOURS_END);
  if (Number.isNaN(start) || Number.isNaN(end)) return false;

  const hour =
    Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: QUIET_TIMEZONE,
        hour: "numeric",
        hour12: false,
      }).format(now)
    ) % 24;

  // Overnight window (22 → 8) wraps midnight; daytime window (1 → 5) does not.
  return start > end ? hour >= start || hour < end : hour >= start && hour < end;
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
      // ── Step 0: Quiet-hours guard ────────────────────────────────────────
      // Defer (don't claim) if we're inside the configured quiet window. The
      // campaign remains SCHEDULED and the next cron tick after the window
      // closes will pick it up.
      if (isWithinQuietHours(new Date())) {
        console.log(
          `[Execution] Campaign ${campaignId} deferred — within quiet hours ` +
          `(${QUIET_HOURS_START}:00–${QUIET_HOURS_END}:00 ${QUIET_TIMEZONE}).`
        );
        return;
      }

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

      const segmentWhere = await segmentService.buildPrismaWhereClause(
        campaign.audience.definition as SegmentDefinition
      );

      // Suppression: never dispatch to opted-out customers, regardless of
      // whether they match the segment. This is enforced at send time so the
      // suppression list is always authoritative.
      const whereClause = {
        AND: [segmentWhere, { consentStatus: { not: ConsentStatus.OPTED_OUT } }],
      };

      const matchingCustomers = await prisma.customer.findMany({
        where:  whereClause,
        select: { id: true, name: true, city: true, email: true },
      });

      // ── Frequency cap ────────────────────────────────────────────────────
      // Exclude anyone already contacted within the cap window (across ALL
      // campaigns), so a customer isn't fatigued by back-to-back sends.
      let eligibleCustomers = matchingCustomers;
      if (FREQUENCY_CAP_HOURS > 0 && matchingCustomers.length > 0) {
        const since = new Date(Date.now() - FREQUENCY_CAP_HOURS * 3_600_000);
        const recentlyContacted = await prisma.communication.findMany({
          where: {
            customerId: { in: matchingCustomers.map((c) => c.id) },
            createdAt: { gte: since },
          },
          select: { customerId: true },
          distinct: ["customerId"],
        });
        const capped = new Set(recentlyContacted.map((c) => c.customerId));
        eligibleCustomers = matchingCustomers.filter((c) => !capped.has(c.id));

        if (capped.size > 0) {
          console.log(
            `[Execution] Campaign ${campaignId} | frequency cap (${FREQUENCY_CAP_HOURS}h) ` +
            `suppressed ${capped.size} recently-contacted customer(s).`
          );
        }
      }

      const customerIds = eligibleCustomers.map((c) => c.id);

      if (customerIds.length === 0) {
        console.warn(`[Execution] Campaign ${campaignId} resolved to 0 eligible customers. Marking Completed.`);
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
      //
      // A/B variant support: if the campaign has CampaignVariant records,
      // each customer is assigned to a variant via weighted random selection.
      // The variant's message replaces the campaign's base message.
      const baseMessageTemplate = campaign.message ?? campaign.objective ?? "";

      // Load A/B variants (if any)
      const variants = await prisma.campaignVariant.findMany({
        where: { campaignId },
      });

      // Build a weighted selection function for variant assignment
      const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);

      function pickVariant(): typeof variants[number] | null {
        if (variants.length === 0) return null;
        let roll = Math.random() * totalWeight;
        for (const variant of variants) {
          roll -= variant.weight;
          if (roll <= 0) return variant;
        }
        return variants[variants.length - 1];
      }

      if (variants.length > 0) {
        console.log(
          `[Execution] Campaign ${campaignId} has ${variants.length} A/B variant(s): ` +
          variants.map((v) => `"${v.label}" (weight: ${v.weight})`).join(", ")
        );
      }

      await prisma.communication.createMany({
        data: eligibleCustomers.map((customer) => {
          const variant = pickVariant();
          const template = variant ? variant.message : baseMessageTemplate;
          return {
            campaignId,
            customerId: customer.id,
            channel: campaign.channel,
            // Render personalisation tokens ({name}, {city}, …) per customer so
            // each Communication stores the exact copy that recipient receives.
            message: renderMessage(template, customer),
            status: CommunicationStatus.PENDING,
            // Track which variant this recipient was assigned to (null = control/no variants)
            variantId: variant?.id ?? null,
          };
        }),
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

        const outcomes = await dispatchChunk(chunk, campaignId);

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
      // Batch-update Communication statuses in two queries (SENT / FAILED).
      // The `status: PENDING` guard is critical: the channel service may have
      // already fired DELIVERED/OPENED/CLICKED webhooks for fast dispatches.
      // Without the guard, a blind SENT write would DOWNGRADE those records and
      // corrupt the funnel. We only advance rows still sitting at PENDING.
      await Promise.all([
        succeededIds.length > 0
          ? prisma.communication.updateMany({
              where: { id: { in: succeededIds }, status: CommunicationStatus.PENDING },
              data:  { status: CommunicationStatus.SENT },
            })
          : Promise.resolve(),

        failedIds.length > 0
          ? prisma.communication.updateMany({
              where: { id: { in: failedIds }, status: CommunicationStatus.PENDING },
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
