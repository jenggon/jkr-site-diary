'use client';

import React, { useEffect, useState, useRef } from 'react';
import DiaryHistoryTimeline from './DiaryHistoryTimeline';
import { SiteDiary } from '@/types/siteDiary';

interface ApprovalReviewProps {
  siteDiaryId: string;
  approvalId: string;
  onBack: () => void;
  onSuccess: () => void;
}

export default function ApprovalReview({ siteDiaryId, approvalId, onBack, onSuccess }: ApprovalReviewProps) {
  const [detail, setDetail] = useState<SiteDiary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState('');
  
  const abortRef = useRef<AbortController | null>(null);

  const fetchDetail = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setActionError(null);

    try {
      const res = await fetch(`/api/site-diary/${encodeURIComponent(siteDiaryId)}`, {
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 404) throw new Error('Rekod Site Diary tidak ditemui.');
        throw new Error('Gagal memuatkan butiran rekod.');
      }

      const json = await res.json();
      setDetail(json.data);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    return () => abortRef.current?.abort();
  }, [siteDiaryId]);

  const handleDecision = async (status: 'Approved' | 'Returned' | 'Rejected') => {
    if (!detail) return;
    if (submitting) return;

    setSubmitting(true);
    setActionError(null);

    try {
      const expectedToken = detail.updated_at || detail.submitted_at;
      const res = await fetch(`/api/approval/${encodeURIComponent(approvalId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approval_status: status,
          approval_comment: comment || null,
          expected_site_diary_last_modified_at: expectedToken,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        if (res.status === 409) {
          throw new Error(errorData?.error || 'Konflik keadaan/Ralat Rangkaian. Sila semak semula data.');
        } else if (res.status === 403) {
          throw new Error('Tiada kebenaran (Unauthorized) untuk tindakan ini.');
        } else if (res.status === 404) {
          throw new Error('Rekod kelulusan tidak ditemui.');
        }
        throw new Error(errorData?.error || 'Tindakan gagal. Sila cuba lagi.');
      }

      onSuccess();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message);
        if (err.message.includes('Konflik')) {
          // Refresh detail on conflict to show the latest canonical state
          fetchDetail();
        }
      } else {
        setActionError('Tindakan gagal');
      }
    } finally {
      setSubmitting(false);
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
  if (!detail) return null;

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
            disabled={submitting}
            placeholder="Sebab pemulangan / penolakan..."
            className="block w-full rounded-xl border border-blue-800 bg-blue-950/50 px-3 py-2 text-sm text-zinc-100 placeholder-blue-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleDecision('Approved')}
            className="rounded-xl bg-green-600 px-4 py-3 font-bold text-white transition hover:bg-green-500 disabled:opacity-50"
          >
            Luluskan (Approve)
          </button>
          <button
            type="button"
            disabled={submitting || !comment.trim()}
            onClick={() => handleDecision('Returned')}
            title={!comment.trim() ? "Sila masukkan ulasan untuk memulangkan rekod" : ""}
            className="rounded-xl bg-yellow-600 px-4 py-3 font-bold text-white transition hover:bg-yellow-500 disabled:opacity-50"
          >
            Pulangkan (Return)
          </button>
          <button
            type="button"
            disabled={submitting || !comment.trim()}
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
