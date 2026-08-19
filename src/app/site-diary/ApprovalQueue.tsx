'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDailyEntryContext } from './DailyEntryShell';

interface QueueItem {
  approval_id: string;
  site_diary_id: string;
  programme_id: string;
  activity_name: string;
  activity_date: string;
  approval_status: string;
  requested_at: string;
  requester_name: string;
}

interface Props {
  onSelectReview: (siteDiaryId: string, approvalId: string) => void;
}

interface QueueError {
  message: string;
  retryable: boolean;
}

interface QueueRequest {
  generation: number;
  controller: AbortController;
}

export default function ApprovalQueue({ onSelectReview }: Props) {
  const { programmeId } = useDailyEntryContext();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<QueueError | null>(null);
  const generationRef = useRef(0);
  const requestRef = useRef<QueueRequest | null>(null);

  const fetchQueue = useCallback(async () => {
    requestRef.current?.controller.abort();
    const request: QueueRequest = {
      generation: ++generationRef.current,
      controller: new AbortController(),
    };
    requestRef.current = request;
    const ownsRequest = () => requestRef.current === request
      && request.generation === generationRef.current;

    if (!programmeId) {
      if (ownsRequest()) {
        setItems([]);
        setError(null);
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/programme/${encodeURIComponent(programmeId)}/approval-queue`, {
        signal: request.controller.signal,
      });
      if (!ownsRequest()) return;

      if (res.status === 403) {
        setError({
          message: 'Tiada akses (Unauthorized). Anda tidak mempunyai kebenaran untuk melihat baris gilir.',
          retryable: false,
        });
        return;
      }

      if (!res.ok) throw new Error('Gagal mendapatkan senarai kelulusan');

      const data = await res.json();
      if (ownsRequest()) setItems(data.data || []);
    } catch (err: unknown) {
      if (ownsRequest() && err instanceof Error && err.name !== 'AbortError') {
        setError({ message: err.message, retryable: true });
      }
    } finally {
      if (ownsRequest()) setLoading(false);
    }
  }, [programmeId]);

  useEffect(() => {
    void fetchQueue();
    const request = requestRef.current;

    return () => {
      request?.controller.abort();
      if (requestRef.current === request) {
        requestRef.current = null;
        generationRef.current += 1;
      }
    };
  }, [fetchQueue]);

  if (loading) return <div className="p-4 text-zinc-400">Memuatkan...</div>;
  if (error) return (
    <div className="p-4 text-red-400">
      <p>{error.message}</p>
      {error.retryable && (
        <button
          type="button"
          onClick={() => void fetchQueue()}
          className="mt-3 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-bold text-white hover:bg-zinc-700"
        >
          Cuba Semula
        </button>
      )}
    </div>
  );

  const pendingItems = items.filter((i) => i.approval_status === 'Pending');

  if (pendingItems.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-400">
        <p>Tiada kelulusan yang memerlukan perhatian anda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pendingItems.map((item) => (
        <div
          key={item.approval_id}
          className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700"
        >
          <div>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-100">{item.activity_name}</p>
                <p className="text-xs text-zinc-400">Tarikh: {item.activity_date}</p>
              </div>
              <span className="rounded bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-500">
                Menunggu (Pending)
              </span>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Oleh: {item.requester_name || 'Tidak diketahui'} pada {new Date(item.requested_at).toLocaleString('ms-MY')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelectReview(item.site_diary_id, item.approval_id)}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-500"
          >
            Semak (Review)
          </button>
        </div>
      ))}
    </div>
  );
}
