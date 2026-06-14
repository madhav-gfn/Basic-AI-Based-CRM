'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 overflow-hidden relative">
      {/* Decorative background shapes */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.5, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl"
        style={{ background: 'var(--color-primary-soft)' }}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.3, scale: 1 }}
        transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }}
        className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] rounded-full mix-blend-multiply filter blur-3xl"
        style={{ background: 'var(--color-accent-amber-soft)' }}
      />

      <div className="z-10 max-w-4xl mx-auto text-center">
        {/* Animated Logo */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
          className="flex justify-center mb-8"
        >
          <div className="relative w-32 h-32 md:w-48 md:h-48 rounded-2xl shadow-xl overflow-hidden bg-white p-2">
            <Image 
              src="/main_logo.png" 
              alt="Moda CRM Logo" 
              fill
              sizes="(max-width: 768px) 128px, 192px"
              className="object-contain p-2"
              priority
            />
          </div>
        </motion.div>

        {/* Hero Copy */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6" style={{ color: 'var(--color-text)' }}>
            Moda CRM
          </h1>
          <p className="text-xl md:text-2xl font-medium max-w-2xl mx-auto leading-relaxed mb-10" style={{ color: 'var(--color-text-muted)' }}>
            AI-Native D2C Intelligence platform for reaching and engaging your shoppers across WhatsApp, SMS, Email, and RCS.
          </p>
        </motion.div>

        {/* Feature Pills */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-wrap justify-center gap-4 mb-12"
        >
          {[
            { icon: "⚡", text: "Omnichannel Campaigns" },
            { icon: "🧠", text: "AI-Powered Segmentation" },
            { icon: "📊", text: "Real-time Analytics" }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              whileHover={{ scale: 1.05, y: -2 }}
              className="px-5 py-2.5 rounded-full border border-[var(--color-border)] bg-white/50 backdrop-blur-sm shadow-sm flex items-center gap-2"
              style={{ color: 'var(--color-text)' }}
            >
              <span className="text-lg">{feature.icon}</span>
              <span className="text-sm font-bold tracking-wide">{feature.text}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <Link href="/dashboard">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 rounded-xl text-lg font-bold text-white shadow-lg shadow-[var(--color-primary-soft)] transition-all flex items-center gap-3 mx-auto"
              style={{ background: 'var(--color-primary)' }}
            >
              Go to Dashboard
              <span className="text-xl leading-none">→</span>
            </motion.button>
          </Link>
        </motion.div>
      </div>

      {/* Footer attribution */}
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 text-xs font-semibold tracking-widest uppercase"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Xeno Engineering Assignment • 2026
      </motion.p>
    </div>
  );
}
