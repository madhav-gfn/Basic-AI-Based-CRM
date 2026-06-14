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

      // Fetch the raw metrics and the AI-generated insights concurrently if possible,
      // but InsightsService calls getCampaignMetrics internally right now.
      // We can just call getCampaignMetrics to have it in the controller, 
      // or we can let InsightsService fetch it and we fetch it as well.
      // Since they are quick queries, we can fetch them in parallel, 
      // or we can just run both.
      // Let's run them concurrently: AnalyticsService handles DB, InsightsService handles AI+DB.
      // (InsightsService will hit the DB again, but it's safe and fast).

      const [metrics, insights] = await Promise.all([
        AnalyticsService.getCampaignMetrics(id),
        InsightsService.generateCampaignInsights(id).catch((err) => {
          console.error("AI Insights Error:", err);
          return null; // Fallback so metrics still return if AI fails
        }),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          metrics,
          insights,
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
