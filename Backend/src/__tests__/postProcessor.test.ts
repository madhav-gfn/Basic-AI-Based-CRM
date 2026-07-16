import { describe, it, expect } from "vitest";
import { postProcessRecords } from "../services/postProcessor.service";
import type { AIExtractionRow } from "../services/aiExtractor.service";

describe("postProcessRecords", () => {
  // ── Helper to make a minimal valid AI row ──────────────────────────────
  function makeRow(overrides: Partial<AIExtractionRow> = {}): AIExtractionRow {
    return {
      name: "Test User",
      email: "test@example.com",
      phone: "9876543210",
      gender: "",
      city: "Mumbai",
      signup_date: "",
      ...overrides,
    };
  }

  const dummyOriginal = { name: "Test", email: "test@example.com" };

  // ── Required field validation ────────────────────────────────────────────

  it("keeps rows with both name and email", () => {
    const { imported } = postProcessRecords([makeRow()], [dummyOriginal], 0);
    expect(imported).toHaveLength(1);
    expect(imported[0].record.name).toBe("Test User");
    expect(imported[0].record.email).toBe("test@example.com");
  });

  it("skips rows with no email", () => {
    const { imported, skipped } = postProcessRecords(
      [makeRow({ email: "" })],
      [dummyOriginal],
      0
    );
    expect(imported).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toContain("No email");
  });

  it("skips rows with no name", () => {
    const { imported, skipped } = postProcessRecords(
      [makeRow({ name: "" })],
      [dummyOriginal],
      0
    );
    expect(imported).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toContain("No name");
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

  // ── Email normalisation ──────────────────────────────────────────────────

  it("lowercases email addresses", () => {
    const { imported } = postProcessRecords(
      [makeRow({ email: "Test@Example.COM" })],
      [dummyOriginal],
      0
    );
    expect(imported[0].record.email).toBe("test@example.com");
  });

  // ── Phone normalisation ───────────────────────────────────────────────────

  it("strips non-digit, non-plus characters from phone numbers", () => {
    const { imported } = postProcessRecords(
      [makeRow({ phone: "+91 987-654-3210" })],
      [dummyOriginal],
      0
    );
    expect(imported[0].record.phone).toBe("+919876543210");
  });

  // ── Gender normalisation ─────────────────────────────────────────────────

  it("normalises common gender shorthands", () => {
    const mappings: [string, string][] = [
      ["M", "Male"],
      ["male", "Male"],
      ["F", "Female"],
      ["female", "Female"],
      ["other", "Other"],
    ];
    for (const [input, expected] of mappings) {
      const { imported } = postProcessRecords(
        [makeRow({ gender: input })],
        [dummyOriginal],
        0
      );
      expect(imported[0].record.gender).toBe(expected);
    }
  });

  it("passes through unrecognised gender values as-is", () => {
    const { imported } = postProcessRecords(
      [makeRow({ gender: "Non-binary custom" })],
      [dummyOriginal],
      0
    );
    expect(imported[0].record.gender).toBe("Non-binary custom");
  });

  // ── Date normalisation ────────────────────────────────────────────────────

  it("normalises valid dates to an ISO string", () => {
    const { imported } = postProcessRecords(
      [makeRow({ signup_date: "2026-05-13T14:20:48Z" })],
      [dummyOriginal],
      0
    );
    expect(imported[0].record.signup_date).toBe(
      new Date("2026-05-13T14:20:48Z").toISOString()
    );
  });

  it("returns empty string for unparseable dates", () => {
    const { imported } = postProcessRecords(
      [makeRow({ signup_date: "not-a-date" })],
      [dummyOriginal],
      0
    );
    expect(imported[0].record.signup_date).toBe("");
  });

  // ── Row indexing ───────────────────────────────────────────────────────

  it("uses 1-indexed row numbers for imported and skipped records", () => {
    const { imported } = postProcessRecords(
      [makeRow()],
      [dummyOriginal],
      4 // batch start index = 4, so row should be 5 (1-indexed)
    );
    expect(imported[0].row_index).toBe(5);

    const { skipped } = postProcessRecords(
      [makeRow({ email: "" })],
      [dummyOriginal],
      4
    );
    expect(skipped[0].row_index).toBe(5);
  });

  // ── Line break sanitisation ────────────────────────────────────────────

  it("replaces line breaks in string fields with escaped \\n", () => {
    const { imported } = postProcessRecords(
      [makeRow({ name: "Line one\nLine two\r\nLine three" })],
      [dummyOriginal],
      0
    );
    expect(imported[0].record.name).not.toContain("\n");
    expect(imported[0].record.name).toContain("\\n");
  });
});
