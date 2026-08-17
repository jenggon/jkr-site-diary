'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { useAuth } from '@/context/AuthContext';
import { OpenActivityDto } from '@/types/openActivity';
import OpenActivityCard from './OpenActivityCard';

export interface OpenActivitiesListProps {
  programmeId: string | null;
  onSelectActivity: (activityId: string) => void;
  onCreateNewActivity: () => void;
  className?: string;
}

export default function OpenActivitiesList({
  programmeId,
  onSelectActivity,
  onCreateNewActivity,
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

  const loadOpenActivities = useCallback(
    async (pid: string) => {
      setLoading(true);
      setError(null);

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const res = await fetch(`/api/activities/open?programmeId=${encodeURIComponent(pid)}`, {
          headers,
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          throw new Error(errJson?.error || 'Gagal memuatkan senarai aktiviti terbuka');
        }

        const json = await res.json();
        const list: OpenActivityDto[] = Array.isArray(json.data) ? json.data : [];
        setActivities(list);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Ralat ketika memuatkan aktiviti';
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [session?.access_token]
  );

  useEffect(() => {
    if (!programmeId || programmeId.trim() === '') {
      setActivities([]);
      setLoading(false);
      setError(null);
      return;
    }

    loadOpenActivities(programmeId);
  }, [programmeId, loadOpenActivities]);

  // 1. Loading State
  if (loading) {
    return (
      <div
        data-testid="open-activities-loading"
        role="status"
        aria-live="polite"
        className={`w-full space-y-4 ${className}`}
      >
        <div className="flex items-center justify-center p-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 text-zinc-400 gap-3">
          <svg
            className="animate-spin h-5 w-5 text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            ></path>
          </svg>
          <span className="text-sm font-medium text-zinc-300">
            Memuatkan senarai aktiviti terbuka...
          </span>
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div
        data-testid="open-activities-error"
        role="alert"
        className={`w-full space-y-4 ${className}`}
      >
        <div className="rounded-2xl border border-red-800/60 bg-red-950/40 p-4 sm:p-5 text-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-red-400 shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-xs sm:text-sm font-medium">{error}</span>
          </div>
          {programmeId && (
            <button
              type="button"
              onClick={() => loadOpenActivities(programmeId)}
              data-testid="retry-open-activities-btn"
              aria-label="Cuba semula muat aktiviti"
              className="px-4 py-2 rounded-xl bg-red-900 hover:bg-red-800 text-white text-xs font-bold transition-colors shrink-0 min-h-[44px] flex items-center justify-center"
            >
              Cuba Semula
            </button>
          )}
        </div>
      </div>
    );
  }

  // 3. Empty State
  if (activities.length === 0) {
    return (
      <div
        data-testid="open-activities-empty"
        className={`w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 p-8 sm:p-10 text-center shadow-lg space-y-4 ${className}`}
      >
        <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 text-zinc-400 flex items-center justify-center mx-auto shadow-inner">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-7 h-7 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>

        <div className="space-y-1 max-w-md mx-auto">
          <h3 className="text-base sm:text-lg font-bold text-zinc-100">
            Tiada Aktiviti Terbuka
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Tiada aktiviti kerja terbuka untuk disambung pada masa ini. Sila cipta laporan baharu untuk memulakan aktiviti kerja.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onCreateNewActivity}
            data-testid="create-new-activity-empty-btn"
            aria-label="Cipta Laporan Baharu"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-colors inline-flex items-center gap-2 min-h-[44px]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>+ Cipta Laporan Baharu</span>
          </button>
        </div>
      </div>
    );
  }

  // 4. Loaded State with Cards
  return (
    <div
      data-testid="open-activities-container"
      className={`w-full space-y-4 ${className}`}
    >
      {/* Header with Counter and Refresh button */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="text-xs sm:text-sm font-semibold text-zinc-300">
          Senarai Aktiviti Terbuka ({activities.length})
        </div>
        {programmeId && (
          <button
            type="button"
            onClick={() => loadOpenActivities(programmeId)}
            data-testid="refresh-open-activities-btn"
            aria-label="Muat semula senarai aktiviti terbuka"
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80 min-h-[36px]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-3.5 h-3.5 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>Muat Semula</span>
          </button>
        )}
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4">
        {activities.map((activity) => (
          <OpenActivityCard
            key={activity.activityId}
            activity={activity}
            onContinue={onSelectActivity}
          />
        ))}
      </div>
    </div>
  );
}
