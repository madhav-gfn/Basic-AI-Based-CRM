'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getCustomers, type Customer } from '@/lib/api';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {total.toLocaleString()} customers in the database.
        </p>
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
    </div>
  );
}
