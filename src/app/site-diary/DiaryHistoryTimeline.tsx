'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SiteDiaryHistoryEvent } from '@/types/siteDiaryHistory';

const SESSION_MESSAGE = 'Sesi telah tamat. Sila log masuk semula.';

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Masa tidak tersedia';
  return new Intl.DateTimeFormat('ms-MY', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function DiaryHistoryTimeline({ siteDiaryId }: { siteDiaryId: string }) {
  const [events, setEvents] = useState<SiteDiaryHistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const generation = ++generationRef.current;
    setLoading(true);
    setError(null);
    setEvents([]);
    try {
      const response = await fetch(`/api/site-diary/${encodeURIComponent(siteDiaryId)}/history`, { signal: controller.signal });
      if (generation !== generationRef.current) return;
      if (response.status === 401) throw new Error(SESSION_MESSAGE);
      if (!response.ok) {
        const json = await response.json().catch(() => null);
        throw new Error(json?.error || 'Gagal memuatkan sejarah perubahan.');
      }
      const json = await response.json();
      if (generation === generationRef.current) setEvents(Array.isArray(json?.data?.events) ? json.data.events : []);
    } catch (reason: unknown) {
      if (generation !== generationRef.current || controller.signal.aborted) return;
      setError(reason instanceof Error ? reason.message : 'Gagal memuatkan sejarah perubahan.');
    } finally {
      if (generation === generationRef.current) setLoading(false);
    }
  }, [siteDiaryId]);

  useEffect(() => {
    void load();
    return () => { abortRef.current?.abort(); ++generationRef.current; };
  }, [load]);

  return <section aria-labelledby="site-diary-history-heading" className="border-t border-zinc-800 pt-4">
    <h3 id="site-diary-history-heading" className="font-bold">Sejarah Perubahan</h3>
    {loading && <p role="status" className="mt-2 text-sm text-zinc-400">Memuatkan sejarah perubahan...</p>}
    {error && <div role="alert" className="mt-2 rounded-xl border border-red-800 bg-red-950/30 p-3 text-sm text-red-200"><p>{error}</p><button type="button" onClick={load} className="mt-2 min-h-[44px] font-bold underline">Cuba Semula Sejarah</button></div>}
    {!loading && !error && events.length === 0 && <p className="mt-2 text-sm text-zinc-400">Tiada sejarah perubahan.</p>}
    {!loading && !error && events.length > 0 && <ol className="mt-3 space-y-3">{[...events].reverse().map((event) => <li key={event.logId} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex items-start justify-between gap-2"><strong className="text-sm">{event.eventType === 'NEW' ? 'Rekod Baharu' : event.eventType === 'UPDATE' ? 'Rekod Dikemaskini' : 'Peristiwa Rekod'}</strong><time className="text-xs text-zinc-500">{formatTimestamp(event.loggedAt)}</time></div>
      <p className="mt-1 text-xs text-zinc-500">{event.actorLabel}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-300">{event.changes.length === 0
        ? <li>Tiada perubahan bermakna dikenal pasti.</li>
        : event.changes.map((change, index) => <li key={`${change.field}-${index}`}>{change.description}</li>)}</ul>
    </li>)}</ol>}
  </section>;
}
