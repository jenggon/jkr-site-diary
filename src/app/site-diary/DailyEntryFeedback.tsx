'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export interface DailyEntryFeedbackProps {
  error: string | null;
  success: string | null;
  savedSiteDiaryId?: string | null;
  isEditMode?: boolean;
  onResetForNewEntry?: () => void;
  onBackToOpenActivities?: () => void;
  className?: string;
  approvalContext?: {
    programmeId: string;
    revisionId: string;
    activityId: string;
    siteDiaryId: string;
    lastModifiedAt: string | null;
  } | null;
  fetchFn?: typeof fetch;
}

export default function DailyEntryFeedback({
  error,
  success,
  savedSiteDiaryId,
  isEditMode = false,
  onResetForNewEntry,
  onBackToOpenActivities,
  className = '',
  approvalContext = null,
  fetchFn,
}: DailyEntryFeedbackProps) {
  const [approvalStatus, setApprovalStatus] = useState<'IDLE' | 'REQUESTING' | 'PENDING'>('IDLE');
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const isRequestingRef = useRef<boolean>(false);

  useEffect(() => {
    setApprovalStatus('IDLE');
    setApprovalError(null);
    isRequestingRef.current = false;
  }, [savedSiteDiaryId]);

  if (!error && !success) return null;

  const hasValidApprovalContext = Boolean(
    !isEditMode &&
    approvalContext &&
    approvalContext.programmeId &&
    approvalContext.revisionId &&
    approvalContext.activityId &&
    approvalContext.siteDiaryId &&
    approvalContext.lastModifiedAt
  );

  const handleRequestApproval = async () => {
    if (isRequestingRef.current) return;
    if (!hasValidApprovalContext || !approvalContext) return;
    const { programmeId, revisionId, activityId, siteDiaryId, lastModifiedAt } = approvalContext;
    if (!programmeId || !revisionId || !activityId || !siteDiaryId || !lastModifiedAt) return;

    isRequestingRef.current = true;
    setApprovalStatus('REQUESTING');
    setApprovalError(null);

    const fetcher = fetchFn || (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);

    try {
      const payload = {
        programme_id: programmeId,
        revision_id: revisionId,
        activity_id: activityId,
        site_diary_id: siteDiaryId,
        expected_site_diary_last_modified_at: lastModifiedAt,
      };

      const res = await fetcher('/api/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status === 201) {
        const json = await res.json();
        const createdApproval = json?.data;
        if (createdApproval?.approval_status === 'Pending') {
          setApprovalStatus('PENDING');
          return;
        }
      }

      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.error || 'Gagal memohon kelulusan');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memohon kelulusan';
      setApprovalError(msg);
      setApprovalStatus('IDLE');
    } finally {
      isRequestingRef.current = false;
    }
  };

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

          {/* Post-Save Actions */}
          {savedSiteDiaryId && (
            <div className="pt-2 border-t border-emerald-800/50 flex flex-wrap items-center gap-2.5">
              <span className="text-[11px] text-emerald-400/80 font-mono">
                ID: {savedSiteDiaryId.slice(0, 8)}...
              </span>

              <div className="flex flex-wrap items-center gap-2 ml-auto">
                {hasValidApprovalContext && (
                  <>
                    {approvalStatus === 'PENDING' ? (
                      <span
                        data-testid="approval-status-pending"
                        className="px-3 py-1.5 rounded-xl bg-amber-950/80 text-amber-300 text-xs font-semibold border border-amber-700/60 shadow-sm flex items-center gap-1.5"
                      >
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" aria-hidden="true"></span>
                        <span>Menunggu Kelulusan</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRequestApproval}
                        disabled={approvalStatus === 'REQUESTING'}
                        data-testid="request-approval-btn"
                        className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors border border-amber-500 shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {approvalStatus === 'REQUESTING' ? (
                          <>
                            <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" aria-hidden="true"></span>
                            <span>Memohon...</span>
                          </>
                        ) : (
                          <span>Mohon Kelulusan</span>
                        )}
                      </button>
                    )}
                  </>
                )}

                <Link
                  href={`/site-diary/print?id=${encodeURIComponent(savedSiteDiaryId)}`}
                  className="px-3 py-1.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 text-xs font-semibold transition-colors border border-emerald-600/50 shadow-sm"
                >
                  Lihat Format JKR (Print)
                </Link>

                {onBackToOpenActivities && !isEditMode && (
                  <button
                    type="button"
                    onClick={onBackToOpenActivities}
                    data-testid="post-save-back-to-open-activities-btn"
                    className="px-3 py-1.5 rounded-xl bg-blue-900/80 hover:bg-blue-800 text-blue-100 text-xs font-semibold transition-colors border border-blue-700/60 shadow-sm"
                  >
                    Aktiviti Terbuka
                  </button>
                )}

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

              {approvalError && (
                <div role="alert" className="w-full text-xs text-red-300 mt-1">
                  {approvalError}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
