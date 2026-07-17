'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { uploadCustomersCsv, uploadOrdersCsv, type Customer, type IngestionResponse } from '@/lib/api';
import { useCustomers } from '@/lib/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, CardBody, CardFooter, CardHeader, Modal, Spinner } from '@/app/components/ui';

type UploadResult = IngestionResponse['data'];

export default function CustomersPage() {
  const [page, setPage] = useState(1);
  const { data: res, isLoading: loading } = useCustomers(page, 20);
  const queryClient = useQueryClient();

  const customers: Customer[] = res?.data?.customers ?? [];
  const totalPages = res?.data?.pagination?.totalPages ?? 1;
  const total = res?.data?.pagination?.total ?? 0;

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadType, setUploadType] = useState<'customers' | 'orders'>('customers');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      const res = uploadType === 'customers'
        ? await uploadCustomersCsv(uploadFile)
        : await uploadOrdersCsv(uploadFile);
      setUploadResult(res.data);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload CSV');
    } finally {
      setUploading(false);
    }
  };

  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
    setUploadFile(null);
    setUploadResult(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {total.toLocaleString()} customers in the database.
          </p>
        </div>
        <Button onClick={() => setIsUploadModalOpen(true)}>Upload CSV</Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Name</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Email</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">City</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Gender</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Orders</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Spinner size={24} className="mx-auto" />
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-[var(--color-surface-hover)]">
                    <td className="px-6 py-3.5 font-medium">{c.name}</td>
                    <td className="px-4 py-3.5 text-[var(--color-text-muted)]">{c.email}</td>
                    <td className="px-4 py-3.5">
                      {c.city ? <Badge tone="neutral" uppercase={false}>{c.city}</Badge> : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-[var(--color-text-muted)]">{c.gender ?? '—'}</td>
                    <td className="px-4 py-3.5">
                      <Badge tone={(c._count?.orders ?? 0) > 5 ? 'success' : 'primary'} uppercase={false}>
                        {c._count?.orders ?? 0}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[var(--color-text-muted)]">
                      {new Date(c.signupDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-6 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface-muted)] flex items-center justify-between">
            <p className="text-xs text-[var(--color-text-muted)]">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}>
                ← Prev
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
                Next →
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      <Modal open={isUploadModalOpen} onClose={closeUploadModal}>
        <CardHeader>
          <h3 className="font-semibold text-lg">Upload Data</h3>
          <button
            onClick={closeUploadModal}
            aria-label="Close"
            className="text-lg leading-none transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ✕
          </button>
        </CardHeader>

        <CardBody className="space-y-5">
          {!uploadResult ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">What are you uploading?</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="uploadType" checked={uploadType === 'customers'} onChange={() => setUploadType('customers')} className="accent-[var(--color-primary)]" />
                    Customers
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="uploadType" checked={uploadType === 'orders'} onChange={() => setUploadType('orders')} className="accent-[var(--color-primary)]" />
                    Orders
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Select CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-[var(--color-text-muted)]
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-[var(--color-primary-soft)] file:text-[var(--color-primary)]
                    hover:file:opacity-80 cursor-pointer"
                />
              </div>

              {uploadError && (
                <div
                  className="p-3 text-sm rounded-lg border"
                  style={{ background: 'var(--color-accent-rose-soft)', color: 'var(--color-danger-text)', borderColor: 'var(--color-accent-rose-soft)' }}
                >
                  {uploadError}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 space-y-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto text-2xl"
                style={{ background: 'var(--color-accent-green-soft)', color: 'var(--color-accent-green)' }}
              >
                ✓
              </div>
              <h4 className="font-semibold text-lg" style={{ color: 'var(--color-accent-green)' }}>Upload Successful</h4>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Total Rows: {uploadResult.total_rows} <br />
                Ingested: <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{uploadResult.ingested}</span> <br />
                Skipped (Duplicates): {uploadResult.skipped_duplicates} <br />
                Skipped (Invalid): {uploadResult.skipped_invalid}
              </p>
            </div>
          )}
        </CardBody>

        <CardFooter className="justify-end">
          {uploadResult ? (
            <Button variant="secondary" onClick={closeUploadModal}>Done</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={closeUploadModal} disabled={uploading}>Cancel</Button>
              <Button onClick={handleUpload} disabled={!uploadFile} loading={uploading}>
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </>
          )}
        </CardFooter>
      </Modal>
    </div>
  );
}
