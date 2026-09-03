'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { useAuth } from '@/context/AuthContext';
import { OpenActivityDto } from '@/types/openActivity';
import OpenActivityCard from './OpenActivityCard';

export interface OpenActivitiesListProps {
  programmeId: string | null;
  onSelectActivity: (activityId: string) => void;
  onCreateNewActivity: () => void;
  showCreateNewActivity?: boolean;
  className?: string;
}

export default function OpenActivitiesList({
  programmeId,
  onSelectActivity,
  onCreateNewActivity,
  showCreateNewActivity = true,
  className = '',
}: OpenActivitiesListProps) {
  let session: Session | null = null;
  try {
    const auth = useAuth();
    session = auth?.session ?? null;
  } catch {
    session = null;
  }
  const [activities, setActivities] = useState<OpenActivityDto[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(programmeId));
  const [error, setError] = useState<string | null>(null);

  const activeRequestRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      activeRequestRef.current += 1;
    };
  }, []);

  const loadOpenActivities = useCallback(
    async (pid: string) => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const currentRequestId = ++activeRequestRef.current;

      setLoading(true);
      setError(null);

      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

        const res = await fetch(`/api/activities/open?programmeId=${encodeURIComponent(pid)}`, {
          headers,
          signal: abortController.signal,
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          throw new Error(errJson?.error || 'Gagal memuatkan aktiviti');
        }

        const json = await res.json();
        if (currentRequestId === activeRequestRef.current) {
          const list: OpenActivityDto[] = Array.isArray(json.data) ? json.data : [];
          setActivities(list);
        }
      } catch (err: unknown) {
        if (currentRequestId === activeRequestRef.current) {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          const msg = err instanceof Error ? err.message : 'Ralat memuatkan aktiviti';
          setError(msg);
        }
      } finally {
        if (currentRequestId === activeRequestRef.current) setLoading(false);
      }
    },
    [session?.access_token]
  );

  useEffect(() => {
    if (!programmeId || programmeId.trim() === '') {
      setActivities([]);
      setLoading(false);
      setError(null);
      if (abortControllerRef.current) abortControllerRef.current.abort();
      activeRequestRef.current += 1;
      return;
    }

    loadOpenActivities(programmeId);
  }, [programmeId, loadOpenActivities]);

  if (loading) {
    return (
      <div data-testid="open-activities-loading" role="status" aria-live="polite" className={`w-full ${className}`}>
        <div className="flex min-h-[88px] items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-400 gap-3">
          <svg className="animate-spin h-4 w-4 text-orange-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-xs font-semibold text-zinc-300">Muat</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="open-activities-error" role="alert" className={`w-full ${className}`}>
        <div className="rounded-xl border border-red-800/60 bg-red-950/40 p-4 text-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-xs sm:text-sm font-medium">{error}</span>
          </div>
          {programmeId && (
            <button type="button" onClick={() => loadOpenActivities(programmeId)} data-testid="retry-open-activities-btn" aria-label="Cuba semula muat aktiviti" className="px-4 py-2 rounded-lg border border-red-800 text-white text-xs font-bold shrink-0 min-h-[40px] flex items-center justify-center">
              Ulang
            </button>
          )}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div data-testid="open-activities-empty" className={`w-full rounded-xl border border-zinc-800 bg-zinc-900/70 px-5 py-6 text-center ${className}`}>
        <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/70 text-zinc-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="mt-3 text-sm font-bold text-zinc-100">Tiada aktiviti</h3>
        {showCreateNewActivity && (
          <button type="button" onClick={onCreateNewActivity} data-testid="create-new-activity-empty-btn" aria-label="Catat kerja" className="mt-4 min-h-[40px] rounded-lg border border-orange-700/70 bg-orange-950/20 px-4 text-xs font-bold text-orange-200">
            Catat
          </button>
        )}
      </div>
    );
  }

  return (
    <div data-testid="open-activities-container" className={`w-full space-y-3 ${className}`}>
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="text-xs sm:text-sm font-semibold text-zinc-300">Aktiviti · {activities.length}</div>
        {programmeId && (
          <button type="button" onClick={() => loadOpenActivities(programmeId)} data-testid="refresh-open-activities-btn" aria-label="Muat semula aktiviti" className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80 min-h-[36px]">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            <span>Muat</span>
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3">
        {activities.map((activity) => (
          <OpenActivityCard key={activity.activityId} activity={activity} onContinue={onSelectActivity} />
        ))}
      </div>
    </div>
  );
}
