// ─────────────────────────────────────────────────────────────────────────────
// GrowEasy CRM Types — AI-Powered CSV Import
// ─────────────────────────────────────────────────────────────────────────────

/** The 15-field GrowEasy CRM lead record. */
export interface CRMRecord {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: string;
  crm_note: string;
  data_source: string;
  possession_time: string;
  description: string;
}

/** A row the AI or post-processor decided to skip. */
export interface SkippedRecord {
  row_index: number;
  reason: string;
  original_data: Record<string, string>;
}

/** Shape returned by the POST /api/import/csv endpoint. */
export interface ImportResult {
  total_rows: number;
  total_imported: number;
  total_skipped: number;
  imported_records: CRMRecord[];
  skipped_records: SkippedRecord[];
  processing_time_ms: number;
  batches_processed: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Enums — single source of truth for allowed values
// ─────────────────────────────────────────────────────────────────────────────

export const ALLOWED_CRM_STATUSES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
] as const;

export type CRMStatus = (typeof ALLOWED_CRM_STATUSES)[number];

export const ALLOWED_DATA_SOURCES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
] as const;

export type DataSource = (typeof ALLOWED_DATA_SOURCES)[number];
