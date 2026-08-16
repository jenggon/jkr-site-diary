'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export interface ProgrammeOption {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly contractorName?: string | undefined;
  readonly employerName?: string | undefined;
}

export interface DailyEntryContextType {
  programmeId: string | null;
  setProgrammeId: (id: string | null) => void;
  programmeName: string | null;
  programmeCode: string | null;
  revisionId: string | null;
  startDate: string | null;
  finishDate: string | null;
  availableProgrammes: ProgrammeOption[];
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
  const [availableProgrammes, setAvailableProgrammes] = useState<ProgrammeOption[]>([]);
  const [programmeId, setProgrammeId] = useState<string | null>(initialProgrammeId ?? null);
  const [programmeName, setProgrammeName] = useState<string | null>(null);
  const [programmeCode, setProgrammeCode] = useState<string | null>(null);
  const [revisionId, setRevisionId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [finishDate, setFinishDate] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch available active programmes via canonical GET /api/programme
  const loadProgrammes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/programme?status=Active');
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || 'Gagal memuatkan senarai program');
      }

      const json = await res.json();
      const rawList: Array<{ id: string; code: string; name: string; contractorName?: string; employerName?: string }> =
        Array.isArray(json.data) ? json.data : [];

      const options: ProgrammeOption[] = rawList.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        contractorName: p.contractorName,
        employerName: p.employerName,
      }));

      setAvailableProgrammes(options);

      // Resolution logic:
      // - 0 programmes: no selection
      // - 1 programme: auto-select that single programme
      // - >1 programmes: only keep if existing selection is valid; NEVER silently pick first
      if (options.length === 0) {
        setProgrammeId(null);
        setProgrammeName(null);
        setProgrammeCode(null);
        setRevisionId(null);
      } else if (options.length === 1) {
        const single = options[0];
        if (single) {
          setProgrammeId(single.id);
          setProgrammeName(single.name);
          setProgrammeCode(single.code);
        }
      } else {
        // Multiple programmes exist
        setProgrammeId((prev) => {
          if (prev && options.some((opt) => opt.id === prev)) {
            return prev;
          }
          return null; // Require explicit user selection
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ralat ketika memuatkan program';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Once programmeId is explicitly established, resolve its summary & revision
  const loadProgrammeDetails = useCallback(async (targetId: string) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch summary explicitly with programmeId (NEVER without programmeId)
      const summaryRes = await fetch(`/api/project-summary?programmeId=${encodeURIComponent(targetId)}`);
      if (!summaryRes.ok) {
        const errJson = await summaryRes.json().catch(() => null);
        throw new Error(errJson?.error || 'Gagal memuatkan ringkasan projek');
      }

      const summaryData = await summaryRes.json();
      if (!summaryData) {
        throw new Error('Maklumat ringkasan projek tidak sah');
      }

      setRevisionId(summaryData.revision_id ?? null);
      setStartDate(summaryData.start_date ?? null);
      setFinishDate(summaryData.finish_date ?? null);
      if (summaryData.task_name) {
        setProgrammeName(summaryData.task_name);
      }

      // Enrich with canonical programme details
      const progRes = await fetch(`/api/programme/${encodeURIComponent(targetId)}`);
      if (progRes.ok) {
        const progJson = await progRes.json();
        if (progJson.data) {
          if (progJson.data.programmeCode) setProgrammeCode(progJson.data.programmeCode);
          if (progJson.data.programmeName) setProgrammeName(progJson.data.programmeName);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ralat ketika memuatkan perincian program';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProgrammes();
  }, [loadProgrammes]);

  useEffect(() => {
    if (programmeId) {
      loadProgrammeDetails(programmeId);
    }
  }, [programmeId, loadProgrammeDetails]);

  const handleSelectProgramme = (selectedId: string) => {
    const matched = availableProgrammes.find((p) => p.id === selectedId);
    if (matched) {
      setProgrammeId(matched.id);
      setProgrammeName(matched.name);
      setProgrammeCode(matched.code);
    }
  };

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
        availableProgrammes,
        loading,
        error,
        refreshContext: loadProgrammes,
      }}
    >
      <div className="min-h-screen w-full bg-zinc-950 text-white flex flex-col items-center">
        {/* Sticky top navigation bar */}
        <header className="sticky top-0 z-40 w-full bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 shadow-md">
          <div className="mx-auto w-full max-w-3xl px-4 py-3 flex items-center justify-between gap-3">
            {/* Logo and branding */}
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

            {/* Print action & user logout */}
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

        {/* Dynamic Project & Active Revision Context Header (when programme is selected) */}
        {programmeId && (
          <div className="w-full bg-zinc-900 border-b border-zinc-800/80 px-4 py-3">
            <div className="mx-auto w-full max-w-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950/80 border border-blue-800/50 px-2 py-0.5 rounded">
                    {programmeCode || 'Program Aktif'}
                  </span>
                  {availableProgrammes.length > 1 && (
                    <button
                      onClick={() => setProgrammeId(null)}
                      className="text-[10px] text-zinc-400 hover:text-blue-400 underline transition-colors"
                      title="Pilih projek lain"
                    >
                      Tukar Projek
                    </button>
                  )}
                  {loading && (
                    <span className="text-[11px] text-zinc-500 animate-pulse">
                      Memuatkan...
                    </span>
                  )}
                </div>
                <h2 className="text-sm sm:text-base font-semibold text-zinc-200 truncate mt-1" title={programmeName || ''}>
                  {programmeName || 'Nama Program'}
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
        )}

        {/* Error Banner */}
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
                onClick={() => loadProgrammes()}
                className="px-2.5 py-1 rounded bg-red-900 hover:bg-red-800 text-white text-xs font-semibold shrink-0 transition-colors"
              >
                Cuba Semula
              </button>
            </div>
          </div>
        )}

        {/* Main Body */}
        <main className="w-full max-w-3xl flex-1 px-2 sm:px-4 py-4">
          {/* Zero Active Programmes State */}
          {!loading && availableProgrammes.length === 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center my-6">
              <div className="w-12 h-12 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-zinc-200">Tiada Projek Aktif Ditemui</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                Tiada program atau projek aktif dalam pangkalan data untuk akaun ini. Sila hubungi pentadbir sistem untuk mendaftarkan projek.
              </p>
              <button
                onClick={() => loadProgrammes()}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold text-white transition-colors"
              >
                Muat Semula
              </button>
            </div>
          )}

          {/* Multiple Active Programmes Selector (when none is selected yet) */}
          {!loading && availableProgrammes.length > 1 && !programmeId && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 my-4">
              <div className="mb-4">
                <h3 className="text-sm sm:text-base font-bold text-zinc-100">Pilih Projek / Program Tapak</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Terdapat {availableProgrammes.length} projek aktif. Sila pilih projek untuk merekod buku harian.
                </p>
              </div>

              <div className="grid gap-3">
                {availableProgrammes.map((prog) => (
                  <button
                    key={prog.id}
                    onClick={() => handleSelectProgramme(prog.id)}
                    className="w-full text-left p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/80 hover:bg-zinc-800/80 hover:border-blue-600/50 transition-all group flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-blue-400 tracking-wider">
                        {prog.code}
                      </span>
                      <span className="text-[11px] text-zinc-500 group-hover:text-blue-400 transition-colors font-medium">
                        Pilih &rarr;
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
                      {prog.name}
                    </div>
                    {prog.contractorName && (
                      <div className="text-[11px] text-zinc-400">
                        Kontraktor: {prog.contractorName}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Render Children (F1 Golden Path Bridge + Legacy Form) when programme is selected */}
          {programmeId && children}
        </main>
      </div>
    </DailyEntryContext.Provider>
  );
}
