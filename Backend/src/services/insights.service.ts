import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalyticsService, CampaignMetrics } from "./analytics.service";

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

// Initialize the Google Gen AI client with the API key from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Strict JSON SchemaType for the output based on requirements
const InsightsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    executiveSummary: {
      type: Type.STRING,
      description: "1-2 sentences summarizing overall performance.",
    },
    topPerformingMetric: {
      type: Type.STRING,
      description: "Highlighting the strongest part of the funnel.",
    },
    bottleneck: {
      type: Type.STRING,
      description: "Identifying where users dropped off, e.g., 'High open rate but low click rate'.",
    },
    recommendedAction: {
      type: Type.STRING,
      description: "What the marketer should do next.",
    },
  },
  required: ["executiveSummary", "topPerformingMetric", "bottleneck", "recommendedAction"],
};

export interface CampaignInsights {
  executiveSummary: string;
  topPerformingMetric: string;
  bottleneck: string;
  recommendedAction: string;
}

export class InsightsService {
  /**
   * Converts raw dashboard numbers into natural-language business insights using Gemini.
   *
   * @param campaignId - The ID of the campaign to analyze
   * @returns AI-generated business insights in a strictly typed JSON structure
   */
  static async generateCampaignInsights(campaignId: string): Promise<CampaignInsights> {
    // 1. RAG Pattern: Retrieve metrics data
    const metrics: CampaignMetrics = await AnalyticsService.getCampaignMetrics(campaignId);

    // 2. Prepare the context and prompt
    const prompt = `You are a fractional CMO analyzing a marketing campaign's performance metrics.
Review the following funnel metrics and provide a structured JSON response with your insights.
Focus on identifying the strongest parts of the funnel and where the major drop-offs are happening.

Metrics Data:
${JSON.stringify(metrics, null, 2)}`;

    // 3. Call the AI model
    const response = await ai.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: InsightsSchema,
        temperature: 0.2, // Low temperature for consistent, analytical output
      },
    });

    if (!response.text) {
      throw new Error("Failed to generate insights from Gemini. The response was empty.");
    }

    // 4. Parse and return the strict JSON schema
    const insights: CampaignInsights = JSON.parse(response.text);
    return insights;
  }
}
