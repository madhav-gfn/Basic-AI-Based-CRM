'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/app/components/ui';

const INPUT_CLASS =
  'bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg text-sm px-3 py-2.5 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary-soft)] transition-all';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [organizationName, setOrganizationName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await register({ organizationName, name, email, password });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-[var(--color-card)] p-1.5 border border-[var(--color-border)] mb-4">
            <Image src="/main_logo.png" alt="Saucer AI" fill sizes="64px" className="object-contain p-1.5" priority />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Create your organization</h1>
          <p className="text-sm mt-1 text-center" style={{ color: 'var(--color-text-muted)' }}>
            You'll be the admin of a new, isolated workspace.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Organization Name</label>
            <input
              type="text"
              required
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              className={INPUT_CLASS}
              placeholder="Acme D2C"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Your Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={INPUT_CLASS}
              placeholder="Jane Doe"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT_CLASS}
              placeholder="you@company.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={INPUT_CLASS}
              placeholder="At least 8 characters"
            />
          </div>

          {error && (
            <p className="text-xs font-medium" style={{ color: 'var(--color-accent-rose)' }}>{error}</p>
          )}

          <Button type="submit" className="w-full" loading={loading} disabled={loading}>
            Create Account
          </Button>
        </form>

        <p className="text-sm text-center mt-6" style={{ color: 'var(--color-text-muted)' }}>
          Already have an account?{' '}
          <Link href="/login" className="font-medium" style={{ color: 'var(--color-primary)' }}>
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
