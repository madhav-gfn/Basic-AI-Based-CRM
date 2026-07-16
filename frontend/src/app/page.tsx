'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

const FEATURES = [
  { icon: '⚡', text: 'Omnichannel Campaigns' },
  { icon: '🧠', text: 'AI-Powered Segmentation' },
  { icon: '📊', text: 'Real-time Analytics' },
  { icon: '📄', text: 'AI CSV Importer' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 overflow-hidden relative">
      {/* Decorative background shapes */}
      <div
        className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-40"
        style={{ background: 'var(--color-primary-soft)' }}
      />
      <div
        className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] rounded-full mix-blend-multiply filter blur-3xl opacity-25"
        style={{ background: 'var(--color-accent-amber-soft)' }}
      />

      <div className="z-10 max-w-4xl mx-auto text-center">
        {/* Logo */}
        <motion.div
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex justify-center mb-8"
        >
          <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-2xl shadow-lg overflow-hidden bg-[var(--color-card)] p-2 border border-[var(--color-border)]">
            <Image
              src="/main_logo.png"
              alt="Moda CRM Logo"
              fill
              sizes="(max-width: 768px) 112px, 144px"
              className="object-contain p-2"
              priority
            />
          </div>
        </motion.div>

        {/* Hero Copy */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
        >
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-5" style={{ color: 'var(--color-text)' }}>
            Moda CRM
          </h1>
          <p className="text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed mb-10" style={{ color: 'var(--color-text-muted)' }}>
            AI-native D2C intelligence for reaching and engaging your shoppers across WhatsApp, SMS, Email, and RCS.
          </p>
        </motion.div>

        {/* Feature Pills */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          {FEATURES.map((feature) => (
            <div
              key={feature.text}
              className="px-4 py-2 rounded-full border border-[var(--color-border)] bg-[var(--color-card)]/70 backdrop-blur-sm shadow-sm flex items-center gap-2"
              style={{ color: 'var(--color-text)' }}
            >
              <span className="text-base">{feature.icon}</span>
              <span className="text-sm font-semibold tracking-wide">{feature.text}</span>
            </div>
          ))}
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.45, ease: 'easeOut' }}
        >
          <Link href="/dashboard">
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
              className="px-8 py-4 rounded-xl text-lg font-bold text-white shadow-lg transition-shadow hover:shadow-xl flex items-center gap-3 mx-auto"
              style={{ background: 'var(--color-primary)', boxShadow: '0 8px 24px rgba(176, 186, 153, 0.35)' }}
            >
              Proceed
              <span className="text-xl leading-none">→</span>
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
