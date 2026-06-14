import { GoogleGenAI, Type, type Schema } from "@google/genai";
import type { SegmentFilters } from "./segment.service";

// ─────────────────────────────────────────────────────────────────────────────
// Return type
// ─────────────────────────────────────────────────────────────────────────────

export interface AISegmentResult {
  filters: SegmentFilters;
  explanation: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Response schema
// Uses Type (newer SDK) instead of SchemaType (older SDK).
// All filter fields are optional; explanation is always required.
// ─────────────────────────────────────────────────────────────────────────────

const SEGMENT_SCHEMA: Schema = {
  type: Type.OBJECT,
  description: "Structured customer segment filters extracted from a natural language query.",
  properties: {
    explanation: {
      type: Type.STRING,
      description:
        "A short, human-readable explanation of why these filters were chosen " +
        "and what audience they will capture.",
      nullable: false,
    },
    gender: {
      type: Type.STRING,
      description:
        'Gender of the customer. Allowed values: "Male", "Female", "Other". ' +
        "Only include if the prompt explicitly mentions gender.",
      nullable: true,
    },
    city: {
      type: Type.STRING,
      description:
        "City the customer signed up from (e.g. Mumbai, Delhi, Bangalore). " +
        "Capitalise the first letter. Only include if a city is mentioned.",
      nullable: true,
    },
    lastPurchaseDaysAgo: {
      type: Type.NUMBER,
      description:
        "Include customers who made at least one purchase within the last N days. " +
        '"active in last 30 days" → 30, "recent buyers" → 30, "inactive for 3 months" → 90.',
      nullable: true,
    },
    minOrderCount: {
      type: Type.INTEGER,
      description:
        "Minimum number of orders a customer must have placed. " +
        '"repeat buyers" → 2, "bought at least 5 times" → 5.',
      nullable: true,
    },
    minLifetimeSpend: {
      type: Type.NUMBER,
      description:
        "Minimum total spend (in INR) across all orders. " +
        '"spent over 5000" → 5000, "high-value customers" → 10000.',
      nullable: true,
    },
    productCategory: {
      type: Type.STRING,
      description:
        "Product category the customer must have purchased from. " +
        "Must be one of: Apparel, Footwear, Accessories, Beauty, Home, Electronics. " +
        '"shoes / sneakers" -> Footwear, "clothes / fashion" -> Apparel, ' +
        '"skincare / cosmetics" -> Beauty, "gadgets / tech" -> Electronics.',
      nullable: true,
    },
  },
  required: ["explanation"],
};

// ─────────────────────────────────────────────────────────────────────────────
// System prompt
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
You are a CRM segmentation assistant for an Indian retail brand.
Your job is to translate a marketer's plain-English audience description into a
structured JSON filter object that will be used to query a customer database.

Rules:
- Only populate a field if the prompt clearly implies it. Never guess or invent values.
- Omit fields entirely when they are not applicable (do not set them to null or zero).
- All monetary values are in INR.
- For ambiguous recency phrases ("recent", "active"), default to lastPurchaseDaysAgo: 30.
- For ambiguous spend phrases ("high-value", "premium"), default to minLifetimeSpend: 10000.
- Always write a concise, friendly explanation (1-2 sentences) describing the audience.
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// AIService
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

export class AIService {
  private readonly ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment variables.");
    }
    // Newer SDK: GoogleGenAI takes a config object, not a bare string
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * generateSegmentFilters
   *
   * Newer SDK pattern:
   *   ai.models.generateContent({ model, contents, config })
   *   response.text  -- plain getter, not a method call
   */
  async generateSegmentFilters(userPrompt: string): Promise<AISegmentResult> {
    if (!userPrompt.trim()) {
      throw new Error("Prompt cannot be empty.");
    }

    try {
      const response = await this.ai.models.generateContent({
        model: DEFAULT_GEMINI_MODEL,
        contents: userPrompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: SEGMENT_SCHEMA,
          temperature: 0.1,
        },
      });

      const raw = response.text;
      if (!raw) throw new Error("AI response did not include text.");

      const parsed = JSON.parse(raw) as SegmentFilters & { explanation: string };
      const { explanation, ...filters } = parsed;
      return { filters, explanation };
    } catch (err: any) {
      if (err.message?.includes("429") || err.status === 429) {
        console.warn("[AI Service] Quota exceeded. Using mock segment fallback for demo purposes.");
        return {
          filters: { minOrderCount: 2, lastPurchaseDaysAgo: 30 },
          explanation: "(MOCK DUE TO API QUOTA) Targeting active repeat buyers from the last 30 days.",
        };
      }
      throw err;
    }
  }
}

export const aiService = new AIService();
