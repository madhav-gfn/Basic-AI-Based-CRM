'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { draftCampaign, DraftCampaignPayload, DraftCampaignResponse } from '../../../lib/api';

export default function NewCampaignPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [objective, setObjective] = useState('Re-engagement');
  const [prompt, setPrompt] = useState('');

  const [loading, setLoading] = useState(false);
  const [draftResult, setDraftResult] = useState<DraftCampaignResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!name || !prompt) {
      setError("Please provide a name and AI prompt.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Assuming audience generation happens in backend or combined in draft flow
      // For this UI, we send the draft prompt. Let's adapt the API call
      // using our draftCampaign endpoint. (Assuming backend handles AI text parsing)
      const payload: DraftCampaignPayload = {
        name,
        objective,
        audienceId: prompt // Just passing prompt as audienceId to mock or if backend uses it
      };

      const response = await draftCampaign(payload);
      if (response.success) {
        setDraftResult(response);
      } else {
        setError('Failed to generate draft.');
      }
    } catch (err) {
      setError('An error occurred during AI generation.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = () => {
    if (draftResult) {
      // In a real app we'd call executeCampaign
      router.push(`/campaigns/${draftResult.campaignId}`);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Campaign Copilot</h1>
          <p className="text-gray-500 mt-2">AI-assisted messaging creation for targeted D2C outreach.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel: The Copilot Input */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-[600px]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-indigo-600">✦</span> Campaign Strategy
              </h2>
              <span className="bg-white px-2 py-0.5 rounded text-[10px] font-bold text-gray-500 border border-gray-200 uppercase">Draft Mode</span>
            </div>

            <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Campaign Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-3 py-2 outline-none"
                    placeholder="Winter Win-back '24"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Objective</label>
                  <select
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    className="bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-3 py-2 outline-none"
                  >
                    <option>Re-engagement</option>
                    <option>Promotional Broadcast</option>
                    <option>Cart Abandonment</option>
                    <option>Post-Purchase Upsell</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2 flex-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">AI Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="flex-1 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 p-4 resize-none outline-none"
                  placeholder="Describe your audience and goal (e.g., 'Write a win-back campaign for high-spenders who haven't bought winter wear in 90 days')."
                />
              </div>

              {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white text-sm font-medium py-2 px-6 rounded-md shadow-sm transition-colors flex items-center gap-2"
              >
                {loading ? 'Thinking...' : 'Generate with AI'}
              </button>
            </div>
          </div>

          {/* Right Panel: The Preview & Review */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-[600px] relative overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-sm font-semibold text-gray-900">Live Preview</h2>
            </div>

            <div className="flex-1 bg-gray-100/50 p-6 flex items-center justify-center relative">
              <AnimatePresence mode="wait">
                {loading && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-sm font-medium text-gray-500 animate-pulse">Drafting campaign via Gemini API...</p>
                  </motion.div>
                )}

                {!loading && draftResult && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden flex flex-col"
                  >
                    <div className="bg-indigo-600 text-white p-4">
                      <div className="text-xs font-medium uppercase tracking-wider mb-1 opacity-80">Suggested Channel</div>
                      <div className="text-lg font-bold">{draftResult.draft.channel}</div>
                    </div>
                    <div className="p-6">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {draftResult.draft.message}
                      </p>
                    </div>
                  </motion.div>
                )}

                {!loading && !draftResult && (
                  <motion.div
                    key="empty"
                    className="text-sm text-gray-400 font-medium text-center px-8"
                  >
                    Fill in your prompt and click Generate to see the AI draft.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {draftResult && !loading && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center"
              >
                <button className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">
                  Regenerate
                </button>
                <button
                  onClick={handleExecute}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-6 rounded-md shadow-sm transition-colors"
                >
                  Schedule & Execute
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
