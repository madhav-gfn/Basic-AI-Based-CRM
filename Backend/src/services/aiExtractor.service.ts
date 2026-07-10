import OpenAI from "openai";
import type { CRMRecord } from "../types/crm.types";

// ─────────────────────────────────────────────────────────────────────────────
// aiExtractor.service.ts — Groq-powered CRM field extraction
//
// Uses Groq's OpenAI-compatible API for blazing-fast inference.
// Sends CSV rows in batches, receives structured CRM records back.
// ─────────────────────────────────────────────────────────────────────────────

const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
const BATCH_SIZE = Number(process.env.AI_BATCH_SIZE) || 20;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

// ── Groq client (OpenAI-compatible) ──────────────────────────────────────────

let groqClient: OpenAI | null = null;

function getGroqClient(): OpenAI {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not set in environment variables.");
    }
    groqClient = new OpenAI({
      apiKey,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  return groqClient;
}

// ── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a CRM data extraction assistant for GrowEasy CRM.

Your task: Given CSV rows with ARBITRARY column names, extract and map each row into the GrowEasy CRM schema. The columns may use any naming convention — map by SEMANTIC MEANING, not exact name matching.

TARGET CRM SCHEMA (JSON object per row):
{
  "created_at": "Lead creation date — ISO 8601 or any format parseable by JavaScript new Date(). If no date column exists, use empty string.",
  "name": "Full name of the lead. Combine first + last name if separate.",
  "email": "Primary email address.",
  "country_code": "Phone country code, e.g. +91, +1. Include the + prefix.",
  "mobile_without_country_code": "Mobile number WITHOUT country code. Digits only.",
  "company": "Company or organization name.",
  "city": "City name.",
  "state": "State or province.",
  "country": "Country name.",
  "lead_owner": "Email or name of the lead owner / assignee.",
  "crm_status": "MUST be exactly one of: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE. If you cannot confidently determine the status, use GOOD_LEAD_FOLLOW_UP.",
  "crm_note": "Notes, remarks, follow-up comments, extra contact info. Put anything useful here that doesn't fit other fields.",
  "data_source": "MUST be exactly one of: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots. If none match confidently, use empty string.",
  "possession_time": "Property possession timeline if applicable, otherwise empty string.",
  "description": "Additional description or context."
}

CRITICAL RULES:
1. Map columns by SEMANTIC MEANING. "Full Name" → name, "Phone Number" → mobile, "Email Address" → email, "Lead Status" → crm_status, "Remarks" → crm_note, "Source" → data_source, etc.
2. If multiple email addresses exist in a row, use the FIRST as "email" and append the rest to "crm_note" prefixed with "Additional emails: ".
3. If multiple phone numbers exist, use the FIRST as "mobile_without_country_code" and append the rest to "crm_note" prefixed with "Additional phones: ".
4. crm_status MUST be one of the 4 allowed values. Map intelligently: "interested" / "hot" / "follow up" → GOOD_LEAD_FOLLOW_UP, "no answer" / "not reachable" → DID_NOT_CONNECT, "not interested" / "junk" / "spam" → BAD_LEAD, "converted" / "won" / "closed" / "sold" → SALE_DONE.
5. data_source MUST be one of the 5 allowed values OR empty string "". Do NOT invent new values.
6. For dates, output in a format parseable by JavaScript \`new Date()\`. Prefer "YYYY-MM-DD HH:mm:ss". If no date column exists, use "".
7. If a row has NEITHER an email NOR a mobile number, set "_skip" to true and "_skip_reason" to "No email or mobile number found".
8. NEVER introduce line breaks in field values. If you must include multi-line content, use \\n (escaped).
9. For each empty/missing field, use empty string "" — never null or undefined.
10. Preserve ALL useful information from the original row. If something doesn't fit the schema fields, put it in crm_note or description.

OUTPUT FORMAT:
Return a JSON array of objects. Each object has all 15 CRM fields plus optional "_skip" (boolean) and "_skip_reason" (string).
Return ONLY the JSON array, no markdown fences, no explanation.`;

// ── Extraction types ─────────────────────────────────────────────────────────

export interface AIExtractionRow extends CRMRecord {
  _skip?: boolean;
  _skip_reason?: string;
}

export interface BatchResult {
  batch_index: number;
  records: AIExtractionRow[];
  error?: string;
}

// ── Core extraction ──────────────────────────────────────────────────────────

/**
 * Extract CRM records from a single batch of CSV rows.
 * Retries up to MAX_RETRIES times with exponential backoff.
 */
async function extractBatch(
  rows: Record<string, string>[],
  headers: string[],
  batchIndex: number
): Promise<BatchResult> {
  const client = getGroqClient();

  // Build a compact representation of the rows for the prompt
  const rowsText = rows
    .map((row, i) => {
      const fields = headers
        .map((h) => `${h}: ${row[h] ?? ""}`)
        .join(" | ");
      return `Row ${batchIndex * BATCH_SIZE + i + 1}: ${fields}`;
    })
    .join("\n");

  const userPrompt = `Here are the CSV column headers: [${headers.join(", ")}]

Extract the following ${rows.length} rows into GrowEasy CRM format:

${rowsText}`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      });

      const raw = response.choices[0]?.message?.content;
      if (!raw) throw new Error("Empty AI response");

      // Parse the response — handle both {records: [...]} and bare [...]
      let parsed: AIExtractionRow[];
      const jsonObj = JSON.parse(raw);

      if (Array.isArray(jsonObj)) {
        parsed = jsonObj;
      } else if (jsonObj.records && Array.isArray(jsonObj.records)) {
        parsed = jsonObj.records;
      } else if (jsonObj.data && Array.isArray(jsonObj.data)) {
        parsed = jsonObj.data;
      } else {
        // Try to find the first array value in the object
        const firstArray = Object.values(jsonObj).find(Array.isArray);
        if (firstArray) {
          parsed = firstArray as AIExtractionRow[];
        } else {
          throw new Error("AI response is not an array of records");
        }
      }

      return { batch_index: batchIndex, records: parsed };
    } catch (err: any) {
      const isLastAttempt = attempt === MAX_RETRIES;
      const isRateLimit = err.status === 429 || err.message?.includes("429");

      if (isLastAttempt) {
        console.error(
          `[AI Extractor] Batch ${batchIndex} failed after ${MAX_RETRIES} attempts:`,
          err.message
        );
        return {
          batch_index: batchIndex,
          records: [],
          error: `Batch ${batchIndex} failed: ${err.message}`,
        };
      }

      // Exponential backoff
      const delay = isRateLimit
        ? RETRY_BASE_DELAY_MS * Math.pow(3, attempt) // longer wait for rate limits
        : RETRY_BASE_DELAY_MS * Math.pow(2, attempt);

      console.warn(
        `[AI Extractor] Batch ${batchIndex} attempt ${attempt} failed (${err.message}). Retrying in ${delay}ms...`
      );
      await sleep(delay);
    }
  }

  // Should never reach here, but just in case
  return { batch_index: batchIndex, records: [], error: "Unknown error" };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Extract all CSV rows into CRM records using AI, processing in batches.
 * Returns results from all batches, including any errors.
 */
export async function extractCRMRecords(
  rows: Record<string, string>[],
  headers: string[]
): Promise<{ results: BatchResult[]; batches_total: number }> {
  const batches: Record<string, string>[][] = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    batches.push(rows.slice(i, i + BATCH_SIZE));
  }

  console.log(
    `[AI Extractor] Processing ${rows.length} rows in ${batches.length} batches (batch size: ${BATCH_SIZE})`
  );

  // Process batches sequentially to respect rate limits
  const results: BatchResult[] = [];
  for (let i = 0; i < batches.length; i++) {
    const result = await extractBatch(batches[i], headers, i);
    results.push(result);

    // Small delay between batches to avoid rate limiting
    if (i < batches.length - 1) {
      await sleep(500);
    }
  }

  return { results, batches_total: batches.length };
}

export { BATCH_SIZE };

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
