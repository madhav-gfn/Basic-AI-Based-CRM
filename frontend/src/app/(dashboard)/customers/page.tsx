'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCustomers, uploadCustomersCsv, uploadOrdersCsv, type Customer } from '@/lib/api';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadType, setUploadType] = useState<'customers' | 'orders'>('customers');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      let res;
      if (uploadType === 'customers') {
        res = await uploadCustomersCsv(uploadFile);
      } else {
        res = await uploadOrdersCsv(uploadFile);
      }
      setUploadResult(res.data);
      fetchPage(1); // refresh table
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
  };

  const fetchPage = (p: number) => {
    setLoading(true);
    getCustomers(p, 20)
      .then((res) => {
        setCustomers(res.data.customers);
        setTotalPages(res.data.pagination.totalPages);
        setTotal(res.data.pagination.total);
        setPage(p);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPage(1);
  }, []);

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {total.toLocaleString()} customers in the database.
          </p>
        </div>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-sm"
        >
          Upload CSV
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden"
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-gray-50/50">
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
                <td colSpan={6} className="px-6 py-12 text-center text-[var(--color-text-muted)]">
                  <div className="w-6 h-6 border-2 border-[var(--color-primary-soft)] border-t-[var(--color-primary)] rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3.5 font-medium">{c.name}</td>
                  <td className="px-4 py-3.5 text-[var(--color-text-muted)]">{c.email}</td>
                  <td className="px-4 py-3.5">
                    {c.city ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100">{c.city}</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-[var(--color-text-muted)]">{c.gender ?? '—'}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold"
                      style={{
                        background: (c._count?.orders ?? 0) > 5 ? 'var(--color-accent-green-soft)' : 'var(--color-primary-soft)',
                        color: (c._count?.orders ?? 0) > 5 ? 'var(--color-accent-green)' : 'var(--color-primary)',
                      }}
                    >
                      {c._count?.orders ?? 0}
                    </span>
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
        <div className="px-6 py-3 border-t border-[var(--color-border)] bg-gray-50/30 flex items-center justify-between">
          <p className="text-xs text-[var(--color-text-muted)]">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchPage(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-md text-xs font-medium border border-[var(--color-border)] bg-white hover:bg-gray-50 disabled:opacity-30 transition-all"
            >
              ← Prev
            </button>
            <button
              onClick={() => fetchPage(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-md text-xs font-medium border border-[var(--color-border)] bg-white hover:bg-gray-50 disabled:opacity-30 transition-all"
            >
              Next →
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl border border-[var(--color-border)] w-full max-w-md overflow-hidden"
            >
              <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between bg-gray-50/50">
                <h3 className="font-semibold text-lg">Upload Data</h3>
                <button onClick={closeUploadModal} className="text-gray-400 hover:text-black">
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-5">
                {!uploadResult ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">What are you uploading?</label>
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
                      <label className="block text-sm font-medium mb-2 text-gray-700">Select CSV File</label>
                      <input
                        type="file"
                        accept=".csv"
                        ref={fileInputRef}
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-md file:border-0
                          file:text-sm file:font-semibold
                          file:bg-indigo-50 file:text-[var(--color-primary)]
                          hover:file:bg-indigo-100 cursor-pointer"
                      />
                    </div>

                    {uploadError && (
                      <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                        {uploadError}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4 space-y-3">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-2xl">✓</div>
                    <h4 className="font-semibold text-lg text-green-700">Upload Successful</h4>
                    <p className="text-sm text-gray-600">
                      Total Rows: {uploadResult.total_rows} <br/>
                      Ingested: <span className="font-semibold text-black">{uploadResult.ingested}</span> <br/>
                      Skipped (Duplicates): {uploadResult.skipped_duplicates} <br/>
                      Skipped (Invalid): {uploadResult.skipped_invalid}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-[var(--color-border)] bg-gray-50 flex justify-end gap-3">
                {uploadResult ? (
                  <button onClick={closeUploadModal} className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-lg hover:bg-gray-300">
                    Done
                  </button>
                ) : (
                  <>
                    <button onClick={closeUploadModal} disabled={uploading} className="px-4 py-2 bg-transparent border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 disabled:opacity-50">
                      Cancel
                    </button>
                    <button 
                      onClick={handleUpload} 
                      disabled={!uploadFile || uploading} 
                      className="px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
                    >
                      {uploading ? 'Uploading...' : 'Upload'}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
