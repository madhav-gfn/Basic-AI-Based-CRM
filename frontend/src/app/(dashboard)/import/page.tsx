'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseCSVForPreview, formatFileSize, type CSVPreview } from '@/lib/csvPreview';
import { importCSVChunk, type ImportResult } from '@/lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// Step type definitions
// ─────────────────────────────────────────────────────────────────────────────

type Step = 'upload' | 'preview' | 'processing' | 'results';

const STEPS: { key: Step; label: string }[] = [
  { key: 'upload', label: 'Upload CSV' },
  { key: 'preview', label: 'Preview Data' },
  { key: 'processing', label: 'AI Processing' },
  { key: 'results', label: 'Results' },
];

// ─────────────────────────────────────────────────────────────────────────────
// CRM display fields for results table
// ─────────────────────────────────────────────────────────────────────────────

const CRM_FIELDS = [
  'created_at', 'name', 'email', 'country_code', 'mobile_without_country_code',
  'company', 'city', 'state', 'country', 'lead_owner',
  'crm_status', 'crm_note', 'data_source', 'possession_time', 'description',
];

// ─────────────────────────────────────────────────────────────────────────────
// Main page component
// ─────────────────────────────────────────────────────────────────────────────

export default function ImporterPage() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CSVPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File handling ────────────────────────────────────────────────────────

  const handleFile = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a .csv file');
      return;
    }
    setError(null);
    setFile(f);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseCSVForPreview(text);
        if (parsed.totalRows === 0) {
          setError('CSV file appears to be empty');
          return;
        }
        setPreview(parsed);
        setStep('preview');
      } catch {
        setError('Failed to parse CSV file');
      }
    };
    reader.readAsText(f);
  }, []);

  // ── Drag & Drop ──────────────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  // ── Import ───────────────────────────────────────────────────────────────

  const handleConfirmImport = useCallback(async () => {
    if (!file || !preview) return;

    setStep('processing');
    setError(null);
    setProgress(0);
    setProcessingMessage('Starting AI extraction...');

    const CHUNK_SIZE = 50;
    const totalRows = preview.rows.length;
    let processedRows = 0;

    const finalResult: ImportResult = {
      total_rows: totalRows,
      total_imported: 0,
      total_skipped: 0,
      imported_records: [],
      skipped_records: [],
      processing_time_ms: 0,
      batches_processed: 0,
    };

    const startTime = Date.now();

    try {
      for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
        const chunk = preview.rows.slice(i, i + CHUNK_SIZE);
        setProcessingMessage(`Processing rows ${i + 1} to ${Math.min(i + CHUNK_SIZE, totalRows)} of ${totalRows}...`);

        // Convert string[][] back to Record<string, string>[] using headers
        const jsonRows = chunk.map(rowArray => {
          const rowObj: Record<string, string> = {};
          preview.headers.forEach((header, idx) => {
            rowObj[header] = rowArray[idx] || '';
          });
          return rowObj;
        });

        const response = await importCSVChunk({
          headers: preview.headers,
          rows: jsonRows,
          startIndex: i
        });

        finalResult.total_imported += response.data.total_imported;
        finalResult.total_skipped += response.data.total_skipped;
        finalResult.imported_records.push(...response.data.imported_records);
        finalResult.skipped_records.push(...response.data.skipped_records);
        finalResult.batches_processed += response.data.batches_processed;

        processedRows += chunk.length;
        setProgress((processedRows / totalRows) * 100);
      }

      finalResult.processing_time_ms = Date.now() - startTime;
      setResult(finalResult);
      setStep('results');
    } catch (err: any) {
      setError(err.message || 'Import failed during chunk processing');
      setStep('preview');
    }
  }, [file, preview]);

  // ── Reset ────────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setStep('upload');
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setProcessingMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // ── Step index for progress ──────────────────────────────────────────────

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI CSV Importer</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Upload any CSV — AI will intelligently map your columns to CRM fields
          </p>
        </div>
        {step !== 'upload' && step !== 'processing' && (
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-[var(--color-border)] hover:bg-gray-50 transition-all"
          >
            ← New Import
          </button>
        )}
      </div>

      {/* ── Step Indicator ──────────────────────────────────────────── */}
      <div className="ge-step-bar">
        {STEPS.map((s, i) => {
          const isActive = i === stepIndex;
          const isCompleted = i < stepIndex;
          return (
            <React.Fragment key={s.key}>
              <div className={`ge-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                <div className="ge-step-number">
                  {isCompleted ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  flex: 1,
                  height: 1,
                  background: isCompleted ? 'var(--color-accent-green)' : 'var(--color-border)',
                  margin: '0 12px',
                  transition: 'background 0.3s ease',
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {/* ── Step 1: Upload ──────────────────────────────────────────── */}
        {step === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>
                Import your leads
              </h2>
              <p style={{ fontSize: 15, color: 'var(--color-text-muted)' }}>
                Upload any CSV file — our AI will intelligently map your columns to Moda CRM fields
              </p>
            </div>

            <div
              className={`ge-dropzone ${isDragging ? 'active' : ''} ${file ? 'has-file' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />

              <motion.div
                animate={{ scale: isDragging ? 1.1 : 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div style={{
                  fontSize: 48,
                  marginBottom: 16,
                  filter: isDragging ? 'drop-shadow(0 0 20px rgba(176, 186, 153, 0.5))' : 'none',
                  transition: 'filter 0.3s ease',
                }}>
                  📄
                </div>
                <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>
                  {isDragging ? 'Drop your CSV here' : 'Drag & drop your CSV file here'}
                </p>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
                  or click to browse files
                </p>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 20px',
                  borderRadius: 8,
                  background: 'var(--color-primary-soft)',
                  color: 'var(--color-primary)',
                  fontSize: 13,
                  fontWeight: 600,
                }}>
                  📁 Choose File
                </div>
              </motion.div>
            </div>

            {/* Supported formats */}
            <div style={{
              marginTop: 24,
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 8,
            }}>
              {['Facebook Leads', 'Google Ads', 'Real Estate CRM', 'Excel Exports', 'Custom Spreadsheets'].map((format) => (
                <span key={format} className="ge-badge ge-badge-accent">
                  {format}
                </span>
              ))}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  marginTop: 20,
                  padding: '12px 20px',
                  borderRadius: 10,
                  background: '#fde8ef',
                  color: '#e53e3e',
                  fontSize: 14,
                  textAlign: 'center',
                }}
              >
                {error}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── Step 2: Preview ─────────────────────────────────────────── */}
        {step === 'preview' && preview && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* File info bar */}
            <div className="ge-card" style={{
              padding: '16px 24px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 28 }}>📊</span>
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--color-text)', margin: 0, fontSize: 15 }}>
                    {file?.name}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                    {file && formatFileSize(file.size)} • {preview.totalRows} rows • {preview.headers.length} columns
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleReset} className="ge-btn-secondary" style={{ fontSize: 13, padding: '8px 16px' }}>
                  Remove
                </button>
                <button onClick={handleConfirmImport} className="ge-btn-primary" style={{ fontSize: 14 }}>
                  🚀 Confirm Import
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  marginBottom: 16,
                  padding: '12px 20px',
                  borderRadius: 10,
                  background: '#fde8ef',
                  color: '#e53e3e',
                  fontSize: 14,
                }}
              >
                ⚠️ {error} — You can try again.
              </motion.div>
            )}

            {/* Preview table */}
            <div style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
                Data Preview
              </h3>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Showing {Math.min(preview.rows.length, 100)} of {preview.totalRows} rows — AI processing has not started yet
              </p>
            </div>

            <div className="ge-table-container">
              <table className="ge-table">
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>#</th>
                    {preview.headers.map((h, i) => (
                      <th key={i}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 100).map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{rowIdx + 1}</td>
                      {preview.headers.map((_, colIdx) => (
                        <td key={colIdx}>{row[colIdx] || ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {preview.totalRows > 100 && (
              <p style={{
                marginTop: 12,
                fontSize: 12,
                color: 'var(--color-text-muted)',
                textAlign: 'center',
              }}>
                Preview limited to 100 rows. All {preview.totalRows} rows will be processed.
              </p>
            )}
          </motion.div>
        )}

        {/* ── Step 3: Processing ──────────────────────────────────────── */}
        {step === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            style={{ textAlign: 'center', paddingTop: 80 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                border: '3px solid var(--color-border)',
                borderTopColor: 'var(--color-primary)',
                margin: '0 auto 24px',
              }}
            />
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>
              Processing with AI
            </h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 24 }}>
              {processingMessage}
            </p>

            <div className="ge-progress-track" style={{ maxWidth: 400, margin: '0 auto' }}>
              <motion.div
                className="ge-progress-fill"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>

            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 16 }}>
              This may take a moment depending on the file size...
            </p>
          </motion.div>
        )}

        {/* ── Step 4: Results ─────────────────────────────────────────── */}
        {step === 'results' && result && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Metrics row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 16,
              marginBottom: 28,
            }}>
              <MetricCard
                label="Total Rows"
                value={result.total_rows}
                color="var(--color-primary)"
              />
              <MetricCard
                label="Imported"
                value={result.total_imported}
                color="var(--color-accent-green)"
                icon="✓"
              />
              <MetricCard
                label="Skipped"
                value={result.total_skipped}
                color="var(--color-accent-amber)"
                icon="⚠"
              />
              <MetricCard
                label="Processing Time"
                value={`${(result.processing_time_ms / 1000).toFixed(1)}s`}
                color="var(--color-text-muted)"
                icon="⏱"
              />
            </div>

            {/* Imported records table */}
            {result.imported_records.length > 0 && (
              <>
                <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 2 }}>
                      Imported Records
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {result.imported_records.length} records successfully extracted
                    </p>
                  </div>
                  <span className="ge-badge ge-badge-success">
                    ✓ {result.imported_records.length} imported
                  </span>
                </div>

                <div className="ge-table-container" style={{ marginBottom: 32 }}>
                  <table className="ge-table">
                    <thead>
                      <tr>
                        <th style={{ width: 50 }}>#</th>
                        {CRM_FIELDS.map((field) => (
                          <th key={field}>{formatFieldName(field)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.imported_records.map((record, idx) => (
                        <tr key={idx}>
                          <td style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{idx + 1}</td>
                          {CRM_FIELDS.map((field) => (
                            <td key={field}>
                              {field === 'crm_status' ? (
                                <StatusBadge status={record[field as keyof typeof record] as string} />
                              ) : (
                                (record[field as keyof typeof record] as string) || '—'
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Skipped records table */}
            {result.skipped_records.length > 0 && (
              <>
                <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 2 }}>
                      Skipped Records
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      These rows could not be imported
                    </p>
                  </div>
                  <span className="ge-badge ge-badge-warning">
                    ⚠ {result.skipped_records.length} skipped
                  </span>
                </div>

                <div className="ge-table-container">
                  <table className="ge-table">
                    <thead>
                      <tr>
                        <th>Row #</th>
                        <th>Reason</th>
                        <th>Original Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.skipped_records.map((skipped, idx) => (
                        <tr key={idx}>
                          <td>{skipped.row_index}</td>
                          <td style={{ color: 'var(--color-accent-amber)' }}>{skipped.reason}</td>
                          <td style={{ maxWidth: 400 }}>
                            {Object.entries(skipped.original_data)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(' | ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Action buttons */}
            <div style={{ marginTop: 32, textAlign: 'center' }}>
              <button onClick={handleReset} className="ge-btn-primary" style={{ fontSize: 15 }}>
                📄 Import Another CSV
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function MetricCard({ label, value, color, icon }: {
  label: string;
  value: number | string;
  color: string;
  icon?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="ge-metric-card"
    >
      <span className="ge-metric-label">{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
        <AnimatedNumber value={value} color={color} />
      </div>
    </motion.div>
  );
}

function AnimatedNumber({ value, color }: { value: number | string; color: string }) {
  const [display, setDisplay] = useState<number | string>(typeof value === 'number' ? 0 : value);

  useEffect(() => {
    if (typeof value !== 'number') {
      setDisplay(value);
      return;
    }

    const duration = 800;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(Math.round(increment * step), value);
      setDisplay(current);
      if (step >= steps) clearInterval(timer);
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span className="ge-metric-value" style={{ color }}>
      {display}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; color: string }> = {
    GOOD_LEAD_FOLLOW_UP: { bg: 'var(--color-accent-green-soft)', color: 'var(--color-accent-green)' },
    DID_NOT_CONNECT: { bg: 'var(--color-accent-amber-soft)', color: 'var(--color-accent-amber)' },
    BAD_LEAD: { bg: 'var(--color-accent-rose-soft)', color: 'var(--color-accent-rose)' },
    SALE_DONE: { bg: 'var(--color-accent-blue-soft)', color: 'var(--color-accent-blue)' },
  };

  const c = config[status] || { bg: '#f0f0f0', color: 'var(--color-text-muted)' };

  return (
    <span style={{
      padding: '3px 10px',
      borderRadius: 999,
      fontSize: 10,
      fontWeight: 700,
      background: c.bg,
      color: c.color,
      whiteSpace: 'nowrap',
    }}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function formatFieldName(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
