import { prisma } from "../config/database";
import { Prisma, Campaign, CampaignStatus, Channel } from "@prisma/client";
import { segmentService } from "./segment.service";
import { aiCampaignService, type AudienceMetrics } from "./AICampaign.service";
import type { SegmentFilters } from "./segment.service";

// ─────────────────────────────────────────────────────────────────────────────
// Return types
// ─────────────────────────────────────────────────────────────────────────────

export interface DraftCampaignResult {
  campaign: Campaign;
  audienceMetrics: AudienceMetrics;
  aiExplanation: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Channel normaliser
// The AI returns cased strings ("WhatsApp"); Prisma enum requires uppercase.
// ─────────────────────────────────────────────────────────────────────────────

const CHANNEL_MAP: Record<string, Channel> = {
  whatsapp: Channel.WHATSAPP,
  email: Channel.EMAIL,
  sms: Channel.SMS,
  rcs: Channel.RCS,
};

function toChannelEnum(raw: string): Channel {
  const key = raw.toLowerCase();
  const channel = CHANNEL_MAP[key];
  if (!channel) throw new Error(`Unknown channel returned by AI: "${raw}"`);
  return channel;
}

// ─────────────────────────────────────────────────────────────────────────────
// CampaignService
// ─────────────────────────────────────────────────────────────────────────────

export class CampaignService {
  /**
   * computeAudienceMetrics
   *
   * Given a list of customer IDs (the resolved segment), runs two Prisma
   * queries to compute segment-level aggregate stats:
   *
   *  Query 1 — prisma.order.aggregate  →  SUM, AVG, MAX in one DB round-trip
   *  Query 2 — prisma.order.groupBy    →  top category by purchase count
   *
   * Both are pushed entirely to the DB; no order rows are transferred to Node.
   */
  private async computeAudienceMetrics(
    customerIds: string[]
  ): Promise<AudienceMetrics> {
    const audienceSize = customerIds.length;

    if (audienceSize === 0) {
      return {
        audienceSize: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        averageLifetimeValue: 0,
        lastPurchaseDate: null,
        topCategory: null,
      };
    }

    const scope: Prisma.OrderWhereInput = {
      customerId: { in: customerIds },
    };

    // Single aggregate query: SUM + AVG + MAX
    const [orderAgg, topCategoryResult] = await Promise.all([
      prisma.order.aggregate({
        where: scope,
        _sum: { orderValue: true },
        _avg: { orderValue: true },
        _max: { orderDate: true },
      }),

      // Top category by purchase frequency across the segment
      prisma.order.groupBy({
        by: ["category"],
        where: scope,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 1,
      }),
    ]);

    const totalRevenue = orderAgg._sum.orderValue ?? 0;

    return {
      audienceSize,
      totalRevenue,
      averageOrderValue: orderAgg._avg.orderValue ?? 0,
      averageLifetimeValue: audienceSize > 0 ? totalRevenue / audienceSize : 0,
      lastPurchaseDate: orderAgg._max.orderDate ?? null,
      topCategory: topCategoryResult[0]?.category ?? null,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Method 1: draftAICampaign
  //
  // Orchestration pipeline:
  //  1. Validate segment exists
  //  2. Re-evaluate its filters → get matching customer IDs        [SegmentService]
  //  3. Compute aggregate metrics for that audience                [Prisma aggregate]
  //  4. Generate AI channel + message suggestions                  [AICampaignService]
  //  5. Persist Campaign record with DRAFT status                  [Prisma]
  // ───────────────────────────────────────────────────────────────────────────

  async draftAICampaign(
    name: string,
    objective: string,
    audienceId: string
  ): Promise<DraftCampaignResult> {
    // ── Step 1: Load the segment ─────────────────────────────────────────────
    const segment = await prisma.segment.findUnique({
      where: { id: audienceId },
    });

    if (!segment) {
      throw new Error(`Segment not found: "${audienceId}".`);
    }

    // ── Step 2: Re-evaluate segment filters → resolve customer IDs ───────────
    // The definition JSON stored on the Segment IS the SegmentFilters object.
    const filters = segment.definition as unknown as SegmentFilters;
    const segmentWhere = await segmentService.buildPrismaWhereClause(filters);

    const matchingCustomers = await prisma.customer.findMany({
      where: segmentWhere,
      select: { id: true }, // only IDs needed — minimal data transfer
    });

    const customerIds = matchingCustomers.map((c) => c.id);

    if (customerIds.length === 0) {
      throw new Error(
        `Segment "${segment.name}" resolved to 0 customers. ` +
          `Widen the filters before drafting a campaign.`
      );
    }

    // ── Step 3: Compute audience metrics (Retrieval) ─────────────────────────
    const audienceMetrics = await this.computeAudienceMetrics(customerIds);

    // ── Step 4: Generate AI draft (Augment + Generate) ───────────────────────
    const { suggestedChannel, message, explanation } =
      await aiCampaignService.generateCampaignDraft(objective, audienceMetrics);

    // ── Step 5: Persist the Campaign record ──────────────────────────────────
    // Note: `message` requires adding `message String?` to Campaign in schema.prisma
    const campaign = await prisma.campaign.create({
      data: {
        name,
        audienceId,
        channel: toChannelEnum(suggestedChannel),
        objective,
        status: CampaignStatus.DRAFT,
        // Store AI-generated copy on the campaign for the marketer to review
        // before it is fanned out to individual Communication records.
        message,
      },
    });

    return { campaign, audienceMetrics, aiExplanation: explanation };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Method 2: CRUD operations
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * getCampaigns
   * Returns all campaigns, most recently created first,
   * with their audience segment name included for display.
   */
  async getCampaigns(): Promise<Campaign[]> {
    return prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      include: { audience: { select: { name: true } } },
    });
  }

  /**
   * getCampaignById
   * Returns a single campaign with its full audience segment and
   * a summary of communication delivery stats.
   */
  async getCampaignById(id: string): Promise<Campaign | null> {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        audience: true,
        communications: {
          select: { status: true },
        },
      },
    });

    if (!campaign) {
      throw new Error(`Campaign not found: "${id}".`);
    }

    return campaign;
  }

  /**
   * updateCampaignStatus
   * Validates the status transition and updates the record.
   * Sets `launchedAt` automatically when the status moves to RUNNING.
   */
  async updateCampaignStatus(
    id: string,
    status: string,
    scheduledAt?: string | null
  ): Promise<Campaign> {
    const newStatus = CampaignStatus[status as keyof typeof CampaignStatus];

    if (!newStatus) {
      throw new Error(
        `Invalid campaign status: "${status}". ` +
          `Allowed values: ${Object.keys(CampaignStatus).join(", ")}.`
      );
    }

    // Confirm campaign exists before updating
    const existing = await prisma.campaign.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existing) {
      throw new Error(`Campaign not found: "${id}".`);
    }

    let parsedScheduledAt: Date | null | undefined;
    if (scheduledAt !== undefined) {
      parsedScheduledAt = scheduledAt === null ? null : new Date(scheduledAt);

      if (
        parsedScheduledAt !== null &&
        Number.isNaN(parsedScheduledAt.getTime())
      ) {
        throw new Error(`Invalid scheduledAt value: "${scheduledAt}".`);
      }
    }

    return prisma.campaign.update({
      where: { id },
      data: {
        status: newStatus,
        // Stamp launchedAt the first time the campaign goes RUNNING
        ...(newStatus === CampaignStatus.RUNNING &&
          existing.status !== CampaignStatus.RUNNING && {
            launchedAt: new Date(),
          }),
        ...(newStatus === CampaignStatus.SCHEDULED &&
          scheduledAt !== undefined && {
            scheduledAt: parsedScheduledAt,
          }),
      },
    });
  }
}

export const campaignService = new CampaignService();
