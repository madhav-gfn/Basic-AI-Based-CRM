import { GoogleGenAI, Type, type Schema } from "@google/genai";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AudienceMetrics {
  audienceSize: number;
  totalRevenue: number;
  averageOrderValue: number;
  averageLifetimeValue: number;
  lastPurchaseDate: Date | null;
  topCategory: string | null;
}

export interface CampaignDraft {
  suggestedChannel: "WhatsApp" | "Email" | "SMS" | "RCS";
  message: string;
  explanation: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Response schema  (Type enum from newer SDK)
// ─────────────────────────────────────────────────────────────────────────────

const CAMPAIGN_DRAFT_SCHEMA: Schema = {
  type: Type.OBJECT,
  description: "A structured campaign draft produced by the AI copilot.",
  properties: {
    suggestedChannel: {
      type: Type.STRING,
      enum: ["WhatsApp", "Email", "SMS", "RCS"],
      description:
        "The highest-converting channel for this specific audience, " +
        "chosen based on their AOV, recency, and engagement potential. " +
        "WhatsApp for high-value/high-engagement; Email for rich content; " +
        "SMS for time-sensitive offers; RCS for interactive rich media.",
      nullable: false,
    },
    message: {
      type: Type.STRING,
      description:
        "The complete, ready-to-send campaign copy. Must be personalised, " +
        "concise, and include a clear call-to-action. " +
        "Use {name} as the only placeholder — no other dynamic tokens.",
      nullable: false,
    },
    explanation: {
      type: Type.STRING,
      description:
        "1-2 sentence rationale: why this channel was selected and how " +
        "the message aligns with the audience metrics and campaign objective.",
      nullable: false,
    },
  },
  required: ["suggestedChannel", "message", "explanation"],
};

// ─────────────────────────────────────────────────────────────────────────────
// AICampaignService
// ─────────────────────────────────────────────────────────────────────────────

export class AICampaignService {
  private readonly ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment variables.");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * buildSystemPrompt
   *
   * Serialises the retrieved AudienceMetrics as plain text into the system
   * prompt. This is the Augmentation step of the RAG pipeline — live DB data
   * grounds the model in real behaviour rather than generic marketing knowledge.
   */
  private buildSystemPrompt(metrics: AudienceMetrics): string {
    const daysSinceLast = metrics.lastPurchaseDate
      ? Math.floor((Date.now() - metrics.lastPurchaseDate.getTime()) / 86_400_000)
      : null;

    return `
You are an expert D2C fashion marketing strategist with deep knowledge of Indian retail consumer behaviour.
Analyse the provided real-time audience data and produce a campaign draft that maximises engagement and conversion.

RETRIEVED AUDIENCE CONTEXT
-------------------------------------------------
Audience size        : ${metrics.audienceSize} customers
Total segment revenue: Rs.${metrics.totalRevenue.toLocaleString("en-IN")}
Avg. order value     : Rs.${metrics.averageOrderValue.toLocaleString("en-IN")}
Avg. lifetime value  : Rs.${metrics.averageLifetimeValue.toLocaleString("en-IN")}
Top purchase category: ${metrics.topCategory ?? "Mixed / Unknown"}
Last purchase        : ${daysSinceLast !== null ? `${daysSinceLast} days ago` : "No purchase data"}
-------------------------------------------------

CHANNEL SELECTION RULES (evaluate in order, pick first match):
1. AOV > Rs.5000 AND last purchase < 45 days  -> WhatsApp  (high-value, engaged)
2. Top category is Apparel or Beauty AND audience > 500  -> Email  (rich visuals)
3. Last purchase > 60 days (re-engagement)  -> SMS  (short, high open-rate)
4. Audience < 200 AND AOV > Rs.3000  -> RCS  (premium interactive)
5. Default  -> WhatsApp

MESSAGE RULES:
- Open with personalisation token {name}
- Lead with value proposition, not the brand name
- One specific, time-bound call-to-action
- Max 160 characters for SMS; max 300 for all other channels
- No emoji for SMS or RCS

Respond with ONLY valid JSON in this exact format:
{
  "suggestedChannel": "WhatsApp" | "Email" | "SMS" | "RCS",
  "message": "string",
  "explanation": "string"
}
    `.trim();
  }

  /**
   * generateCampaignDraft
   *
   * RAG pipeline:
   *   Retrieve  -> audienceMetrics passed in (computed from Prisma by CampaignService)
   *   Augment   -> metrics serialised as plain text into the system prompt
   *   Generate  -> Gemini returns structured JSON matching CAMPAIGN_DRAFT_SCHEMA
   *
   * Newer SDK pattern used throughout:
   *   ai.models.generateContent({ model, contents, config })
   *   response.text  -- getter, not a method
   */
  async generateCampaignDraft(
    objective: string,
    audienceMetrics: AudienceMetrics
  ): Promise<CampaignDraft> {
    if (!objective.trim()) {
      throw new Error("Campaign objective cannot be empty.");
    }

    const response = await this.ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents:
        `Campaign objective: "${objective}"\n\n` +
        `Based on the audience context in your system prompt, select the optimal ` +
        `channel and write a high-converting message that directly serves this objective.`,
      config: {
        systemInstruction: this.buildSystemPrompt(audienceMetrics),
        temperature: 0.4,
        topP: 0.9,
      },
    });

    const raw = response.text;
    if (!raw) {
      throw new Error("AI response did not include text.");
    }

    const responseText = raw.trim();
    
    // Parse JSON manually since we can't use responseSchema with this model
    const parsed = JSON.parse(responseText) as CampaignDraft;
    
    return parsed;
  }
}

export const aiCampaignService = new AICampaignService();
