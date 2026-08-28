'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import DiaryHistoryTimeline from './DiaryHistoryTimeline';
import { SiteDiary } from '@/types/siteDiary';
import { Approval, ApprovalStatus } from '@/types/approval';

interface ApprovalReviewProps {
  siteDiaryId: string;
  approvalId: string;
  onBack: () => void;
  onSuccess: () => void;
}

interface DecisionRequest {
  generation: number;
  controller: AbortController;
  contextKey: string;
}

export default function ApprovalReview({ siteDiaryId, approvalId, onBack, onSuccess }: ApprovalReviewProps) {
  const [detail, setDetail] = useState<SiteDiary | null>(null);
  const [reviewApproval, setReviewApproval] = useState<Approval | null>(null);
  const [terminalApproval, setTerminalApproval] = useState<Approval | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState('');
  
  const abortRef = useRef<AbortController | null>(null);
  const decisionGenerationRef = useRef(0);
  const decisionRef = useRef<DecisionRequest | null>(null);

  const fetchDetail = useCallback(async (preserveActionError = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    if (!preserveActionError) setActionError(null);
    setDetail(null);
    setReviewApproval(null);
    setTerminalApproval(null);

    try {
      const [diaryResponse, approvalResponse] = await Promise.all([
        fetch(`/api/site-diary/${encodeURIComponent(siteDiaryId)}`, {
          signal: controller.signal,
        }),
        fetch(`/api/approval/${encodeURIComponent(approvalId)}/review`, {
          signal: controller.signal,
        }),
      ]);

      if (!diaryResponse.ok) {
        if (diaryResponse.status === 404) throw new Error('Rekod Site Diary tidak ditemui.');
        throw new Error('Gagal memuatkan butiran rekod.');
      }
      if (!approvalResponse.ok) {
        if (approvalResponse.status === 404) throw new Error('Rekod kelulusan tidak ditemui.');
        throw new Error('Gagal memuatkan rekod kelulusan.');
      }

      const [diaryJson, approvalJson] = await Promise.all([
        diaryResponse.json(),
        approvalResponse.json(),
      ]);
      const diary = diaryJson.data as SiteDiary;
      const approval = approvalJson.data as Approval;

      if (
        diary?.site_diary_id !== siteDiaryId
        || approval?.approval_id !== approvalId
        || approval?.site_diary_id !== siteDiaryId
        || approval?.programme_id !== diary?.programme_id
        || approval?.revision_id !== diary?.revision_id
        || approval?.activity_id !== diary?.activity_id
      ) {
        throw new Error('Konteks rekod kelulusan tidak sepadan. Muat semula baris gilir.');
      }
      if (approval.approval_status !== ApprovalStatus.Pending) {
        throw new Error('Rekod kelulusan ini tidak lagi menunggu semakan.');
      }

      if (abortRef.current !== controller) return;
      setDetail(diary);
      setReviewApproval(approval);
    } catch (err: unknown) {
      if (
        abortRef.current === controller
        && err instanceof Error
        && err.name !== 'AbortError'
      ) {
        setError(err.message);
      }
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
      }
    }
  }, [approvalId, siteDiaryId]);

  useEffect(() => {
    void fetchDetail();
    const controller = abortRef.current;
    return () => {
      controller?.abort();
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    };
  }, [fetchDetail]);

  useEffect(() => {
    decisionRef.current?.controller.abort();
    decisionRef.current = null;
    decisionGenerationRef.current += 1;
    setSubmitting(false);
    setTerminalApproval(null);
    return () => {
      decisionRef.current?.controller.abort();
      decisionRef.current = null;
      decisionGenerationRef.current += 1;
    };
  }, [approvalId, siteDiaryId]);

  const handleDecision = async (status: 'Approved' | 'Returned' | 'Rejected') => {
    if (!detail || !reviewApproval) return;
    if (
      reviewApproval.approval_id !== approvalId
      || reviewApproval.site_diary_id !== siteDiaryId
      || reviewApproval.programme_id !== detail.programme_id
      || reviewApproval.revision_id !== detail.revision_id
      || reviewApproval.activity_id !== detail.activity_id
      || reviewApproval.approval_status !== ApprovalStatus.Pending
    ) return;
    if (decisionRef.current) return;

    const request: DecisionRequest = {
      generation: ++decisionGenerationRef.current,
      controller: new AbortController(),
      contextKey: `${approvalId}:${siteDiaryId}`,
    };
    decisionRef.current = request;
    const ownsRequest = () => decisionRef.current === request
      && request.generation === decisionGenerationRef.current
      && request.contextKey === `${approvalId}:${siteDiaryId}`;
    setSubmitting(true);
    setActionError(null);

    try {
      const expectedToken = detail.updated_at || detail.submitted_at;
      const res = await fetch(`/api/approval/${encodeURIComponent(approvalId)}`, {
        method: 'PATCH',
        signal: request.controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approval_status: status,
          approval_comment: comment || null,
          expected_site_diary_last_modified_at: expectedToken,
        }),
      });
      if (!ownsRequest()) return;

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        if (res.status === 409) {
          setActionError(errorData?.error || 'Rekod telah berubah. Data terkini sedang dimuatkan.');
          await fetchDetail(true);
          return;
        } else if (res.status === 403) {
          throw new Error('Tiada kebenaran (Unauthorized) untuk tindakan ini.');
        } else if (res.status === 404) {
          throw new Error('Rekod kelulusan tidak ditemui.');
        }
        throw new Error(errorData?.error || 'Tindakan gagal. Sila cuba lagi.');
      }

      const resJson = await res.json().catch(() => null);
      const updatedApproval = resJson?.data as Approval | undefined;

      if (status === 'Approved' && updatedApproval) {
        setTerminalApproval(updatedApproval);
      } else {
        if (ownsRequest()) onSuccess();
      }
    } catch (err: unknown) {
      if (ownsRequest() && err instanceof Error && err.name !== 'AbortError') {
        setActionError(err.message);
      } else if (ownsRequest() && !(err instanceof Error)) {
        setActionError('Tindakan gagal');
      }
    } finally {
      if (ownsRequest()) {
        decisionRef.current = null;
        setSubmitting(false);
      }
    }
  };

  if (loading) return <div className="p-4 text-zinc-400">Memuatkan butiran rekod...</div>;
  if (error) return (
    <div className="p-4 text-red-400">
      <p>{error}</p>
      <button onClick={onBack} className="mt-4 rounded bg-zinc-800 px-4 py-2 font-bold text-white hover:bg-zinc-700">
        Kembali
      </button>
    </div>
  );

  if (terminalApproval) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Status Kelulusan</h2>
        </div>

        <div className="rounded-2xl border border-emerald-800/80 bg-emerald-950/70 p-6 text-emerald-200 shadow-lg space-y-4">
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5"
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
            <div className="flex-1 space-y-1">
              <h3 className="text-lg font-bold text-emerald-300">
                Rekod Berjaya Diluluskan (Approved)
              </h3>
              <p className="text-sm text-emerald-200">
                Buku Harian Tapak telah disahkan dan status kelulusan dikemaskini.
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-3 border-t border-emerald-800/50 text-xs sm:text-sm">
            <div>
              <dt className="text-emerald-400/80 font-medium">Status Kelulusan</dt>
              <dd className="mt-1 font-bold text-emerald-100" data-testid="terminal-approval-status">
                {terminalApproval.approval_status} (Diluluskan)
              </dd>
            </div>
            <div>
              <dt className="text-emerald-400/80 font-medium">ID Buku Harian (Site Diary ID)</dt>
              <dd className="mt-1 font-mono text-emerald-100 font-semibold" data-testid="terminal-site-diary-id">
                {terminalApproval.site_diary_id}
              </dd>
            </div>
            <div>
              <dt className="text-emerald-400/80 font-medium">Diluluskan Oleh (Approved By)</dt>
              <dd className="mt-1 text-emerald-100 font-semibold" data-testid="terminal-approved-by">
                {terminalApproval.approved_by || 'Pegawai Pengesah'}
              </dd>
            </div>
            <div>
              <dt className="text-emerald-400/80 font-medium">Tarikh & Masa Kelulusan</dt>
              <dd className="mt-1 text-emerald-100">
                {terminalApproval.approval_date || terminalApproval.updated_at || '-'}
              </dd>
            </div>
            {terminalApproval.approval_comment && (
              <div className="sm:col-span-2">
                <dt className="text-emerald-400/80 font-medium">Ulasan Kelulusan</dt>
                <dd className="mt-1 whitespace-pre-wrap text-emerald-100" data-testid="terminal-approval-comment">
                  {terminalApproval.approval_comment}
                </dd>
              </div>
            )}
          </dl>

          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={onSuccess}
              data-testid="terminal-back-btn"
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm shadow-md transition-colors"
            >
              Kembali ke Kelulusan
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!detail) return null;

  const canDecide = reviewApproval?.approval_id === approvalId
    && reviewApproval.site_diary_id === siteDiaryId
    && reviewApproval.programme_id === detail.programme_id
    && reviewApproval.revision_id === detail.revision_id
    && reviewApproval.activity_id === detail.activity_id
    && reviewApproval.approval_status === ApprovalStatus.Pending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Semakan Kelulusan</h2>
        <button onClick={onBack} className="rounded px-4 py-2 text-sm font-bold text-zinc-400 hover:text-white">
          Batal
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="mb-4 text-lg font-bold text-white">Butiran Aktiviti</h3>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold text-zinc-500">Tarikh Aktiviti</dt>
            <dd className="mt-1 text-sm text-zinc-100">{detail.activity_date}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-zinc-500">Cuaca</dt>
            <dd className="mt-1 text-sm text-zinc-100">{detail.weather || 'Tidak dinyatakan'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold text-zinc-500">Nota / Laporan</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-zinc-100">{detail.notes || 'Tiada nota'}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="mb-4 text-lg font-bold text-white">Tenaga Kerja (Workforce)</h3>
        {detail.manpower && detail.manpower.length > 0 ? (
          <ul className="space-y-3">
            {detail.manpower.map((m, i) => (
              <li key={i} className="flex justify-between border-b border-zinc-800 pb-2 last:border-0 last:pb-0">
                <span className="text-sm font-medium text-zinc-100">{m.trade_name}</span>
                <span className="text-sm text-zinc-400">
                  {m.bumi_count + m.non_bumi_count + m.foreign_count} Pekerja
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">Tiada tenaga kerja direkodkan.</p>
        )}
      </div>

      <DiaryHistoryTimeline siteDiaryId={siteDiaryId} />

      <div className="rounded-2xl border border-blue-900/50 bg-blue-950/20 p-6">
        <h3 className="mb-4 text-lg font-bold text-blue-100">Tindakan Kelulusan</h3>
        
        {actionError && (
          <div className="mb-4 rounded-xl border border-red-800 bg-red-950/30 p-3 text-sm text-red-200">
            {actionError}
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="approvalComment" className="mb-2 block text-sm font-medium text-blue-200">
            Ulasan (Pilihan)
          </label>
          <textarea
            id="approvalComment"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={submitting || !canDecide}
            placeholder="Sebab pemulangan / penolakan..."
            className="block w-full rounded-xl border border-blue-800 bg-blue-950/50 px-3 py-2 text-sm text-zinc-100 placeholder-blue-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            disabled={submitting || !canDecide}
            onClick={() => handleDecision('Approved')}
            className="rounded-xl bg-green-600 px-4 py-3 font-bold text-white transition hover:bg-green-500 disabled:opacity-50"
          >
            Luluskan (Approve)
          </button>
          <button
            type="button"
            disabled={submitting || !canDecide || !comment.trim()}
            onClick={() => handleDecision('Returned')}
            title={!comment.trim() ? "Sila masukkan ulasan untuk memulangkan rekod" : ""}
            className="rounded-xl bg-yellow-600 px-4 py-3 font-bold text-white transition hover:bg-yellow-500 disabled:opacity-50"
          >
            Pulangkan (Return)
          </button>
          <button
            type="button"
            disabled={submitting || !canDecide || !comment.trim()}
            onClick={() => handleDecision('Rejected')}
            title={!comment.trim() ? "Sila masukkan ulasan untuk menolak rekod" : ""}
            className="rounded-xl bg-red-600 px-4 py-3 font-bold text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            Tolak (Reject)
          </button>
        </div>
      </div>
    </div>
  );
}
