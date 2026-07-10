import { describe, it, expect } from "vitest";
import { postProcessRecords } from "../services/postProcessor.service";
import type { AIExtractionRow } from "../services/aiExtractor.service";

describe("postProcessRecords", () => {
  // ── Helper to make a minimal valid AI row ──────────────────────────────
  function makeRow(overrides: Partial<AIExtractionRow> = {}): AIExtractionRow {
    return {
      created_at: "2026-05-13 14:20:48",
      name: "Test User",
      email: "test@example.com",
      country_code: "+91",
      mobile_without_country_code: "9876543210",
      company: "TestCorp",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      lead_owner: "owner@test.com",
      crm_status: "GOOD_LEAD_FOLLOW_UP",
      crm_note: "",
      data_source: "",
      possession_time: "",
      description: "",
      ...overrides,
    };
  }

  const dummyOriginal = { name: "Test", email: "test@example.com" };

  // ── crm_status validation ──────────────────────────────────────────────

  it("passes through valid crm_status values unchanged", () => {
    const statuses = [
      "GOOD_LEAD_FOLLOW_UP",
      "DID_NOT_CONNECT",
      "BAD_LEAD",
      "SALE_DONE",
    ];
    for (const status of statuses) {
      const { imported } = postProcessRecords(
        [makeRow({ crm_status: status })],
        [dummyOriginal],
        0
      );
      expect(imported[0].crm_status).toBe(status);
    }
  });

  it("normalises variations to valid crm_status values", () => {
    const mappings: [string, string][] = [
      ["follow up", "GOOD_LEAD_FOLLOW_UP"],
      ["interested", "GOOD_LEAD_FOLLOW_UP"],
      ["not reachable", "DID_NOT_CONNECT"],
      ["no answer", "DID_NOT_CONNECT"],
      ["junk", "BAD_LEAD"],
      ["spam", "BAD_LEAD"],
      ["converted", "SALE_DONE"],
      ["closed won", "SALE_DONE"],
    ];
    for (const [input, expected] of mappings) {
      const { imported } = postProcessRecords(
        [makeRow({ crm_status: input })],
        [dummyOriginal],
        0
      );
      expect(imported[0].crm_status).toBe(expected);
    }
  });

  it("returns empty string for completely unrecognised crm_status", () => {
    const { imported } = postProcessRecords(
      [makeRow({ crm_status: "RANDOM_VALUE" })],
      [dummyOriginal],
      0
    );
    expect(imported[0].crm_status).toBe("");
  });

  // ── data_source validation ─────────────────────────────────────────────

  it("passes through valid data_source values", () => {
    const sources = [
      "leads_on_demand",
      "meridian_tower",
      "eden_park",
      "varah_swamy",
      "sarjapur_plots",
    ];
    for (const source of sources) {
      const { imported } = postProcessRecords(
        [makeRow({ data_source: source })],
        [dummyOriginal],
        0
      );
      expect(imported[0].data_source).toBe(source);
    }
  });

  it("returns empty string for invalid data_source", () => {
    const { imported } = postProcessRecords(
      [makeRow({ data_source: "facebook_ads" })],
      [dummyOriginal],
      0
    );
    expect(imported[0].data_source).toBe("");
  });

  // ── Skip logic ─────────────────────────────────────────────────────────

  it("skips rows with neither email nor mobile", () => {
    const { imported, skipped } = postProcessRecords(
      [makeRow({ email: "", mobile_without_country_code: "" })],
      [dummyOriginal],
      0
    );
    expect(imported).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toContain("No email or mobile");
  });

  it("keeps rows with only email (no mobile)", () => {
    const { imported } = postProcessRecords(
      [makeRow({ mobile_without_country_code: "" })],
      [dummyOriginal],
      0
    );
    expect(imported).toHaveLength(1);
  });

  it("keeps rows with only mobile (no email)", () => {
    const { imported } = postProcessRecords(
      [makeRow({ email: "" })],
      [dummyOriginal],
      0
    );
    expect(imported).toHaveLength(1);
  });

  it("skips rows flagged by AI with _skip: true", () => {
    const { imported, skipped } = postProcessRecords(
      [makeRow({ _skip: true, _skip_reason: "AI says skip" })],
      [dummyOriginal],
      0
    );
    expect(imported).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toBe("AI says skip");
  });

  // ── Date normalisation ─────────────────────────────────────────────────

  it("normalises valid dates to YYYY-MM-DD HH:mm:ss format", () => {
    const { imported } = postProcessRecords(
      [makeRow({ created_at: "2026-05-13T14:20:48Z" })],
      [dummyOriginal],
      0
    );
    expect(imported[0].created_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it("returns empty string for unparseable dates", () => {
    const { imported } = postProcessRecords(
      [makeRow({ created_at: "not-a-date" })],
      [dummyOriginal],
      0
    );
    expect(imported[0].created_at).toBe("");
  });

  // ── Country code normalisation ─────────────────────────────────────────

  it("adds + prefix to country codes missing it", () => {
    const { imported } = postProcessRecords(
      [makeRow({ country_code: "91" })],
      [dummyOriginal],
      0
    );
    expect(imported[0].country_code).toBe("+91");
  });

  it("keeps + prefix if already present", () => {
    const { imported } = postProcessRecords(
      [makeRow({ country_code: "+1" })],
      [dummyOriginal],
      0
    );
    expect(imported[0].country_code).toBe("+1");
  });

  // ── Mobile normalisation ───────────────────────────────────────────────

  it("strips non-digit characters from mobile numbers", () => {
    const { imported } = postProcessRecords(
      [makeRow({ mobile_without_country_code: "987-654-3210" })],
      [dummyOriginal],
      0
    );
    expect(imported[0].mobile_without_country_code).toBe("9876543210");
  });

  // ── Row indexing ───────────────────────────────────────────────────────

  it("uses 1-indexed row numbers for skipped records", () => {
    const { skipped } = postProcessRecords(
      [makeRow({ email: "", mobile_without_country_code: "" })],
      [dummyOriginal],
      4 // batch start index = 4, so row should be 5 (1-indexed)
    );
    expect(skipped[0].row_index).toBe(5);
  });

  // ── Line break sanitisation ────────────────────────────────────────────

  it("replaces line breaks in string fields with escaped \\n", () => {
    const { imported } = postProcessRecords(
      [makeRow({ crm_note: "Line one\nLine two\r\nLine three" })],
      [dummyOriginal],
      0
    );
    expect(imported[0].crm_note).not.toContain("\n");
    expect(imported[0].crm_note).toContain("\\n");
  });
});
