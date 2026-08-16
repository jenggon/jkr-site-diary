'use client';

import React from 'react';
import Link from 'next/link';

export interface DailyEntryFeedbackProps {
  error: string | null;
  success: string | null;
  savedSiteDiaryId?: string | null;
  isEditMode?: boolean;
  onResetForNewEntry?: () => void;
  className?: string;
}

export default function DailyEntryFeedback({
  error,
  success,
  savedSiteDiaryId,
  isEditMode = false,
  onResetForNewEntry,
  className = '',
}: DailyEntryFeedbackProps) {
  if (!error && !success) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-2xl border border-red-800/80 bg-red-950/70 p-4 text-xs sm:text-sm text-red-200 shadow-lg flex items-start gap-3"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 text-red-400 shrink-0 mt-0.5"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1 space-y-1">
            <h4 className="font-bold text-red-300">Ralat Semasa Memproses Borang</h4>
            <p className="leading-relaxed text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Success Status */}
      {success && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-emerald-800/80 bg-emerald-950/70 p-4 text-xs sm:text-sm text-emerald-200 shadow-lg space-y-3"
        >
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1 space-y-0.5">
              <h4 className="font-bold text-emerald-300">
                {isEditMode ? 'Kemaskini Berjaya' : 'Simpanan Berjaya'}
              </h4>
              <p className="leading-relaxed text-emerald-200">{success}</p>
            </div>
          </div>

          {/* Post-Save Actions (F2.1 Scope: View Print / Start New) */}
          {savedSiteDiaryId && (
            <div className="pt-2 border-t border-emerald-800/50 flex flex-wrap items-center gap-2.5">
              <span className="text-[11px] text-emerald-400/80 font-mono">
                ID: {savedSiteDiaryId.slice(0, 8)}...
              </span>

              <div className="flex items-center gap-2 ml-auto">
                <Link
                  href={`/site-diary/print?id=${encodeURIComponent(savedSiteDiaryId)}`}
                  className="px-3 py-1.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 text-xs font-semibold transition-colors border border-emerald-600/50 shadow-sm"
                >
                  Lihat Format JKR (Print)
                </Link>

                {onResetForNewEntry && !isEditMode && (
                  <button
                    type="button"
                    onClick={onResetForNewEntry}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors border border-zinc-700 shadow-sm"
                  >
                    + Laporan Baharu
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
