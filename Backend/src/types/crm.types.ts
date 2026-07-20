// ─────────────────────────────────────────────────────────────────────────────
// Saucer AI Types — AI-Powered CSV Import
//
// Mirrors the `Customer` model in Prisma/schema.prisma: name, email, phone,
// gender, city, signupDate. The AI extractor maps arbitrary CSV columns onto
// exactly these fields — nothing more, nothing less.
// ─────────────────────────────────────────────────────────────────────────────

/** A CSV row extracted into Saucer AI's Customer shape. */
export interface CRMRecord {
  name: string;
  email: string;
  phone: string;
  gender: string;
  city: string;
  signup_date: string;
}

/** A row the AI, post-processor, or database decided to skip. */
export interface SkippedRecord {
  row_index: number;
  reason: string;
  original_data: Record<string, string>;
}

/** Shape returned by the POST /api/import/csv and /api/import/chunk endpoints. */
export interface ImportResult {
  total_rows: number;
  total_imported: number;
  total_skipped: number;
  imported_records: CRMRecord[];
  skipped_records: SkippedRecord[];
  processing_time_ms: number;
  batches_processed: number;
}
