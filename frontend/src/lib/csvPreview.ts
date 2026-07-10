/**
 * csvPreview.ts — Client-side CSV parser for preview (no AI, just raw parsing)
 *
 * Parses CSV text into headers and rows for local preview before sending to backend.
 * Handles quoted fields, commas within quotes, and various line endings.
 */

export interface CSVPreview {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

export function parseCSVForPreview(text: string): CSVPreview {
  const lines = splitCSVLines(text);
  if (lines.length === 0) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  const headers = parseCSVLine(lines[0]).map((h) => h.trim());
  const rows: string[][] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // skip empty lines
    const fields = parseCSVLine(line);
    rows.push(fields);
  }

  return { headers, rows, totalRows: rows.length };
}

/**
 * Split text into lines, respecting quoted fields that may contain newlines.
 */
function splitCSVLines(text: string): string[] {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      // Check for escaped quote ("")
      if (inQuotes && i + 1 < text.length && text[i + 1] === '"') {
        current += '""';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
        current += char;
      }
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && i + 1 < text.length && text[i + 1] === "\n") {
        i++; // skip \n after \r
      }
      if (current.trim()) {
        lines.push(current);
      }
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    lines.push(current);
  }

  return lines;
}

/**
 * Parse a single CSV line into fields.
 * Handles quoted fields with commas and escaped quotes.
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Format file size for display.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
