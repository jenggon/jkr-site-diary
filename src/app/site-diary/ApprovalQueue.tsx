'use client';

import React, { useEffect, useState } from 'react';
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

export default function ApprovalQueue({ onSelectReview }: Props) {
  const { programmeId } = useDailyEntryContext();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let controller = new AbortController();

    const fetchQueue = async () => {
      if (!programmeId) {
        setItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/programme/${programmeId}/approval-queue`, {
          signal: controller.signal,
        });

        if (res.status === 403) {
          setError('Tiada akses (Unauthorized). Anda tidak mempunyai kebenaran untuk melihat baris gilir.');
          setLoading(false);
          return;
        }

        if (!res.ok) {
          throw new Error('Gagal mendapatkan senarai kelulusan');
        }

        const data = await res.json();
        setItems(data.data || []);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchQueue();

    return () => {
      controller.abort();
    };
  }, [programmeId]);

  if (loading) return <div className="p-4 text-zinc-400">Memuatkan...</div>;
  if (error) return <div className="p-4 text-red-400">{error}</div>;

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
