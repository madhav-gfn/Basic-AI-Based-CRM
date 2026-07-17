import { Request, Response } from "express";
import { AnalyticsService } from "../services/analytics.service";
import { InsightsService } from "../services/insights.service";

export class AnalyticsController {
  /**
   * Endpoint to retrieve campaign analytics and AI-generated insights.
   *
   * @route GET /api/campaigns/:id/analytics
   */
  static async getAnalytics(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: "Campaign ID is required.",
        });
      }

      const [metrics, insights, variantBreakdown] = await Promise.all([
        AnalyticsService.getCampaignMetrics(id),
        InsightsService.generateCampaignInsights(id).catch((err) => {
          console.error("AI Insights Error:", err);
          return null; // Fallback so metrics still return if AI fails
        }),
        AnalyticsService.getVariantBreakdown(id).catch((err) => {
          console.error("Variant Breakdown Error:", err);
          return [];
        }),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          metrics,
          insights,
          variantBreakdown,
        },
      });
    } catch (error: any) {
      console.error("Error fetching campaign analytics:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch analytics.",
      });
    }
  }
}
