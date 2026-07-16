import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { parseCSVBuffer } from "../services/csvParser.service";
import { extractCRMRecords, BATCH_SIZE } from "../services/aiExtractor.service";
import { postProcessRecords, type ImportedRecord } from "../services/postProcessor.service";
import { sendSuccess, sendError } from "../utils/response";
import type { CRMRecord, SkippedRecord, ImportResult } from "../types/crm.types";

// ─────────────────────────────────────────────────────────────────────────────
// import.controller.ts — Handles CSV upload → AI extraction → Customer table
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Persist AI-extracted, post-processed records into the `customers` table.
 * Inserted one at a time (batches are already small — 20-50 rows) so that
 * duplicate emails can be reported individually instead of silently merged
 * into a single createMany() count.
 */
async function persistImportedRecords(
  candidates: ImportedRecord[]
): Promise<{ persisted: CRMRecord[]; dbSkipped: SkippedRecord[] }> {
  const persisted: CRMRecord[] = [];
  const dbSkipped: SkippedRecord[] = [];

  for (const { row_index, record } of candidates) {
    try {
      await prisma.customer.create({
        data: {
          name: record.name,
          email: record.email,
          phone: record.phone || null,
          gender: record.gender || null,
          city: record.city || null,
          ...(record.signup_date ? { signupDate: new Date(record.signup_date) } : {}),
        },
      });
      persisted.push(record);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        dbSkipped.push({
          row_index,
          reason: `Duplicate email — a customer with email "${record.email}" already exists`,
          original_data: record as unknown as Record<string, string>,
        });
      } else {
        dbSkipped.push({
          row_index,
          reason: `Database error: ${(err as Error).message}`,
          original_data: record as unknown as Record<string, string>,
        });
      }
    }
  }

  return { persisted, dbSkipped };
}

export async function importCSV(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startTime = Date.now();

  try {
    // ── 1. Validate file upload ──────────────────────────────────────────
    if (!req.file) {
      sendError(res, "No file uploaded. Please attach a CSV file.", 400);
      return;
    }

    // ── 2. Parse CSV ─────────────────────────────────────────────────────
    const { headers, rows } = await parseCSVBuffer(req.file.buffer);

    if (rows.length === 0) {
      sendError(res, "CSV file is empty or contains only headers.", 422);
      return;
    }

    if (headers.length === 0) {
      sendError(res, "Could not detect any columns in the CSV.", 422);
      return;
    }

    console.log(
      `[Import] Received CSV with ${rows.length} rows and ${headers.length} columns: [${headers.join(", ")}]`
    );

    // ── 3. AI extraction (batched) ───────────────────────────────────────
    const { results: batchResults, batches_total } = await extractCRMRecords(
      rows,
      headers
    );

    // ── 4. Post-process all batches ──────────────────────────────────────
    const importCandidates: ImportedRecord[] = [];
    const allSkipped: SkippedRecord[] = [];

    for (const batch of batchResults) {
      if (batch.error) {
        // If an entire batch failed, mark all its rows as skipped
        const batchStart = batch.batch_index * BATCH_SIZE;
        const batchEnd = Math.min(batchStart + BATCH_SIZE, rows.length);

        for (let i = batchStart; i < batchEnd; i++) {
          allSkipped.push({
            row_index: i + 1,
            reason: `AI processing failed: ${batch.error}`,
            original_data: rows[i],
          });
        }
        continue;
      }

      const batchStartIndex = batch.batch_index * BATCH_SIZE;
      const batchOriginalRows = rows.slice(
        batchStartIndex,
        batchStartIndex + BATCH_SIZE
      );

      const { imported, skipped } = postProcessRecords(
        batch.records,
        batchOriginalRows,
        batchStartIndex
      );

      importCandidates.push(...imported);
      allSkipped.push(...skipped);
    }

    // ── 5. Persist validated candidates into the Customer table ───────────
    const { persisted, dbSkipped } = await persistImportedRecords(importCandidates);
    allSkipped.push(...dbSkipped);

    // ── 6. Build response ────────────────────────────────────────────────
    const processingTime = Date.now() - startTime;

    const result: ImportResult = {
      total_rows: rows.length,
      total_imported: persisted.length,
      total_skipped: allSkipped.length,
      imported_records: persisted,
      skipped_records: allSkipped,
      processing_time_ms: processingTime,
      batches_processed: batches_total,
    };

    console.log(
      `[Import] Complete — ${persisted.length} imported, ${allSkipped.length} skipped, ${processingTime}ms`
    );

    sendSuccess(res, result, "CSV import complete");
  } catch (error: any) {
    console.error("[Import] Unhandled error:", error);
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Chunked Import — Handles a JSON chunk of parsed CSV rows
// ─────────────────────────────────────────────────────────────────────────────

export async function importChunk(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startTime = Date.now();

  try {
    const { headers, rows, startIndex } = req.body as {
      headers: string[];
      rows: Record<string, string>[];
      startIndex: number;
    };

    if (!headers || !Array.isArray(headers) || !rows || !Array.isArray(rows)) {
      sendError(res, "Invalid payload. Expected 'headers' and 'rows' arrays.", 400);
      return;
    }

    if (rows.length === 0) {
      sendSuccess(res, {
        total_rows: 0,
        total_imported: 0,
        total_skipped: 0,
        imported_records: [],
        skipped_records: [],
        processing_time_ms: 0,
        batches_processed: 0,
      }, "Empty chunk");
      return;
    }

    const startIdx = typeof startIndex === "number" ? startIndex : 0;

    console.log(`[Import Chunk] Processing rows ${startIdx + 1} to ${startIdx + rows.length}...`);

    // ── 1. AI extraction (batched internally if chunk > AI_BATCH_SIZE) ───
    const { results: batchResults, batches_total } = await extractCRMRecords(
      rows,
      headers
    );

    // ── 2. Post-process all batches ──────────────────────────────────────
    const importCandidates: ImportedRecord[] = [];
    const allSkipped: SkippedRecord[] = [];

    for (const batch of batchResults) {
      // batch.batch_index is relative to this chunk
      const batchStartWithinChunk = batch.batch_index * BATCH_SIZE;
      const globalBatchStartIndex = startIdx + batchStartWithinChunk;

      if (batch.error) {
        const batchEndWithinChunk = Math.min(batchStartWithinChunk + BATCH_SIZE, rows.length);
        for (let i = batchStartWithinChunk; i < batchEndWithinChunk; i++) {
          allSkipped.push({
            row_index: startIdx + i + 1, // 1-indexed global row number
            reason: `AI processing failed: ${batch.error}`,
            original_data: rows[i],
          });
        }
        continue;
      }

      const batchOriginalRows = rows.slice(
        batchStartWithinChunk,
        batchStartWithinChunk + BATCH_SIZE
      );

      const { imported, skipped } = postProcessRecords(
        batch.records,
        batchOriginalRows,
        globalBatchStartIndex
      );

      importCandidates.push(...imported);
      allSkipped.push(...skipped);
    }

    // ── 3. Persist validated candidates into the Customer table ───────────
    const { persisted, dbSkipped } = await persistImportedRecords(importCandidates);
    allSkipped.push(...dbSkipped);

    // ── 4. Build response ────────────────────────────────────────────────
    const processingTime = Date.now() - startTime;

    const result: ImportResult = {
      total_rows: rows.length,
      total_imported: persisted.length,
      total_skipped: allSkipped.length,
      imported_records: persisted,
      skipped_records: allSkipped,
      processing_time_ms: processingTime,
      batches_processed: batches_total,
    };

    console.log(
      `[Import Chunk] Complete — ${persisted.length} imported, ${allSkipped.length} skipped`
    );

    sendSuccess(res, result, "Chunk import complete");
  } catch (error: any) {
    console.error("[Import Chunk] Unhandled error:", error);
    next(error);
  }
}
