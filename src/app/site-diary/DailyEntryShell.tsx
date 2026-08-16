'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export interface DailyEntryContextType {
  programmeId: string | null;
  setProgrammeId: (id: string | null) => void;
  programmeName: string | null;
  programmeCode: string | null;
  revisionId: string | null;
  startDate: string | null;
  finishDate: string | null;
  loading: boolean;
  error: string | null;
  refreshContext: () => Promise<void>;
}

const DailyEntryContext = createContext<DailyEntryContextType | undefined>(undefined);

export function useDailyEntryContext() {
  const context = useContext(DailyEntryContext);
  if (!context) {
    throw new Error('useDailyEntryContext must be used within a DailyEntryShell');
  }
  return context;
}

interface DailyEntryShellProps {
  children?: React.ReactNode;
  initialProgrammeId?: string;
}

export default function DailyEntryShell({
  children,
  initialProgrammeId,
}: DailyEntryShellProps) {
  const { user, signOut } = useAuth();
  const [programmeId, setProgrammeId] = useState<string | null>(initialProgrammeId ?? null);
  const [programmeName, setProgrammeName] = useState<string | null>(null);
  const [programmeCode, setProgrammeCode] = useState<string | null>(null);
  const [revisionId, setRevisionId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [finishDate, setFinishDate] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContext = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch project summary from canonical A26 query endpoint
      const summaryUrl = programmeId
        ? `/api/project-summary?programmeId=${encodeURIComponent(programmeId)}`
        : '/api/project-summary';
      
      const summaryRes = await fetch(summaryUrl);
      if (!summaryRes.ok) {
        const errJson = await summaryRes.json().catch(() => null);
        throw new Error(errJson?.error || 'Gagal memuatkan ringkasan projek');
      }

      const summaryData = await summaryRes.json();
      if (!summaryData) {
        throw new Error('Tiada maklumat projek ditemui');
      }

      const resolvedRevisionId = summaryData.revision_id ?? null;
      setRevisionId(resolvedRevisionId);
      setStartDate(summaryData.start_date ?? null);
      setFinishDate(summaryData.finish_date ?? null);
      setProgrammeName(summaryData.task_name ?? 'Projek JKR');

      // 2. Fetch full programme metadata if programmeId is known
      if (programmeId) {
        const progRes = await fetch(`/api/programme/${encodeURIComponent(programmeId)}`);
        if (progRes.ok) {
          const progJson = await progRes.json();
          if (progJson.data) {
            setProgrammeCode(progJson.data.programmeCode ?? null);
            if (progJson.data.programmeName) {
              setProgrammeName(progJson.data.programmeName);
            }
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ralat ketika memuatkan konteks projek';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [programmeId]);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  const userInitials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'PT';

  return (
    <DailyEntryContext.Provider
      value={{
        programmeId,
        setProgrammeId,
        programmeName,
        programmeCode,
        revisionId,
        startDate,
        finishDate,
        loading,
        error,
        refreshContext: fetchContext,
      }}
    >
      <div className="min-h-screen w-full bg-zinc-950 text-white flex flex-col items-center">
        {/* Mobile-first sticky top navigation bar */}
        <header className="sticky top-0 z-40 w-full bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 shadow-md">
          <div className="mx-auto w-full max-w-3xl px-4 py-3 flex items-center justify-between gap-3">
            {/* Logo and title */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-inner text-sm tracking-wider">
                JKR
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-zinc-100 tracking-tight leading-tight">
                  Buku Harian Tapak
                </h1>
                <p className="text-[11px] text-zinc-400 font-medium leading-none">
                  Sistem Pengurusan Tapak Digital
                </p>
              </div>
            </div>

            {/* Quick Actions & User Profile */}
            <div className="flex items-center gap-2">
              <Link
                href="/site-diary/print"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 transition-colors"
                title="Buka pratonton cetakan JKR Page 1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                <span>Cetak / PDF</span>
              </Link>

              {user && (
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center text-xs font-bold"
                    title={user.email ?? ''}
                  >
                    {userInitials}
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="text-[11px] text-zinc-400 hover:text-red-400 transition-colors px-1"
                    title="Log Keluar"
                  >
                    Keluar
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Project & Active Revision Context Header */}
        <div className="w-full bg-zinc-900 border-b border-zinc-800/80 px-4 py-3">
          <div className="mx-auto w-full max-w-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950/80 border border-blue-800/50 px-2 py-0.5 rounded">
                  {programmeCode || 'Program Aktif'}
                </span>
                {loading && (
                  <span className="text-[11px] text-zinc-500 animate-pulse">
                    Memuatkan konteks...
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-semibold text-zinc-200 truncate mt-1" title={programmeName || ''}>
                {loading ? 'Memuatkan maklumat program...' : (programmeName || 'Program Tidak Ditemui')}
              </h2>
            </div>

            {/* Authorised Revision badge */}
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <div className="flex flex-col items-start sm:items-end">
                <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Semakan Sah
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  {revisionId ? `Rev: ${revisionId.slice(0, 8)}...` : 'Tiada Semakan'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Banner if Context Resolution Fails */}
        {error && (
          <div className="w-full max-w-3xl px-4 mt-3">
            <div className="rounded-xl border border-red-800/60 bg-red-950/40 p-3.5 text-red-200 flex items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
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
                <span>{error}</span>
              </div>
              <button
                onClick={() => fetchContext()}
                className="px-2.5 py-1 rounded bg-red-900 hover:bg-red-800 text-white text-xs font-semibold shrink-0 transition-colors"
              >
                Cuba Semula
              </button>
            </div>
          </div>
        )}

        {/* Main Body Container */}
        <main className="w-full max-w-3xl flex-1 px-2 sm:px-4 py-4">
          {children}
        </main>
      </div>
    </DailyEntryContext.Provider>
  );
}
