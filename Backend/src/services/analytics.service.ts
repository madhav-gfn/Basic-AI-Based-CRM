import { prisma } from "../config/database";

export interface CampaignMetrics {
  audienceSize: number;
  counts: {
    sent: number;
    delivered: number;
    opened: number;
    read: number;
    clicked: number;
    failed: number;
  };
  conversions: number;
  rates: {
    sentRate: number;
    deliveredRate: number;
    openedRate: number;
    readRate: number;
    clickedRate: number;
    failedRate: number;
    conversionRate: number;
  };
}

export interface VariantMetrics {
  variantId: string;
  label: string;
  audienceSize: number;
  counts: {
    sent: number;
    delivered: number;
    opened: number;
    read: number;
    clicked: number;
    failed: number;
  };
  rates: {
    deliveredRate: number;
    openedRate: number;
    clickedRate: number;
  };
}

export class AnalyticsService {
  /**
   * Calculates real-time campaign performance metrics based on communication events,
   * including a 7-day conversion attribution rule.
   *
   * @param campaignId - The ID of the campaign to analyze
   * @returns Detailed funnel metrics and conversion rates
   */
  static async getCampaignMetrics(campaignId: string): Promise<CampaignMetrics> {
    // Audience Size: The total number of communications intended for this campaign.
    const audienceSize = await prisma.communication.count({
      where: { campaignId },
    });

    // Grouping communication events to get exact counts per event type.
    const eventCounts = await prisma.communicationEvent.groupBy({
      by: ["eventType"],
      where: {
        communication: {
          campaignId,
        },
      },
      _count: {
        id: true,
      },
    });

    // Initialize counts with 0
    const counts: Record<string, number> = {
      SENT: 0,
      DELIVERED: 0,
      OPENED: 0,
      READ: 0,
      CLICKED: 0,
      FAILED: 0,
    };

    // Populate actual counts from the database response
    eventCounts.forEach((ec) => {
      counts[ec.eventType] = ec._count.id;
    });

    // The Attribution Challenge:
    // A conversion is attributed when a customer clicks a communication AND places an order
    // within 7 days of that click. We use $queryRaw to join the Order table and check the 7-day window.
    const conversionsQuery = await prisma.$queryRaw<{ conversions: bigint }[]>`
      SELECT COUNT(DISTINCT c.id) as conversions
      FROM "communications" c
      JOIN "communication_events" ce ON c.id = ce.communication_id
      JOIN "orders" o ON c.customer_id = o.customer_id
      WHERE c.campaign_id = ${campaignId}
        AND ce."eventType" = 'CLICKED'
        AND o.order_date >= ce.timestamp
        AND o.order_date <= ce.timestamp + INTERVAL '7 days'
    `;

    const conversions = Number(conversionsQuery[0]?.conversions || 0);

    // Helper to calculate percentages safely, defaulting to 0
    const calculateRate = (numerator: number, denominator: number): number => {
      return denominator > 0 ? Number(((numerator / denominator) * 100).toFixed(2)) : 0;
    };

    return {
      audienceSize,
      counts: {
        sent: counts.SENT,
        delivered: counts.DELIVERED,
        opened: counts.OPENED,
        read: counts.READ,
        clicked: counts.CLICKED,
        failed: counts.FAILED,
      },
      conversions,
      rates: {
        // Funnel progression rates
        sentRate: calculateRate(counts.SENT, audienceSize),
        deliveredRate: calculateRate(counts.DELIVERED, counts.SENT),
        failedRate: calculateRate(counts.FAILED, counts.SENT),
        openedRate: calculateRate(counts.OPENED, counts.DELIVERED),
        readRate: calculateRate(counts.READ, counts.OPENED),
        clickedRate: calculateRate(counts.CLICKED, counts.OPENED),
        // Conversion rate out of the users who clicked
        conversionRate: calculateRate(conversions, counts.CLICKED),
      },
    };
  }

  /**
   * Returns per-variant funnel metrics for campaigns with A/B testing enabled.
   * If the campaign has no variants, returns an empty array.
   */
  static async getVariantBreakdown(campaignId: string): Promise<VariantMetrics[]> {
    // Load variants for this campaign
    const variants = await prisma.campaignVariant.findMany({
      where: { campaignId },
      orderBy: { label: "asc" },
    });

    if (variants.length === 0) return [];

    const calculateRate = (numerator: number, denominator: number): number =>
      denominator > 0 ? Number(((numerator / denominator) * 100).toFixed(2)) : 0;

    const results: VariantMetrics[] = [];

    for (const variant of variants) {
      // Count communications assigned to this variant
      const audienceSize = await prisma.communication.count({
        where: { campaignId, variantId: variant.id },
      });

      // Event counts for this variant's communications
      const eventCounts = await prisma.communicationEvent.groupBy({
        by: ["eventType"],
        where: {
          communication: {
            campaignId,
            variantId: variant.id,
          },
        },
        _count: { id: true },
      });

      const counts: Record<string, number> = {
        SENT: 0,
        DELIVERED: 0,
        OPENED: 0,
        READ: 0,
        CLICKED: 0,
        FAILED: 0,
      };

      eventCounts.forEach((ec) => {
        counts[ec.eventType] = ec._count.id;
      });

      results.push({
        variantId: variant.id,
        label: variant.label,
        audienceSize,
        counts: {
          sent: counts.SENT,
          delivered: counts.DELIVERED,
          opened: counts.OPENED,
          read: counts.READ,
          clicked: counts.CLICKED,
          failed: counts.FAILED,
        },
        rates: {
          deliveredRate: calculateRate(counts.DELIVERED, counts.SENT),
          openedRate: calculateRate(counts.OPENED, counts.DELIVERED),
          clickedRate: calculateRate(counts.CLICKED, counts.OPENED),
        },
      });
    }

    return results;
  }
}
