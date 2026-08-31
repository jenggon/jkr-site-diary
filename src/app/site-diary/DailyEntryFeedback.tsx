'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import NgamsoiCompletionRitual from '@/components/brand/NgamsoiCompletionRitual';

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
  const [approvalId, setApprovalId] = useState<string | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const isRequestingRef = useRef<boolean>(false);

  useEffect(() => {
    setApprovalStatus('IDLE');
    setApprovalError(null);
    setApprovalId(null);
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
        const json = await res.json().catch(() => null);
        const createdApproval = json?.data;
        if (
          createdApproval &&
          typeof createdApproval.approval_id === 'string' &&
          createdApproval.approval_id.trim() !== '' &&
          createdApproval.approval_status === 'Pending' &&
          createdApproval.site_diary_id === siteDiaryId
        ) {
          setApprovalId(createdApproval.approval_id);
          setApprovalStatus('PENDING');
          return;
        }

        setApprovalError('Gagal memohon kelulusan. Sila cuba lagi.');
        setApprovalStatus('IDLE');
        return;
      }

      if (res.status === 401) {
        setApprovalError('Sesi telah tamat. Sila log masuk semula.');
        setApprovalStatus('IDLE');
        return;
      }

      if (res.status === 403) {
        setApprovalError('Tiada kebenaran untuk memohon kelulusan.');
        setApprovalStatus('IDLE');
        return;
      }

      if (res.status === 409) {
        setApprovalError('Rekod telah berubah. Muat semula sebelum memohon kelulusan.');
        setApprovalStatus('IDLE');
        return;
      }

      setApprovalError('Gagal memohon kelulusan. Sila cuba lagi.');
      setApprovalStatus('IDLE');
    } catch {
      setApprovalError('Gagal memohon kelulusan. Sila cuba lagi.');
      setApprovalStatus('IDLE');
    } finally {
      isRequestingRef.current = false;
    }
  };

  return (
    <div className={`${className}`}>
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="border-y border-red-800/70 bg-red-950/45 px-4 py-3 text-xs sm:text-sm text-red-200"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-red-400" aria-hidden="true">!</span>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-red-300">Ralat</h4>
              <p className="mt-1 leading-relaxed text-red-200">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div data-testid="post-save-feedback">
          <NgamsoiCompletionRitual
            savedSiteDiaryId={savedSiteDiaryId}
            isEditMode={isEditMode}
            successText={success}
          />

          {savedSiteDiaryId && (
            <>
              <div className="ng-completion-actions" aria-label="Tindakan selepas simpan">
                {hasValidApprovalContext && (
                  approvalStatus === 'PENDING' ? (
                    <span
                      data-testid="approval-status-pending"
                      data-approval-id={approvalId ?? undefined}
                      className="ng-completion-action ng-completion-action--pending"
                      aria-label="Menunggu kelulusan"
                    >
                      <span className="sr-only">Menunggu Kelulusan</span>
                      <span aria-hidden="true">Menunggu</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestApproval}
                      disabled={approvalStatus === 'REQUESTING'}
                      data-testid="request-approval-btn"
                      className="ng-completion-action ng-completion-action--primary"
                      aria-label="Mohon kelulusan"
                    >
                      <span className="sr-only">
                        {approvalStatus === 'REQUESTING' ? 'Memohon...' : 'Mohon Kelulusan'}
                      </span>
                      <span aria-hidden="true">{approvalStatus === 'REQUESTING' ? 'Mohon…' : 'Mohon'}</span>
                    </button>
                  )
                )}

                <Link
                  href={`/site-diary/print?id=${encodeURIComponent(savedSiteDiaryId)}`}
                  className="ng-completion-action"
                  aria-label="Lihat format JKR"
                >
                  <span className="sr-only">Lihat Format JKR (Print)</span>
                  <span aria-hidden="true">Cetak</span>
                </Link>

                {onBackToOpenActivities && !isEditMode && (
                  <button
                    type="button"
                    onClick={onBackToOpenActivities}
                    data-testid="post-save-back-to-open-activities-btn"
                    className="ng-completion-action"
                    aria-label="Aktiviti terbuka"
                  >
                    <span className="sr-only">Aktiviti Terbuka</span>
                    <span aria-hidden="true">Aktiviti</span>
                  </button>
                )}

                {onResetForNewEntry && !isEditMode && (
                  <button
                    type="button"
                    onClick={onResetForNewEntry}
                    className="ng-completion-action"
                    aria-label="Laporan baharu"
                  >
                    <span className="sr-only">+ Laporan Baharu</span>
                    <span aria-hidden="true">Baharu</span>
                  </button>
                )}
              </div>

              {approvalError && (
                <div role="alert" className="ng-completion-approval-error">
                  {approvalError}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
