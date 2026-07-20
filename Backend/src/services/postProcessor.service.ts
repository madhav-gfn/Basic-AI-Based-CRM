import type { AIExtractionRow } from "./aiExtractor.service";
import type { CRMRecord, SkippedRecord } from "../types/crm.types";

// ─────────────────────────────────────────────────────────────────────────────
// postProcessor.service.ts — Deterministic validation & normalisation
//
// Runs AFTER AI extraction to catch hallucinated values, normalise dates,
// and separate skipped records. Output matches Saucer AI's Customer model
// (name, email, phone, gender, city, signup_date) field-for-field.
// ─────────────────────────────────────────────────────────────────────────────

/** A validated record paired with its 1-indexed position in the source CSV. */
export interface ImportedRecord {
  row_index: number;
  record: CRMRecord;
}

export interface PostProcessResult {
  imported: ImportedRecord[];
  skipped: SkippedRecord[];
}

/**
 * Validate and normalise a batch of AI-extracted rows.
 * Returns clean CRM records (with their original row numbers) and a list of
 * skipped records with reasons.
 */
export function postProcessRecords(
  aiRows: AIExtractionRow[],
  originalRows: Record<string, string>[],
  batchStartIndex: number
): PostProcessResult {
  const imported: ImportedRecord[] = [];
  const skipped: SkippedRecord[] = [];

  for (let i = 0; i < aiRows.length; i++) {
    const row = aiRows[i];
    const globalIndex = batchStartIndex + i;
    const rowIndex = globalIndex + 1; // 1-indexed for display
    const original = originalRows[i] || {};

    // ── 1. AI already flagged this row for skipping ──────────────────────
    if (row._skip) {
      skipped.push({
        row_index: rowIndex,
        reason: row._skip_reason || "Flagged by AI for skipping",
        original_data: original,
      });
      continue;
    }

    // ── 2. name and email are required (Customer.name / Customer.email) ──
    const name = normaliseString(row.name);
    const email = normaliseEmail(row.email);

    if (!name || !email) {
      skipped.push({
        row_index: rowIndex,
        reason: !email ? "No email address found" : "No name found",
        original_data: original,
      });
      continue;
    }

    // ── 3. Normalise individual fields ───────────────────────────────────
    const record: CRMRecord = {
      name,
      email,
      phone: normalisePhone(row.phone),
      gender: normaliseGender(row.gender),
      city: normaliseString(row.city),
      signup_date: normaliseDate(row.signup_date),
    };

    imported.push({ row_index: rowIndex, record });
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

function normaliseEmail(value: unknown): string {
  return normaliseString(value).toLowerCase();
}

/**
 * Strip everything except digits and a leading "+" from a phone number.
 */
function normalisePhone(value: unknown): string {
  const str = normaliseString(value);
  if (!str) return "";
  const cleaned = str.replace(/[^0-9+]/g, "");
  return cleaned;
}

/**
 * Normalise common gender shorthands to a consistent label.
 * Falls back to whatever the AI provided (trimmed) if unrecognised.
 */
function normaliseGender(value: unknown): string {
  const raw = normaliseString(value);
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower === "m" || lower === "male") return "Male";
  if (lower === "f" || lower === "female") return "Female";
  if (["o", "other", "non-binary", "nonbinary"].includes(lower)) return "Other";
  return raw;
}

/**
 * Validate dates. Must be parseable by JavaScript `new Date()`.
 */
function normaliseDate(value: unknown): string {
  const str = normaliseString(value);
  if (!str) return "";

  try {
    const date = new Date(str);
    if (isNaN(date.getTime())) return "";
    return date.toISOString();
  } catch {
    return "";
  }
}
