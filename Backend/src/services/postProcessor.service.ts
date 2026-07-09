import type { AIExtractionRow } from "./aiExtractor.service";
import type { CRMRecord, SkippedRecord } from "../types/crm.types";
import {
  ALLOWED_CRM_STATUSES,
  ALLOWED_DATA_SOURCES,
} from "../types/crm.types";

// ─────────────────────────────────────────────────────────────────────────────
// postProcessor.service.ts — Deterministic validation & normalisation
//
// Runs AFTER AI extraction to catch hallucinated values, normalise dates,
// validate enums, and separate skipped records.
// ─────────────────────────────────────────────────────────────────────────────

export interface PostProcessResult {
  imported: CRMRecord[];
  skipped: SkippedRecord[];
}

/**
 * Validate and normalise a batch of AI-extracted rows.
 * Returns clean CRM records and a list of skipped records with reasons.
 */
export function postProcessRecords(
  aiRows: AIExtractionRow[],
  originalRows: Record<string, string>[],
  batchStartIndex: number
): PostProcessResult {
  const imported: CRMRecord[] = [];
  const skipped: SkippedRecord[] = [];

  for (let i = 0; i < aiRows.length; i++) {
    const row = aiRows[i];
    const globalIndex = batchStartIndex + i;
    const original = originalRows[i] || {};

    // ── 1. AI already flagged this row for skipping ──────────────────────
    if (row._skip) {
      skipped.push({
        row_index: globalIndex + 1, // 1-indexed for display
        reason: row._skip_reason || "Flagged by AI for skipping",
        original_data: original,
      });
      continue;
    }

    // ── 2. Skip if no email AND no mobile ────────────────────────────────
    const email = normaliseString(row.email);
    const mobile = normaliseString(row.mobile_without_country_code);

    if (!email && !mobile) {
      skipped.push({
        row_index: globalIndex + 1,
        reason: "No email or mobile number found",
        original_data: original,
      });
      continue;
    }

    // ── 3. Normalise individual fields ───────────────────────────────────
    const record: CRMRecord = {
      created_at: normaliseDate(row.created_at),
      name: normaliseString(row.name),
      email,
      country_code: normaliseCountryCode(row.country_code),
      mobile_without_country_code: normaliseMobile(mobile),
      company: normaliseString(row.company),
      city: normaliseString(row.city),
      state: normaliseString(row.state),
      country: normaliseString(row.country),
      lead_owner: normaliseString(row.lead_owner),
      crm_status: normaliseCRMStatus(row.crm_status),
      crm_note: normaliseString(row.crm_note),
      data_source: normaliseDataSource(row.data_source),
      possession_time: normaliseString(row.possession_time),
      description: normaliseString(row.description),
    };

    imported.push(record);
  }

  return { imported, skipped };
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalisation helpers
// ─────────────────────────────────────────────────────────────────────────────

function normaliseString(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value).trim();
  // Remove literal line breaks that could break CSV output
  return str.replace(/\r?\n/g, "\\n");
}

/**
 * Validate and normalise dates.
 * Must be parseable by JavaScript `new Date()`.
 */
function normaliseDate(value: unknown): string {
  const str = normaliseString(value);
  if (!str) return "";

  try {
    const date = new Date(str);
    if (isNaN(date.getTime())) return "";
    // Return in ISO-like format that new Date() can parse
    return date.toISOString().replace("T", " ").replace("Z", "").split(".")[0];
  } catch {
    return "";
  }
}

/**
 * Ensure country code starts with "+".
 */
function normaliseCountryCode(value: unknown): string {
  const str = normaliseString(value);
  if (!str) return "";
  // Remove any non-digit/non-plus characters
  const cleaned = str.replace(/[^0-9+]/g, "");
  if (!cleaned) return "";
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
}

/**
 * Strip non-digit characters from mobile number.
 */
function normaliseMobile(value: string): string {
  if (!value) return "";
  return value.replace(/[^0-9]/g, "");
}

/**
 * Validate crm_status against allowed values.
 * Falls back to empty string if invalid.
 */
function normaliseCRMStatus(value: unknown): string {
  const str = normaliseString(value).toUpperCase().replace(/[\s-]/g, "_");
  if ((ALLOWED_CRM_STATUSES as readonly string[]).includes(str)) {
    return str;
  }
  // Try fuzzy matching for common variations
  if (str.includes("FOLLOW") || str.includes("GOOD") || str.includes("INTERESTED")) {
    return "GOOD_LEAD_FOLLOW_UP";
  }
  if (str.includes("CONNECT") || str.includes("REACH") || str.includes("ANSWER")) {
    return "DID_NOT_CONNECT";
  }
  if (str.includes("BAD") || str.includes("JUNK") || str.includes("SPAM") || str.includes("NOT_INTERESTED")) {
    return "BAD_LEAD";
  }
  if (str.includes("SALE") || str.includes("DONE") || str.includes("CONVERT") || str.includes("WON") || str.includes("CLOSED")) {
    return "SALE_DONE";
  }
  return "";
}

/**
 * Validate data_source against allowed values.
 * Falls back to empty string if no match.
 */
function normaliseDataSource(value: unknown): string {
  const str = normaliseString(value).toLowerCase().replace(/[\s-]/g, "_");
  if ((ALLOWED_DATA_SOURCES as readonly string[]).includes(str)) {
    return str;
  }
  return "";
}
