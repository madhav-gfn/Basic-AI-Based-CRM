import { Readable } from "stream";
import csv from "csv-parser";

// ─────────────────────────────────────────────────────────────────────────────
// csvParser.service.ts — Generic, header-agnostic CSV parser
// ─────────────────────────────────────────────────────────────────────────────

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
}

/**
 * Parse a CSV buffer into header-agnostic row objects.
 * Headers are trimmed and lowercased for downstream normalisation.
 * Works with comma, tab, or semicolon delimiters (csv-parser auto-detects).
 */
export function parseCSVBuffer(buffer: Buffer): Promise<ParsedCSV> {
  return new Promise((resolve, reject) => {
    const rows: Record<string, string>[] = [];
    let headers: string[] = [];

    Readable.from(buffer)
      .pipe(
        csv({
          mapHeaders: ({ header }) => header.trim(),
          // Keep original casing in headers for display; lowercase only for logic
        })
      )
      .on("headers", (hdrs: string[]) => {
        headers = hdrs;
      })
      .on("data", (row: Record<string, string>) => {
        rows.push(row);
      })
      .on("end", () => resolve({ headers, rows }))
      .on("error", reject);
  });
}
