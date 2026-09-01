'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import NgamsoiBrand from '@/components/brand/NgamsoiBrand';
import { useAuth } from '@/context/AuthContext';

export interface ProgrammeOption {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly shortName?: string | undefined;
  readonly contractorName?: string | undefined;
  readonly employerName?: string | undefined;
}

export interface DailyEntryContextType {
  programmeId: string | null;
  setProgrammeId: (id: string | null) => void;
  programmeName: string | null;
  programmeCode: string | null;
  programmeShortName: string | null;
  revisionId: string | null;
  revisionNumber: number | null;
  revisionState: 'IDLE' | 'RESOLVING' | 'RESOLVED' | 'UNAVAILABLE' | 'ERROR';
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

interface RevisionProjection {
  readonly revisionId: string;
  readonly revisionNumber: number;
  readonly revisionStatus: string;
  readonly isCurrentRevision: boolean;
}

function formatRevision(number: number | null): string {
  if (number === null || !Number.isFinite(number)) return 'R—';
  return `R${Math.max(0, Math.trunc(number)).toString().padStart(2, '0')}`;
}

function formatClock(date: Date | null): string {
  if (!date) return '--:--';
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function resolveDeadlinePulse(finishDate: string | null, now: Date | null): { label: string; value: string; title?: string } {
  if (!finishDate || !now) return { label: 'BAKI', value: '—' };
  const finish = new Date(`${finishDate}T23:59:59`);
  if (Number.isNaN(finish.getTime())) return { label: 'BAKI', value: '—' };
  const days = Math.ceil((finish.getTime() - now.getTime()) / 86_400_000);
  const title = `Tarikh tamat projek: ${finishDate}`;
  if (days < 0) return { label: 'LEWAT', value: `${Math.abs(days)} HARI`, title };
  return { label: 'BAKI', value: `${days} HARI`, title };
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
  const [programmeShortName, setProgrammeShortName] = useState<string | null>(null);
  const [revisionId, setRevisionId] = useState<string | null>(null);
  const [revisionNumber, setRevisionNumber] = useState<number | null>(null);
  const [revisionState, setRevisionState] = useState<DailyEntryContextType['revisionState']>('IDLE');
  const [startDate, setStartDate] = useState<string | null>(null);
  const [finishDate, setFinishDate] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const programmeIdRef = useRef<string | null>(initialProgrammeId ?? null);
  const detailRequestRef = useRef<{ generation: number; programmeId: string; controller: AbortController } | null>(null);
  const detailGenerationRef = useRef(0);

  const invalidateProgrammeDetails = useCallback(() => {
    detailRequestRef.current?.controller.abort();
    detailRequestRef.current = null;
    detailGenerationRef.current += 1;
    setRevisionId(null);
    setRevisionNumber(null);
    setRevisionState('IDLE');
    setStartDate(null);
    setFinishDate(null);
    setError(null);
  }, []);

  const changeProgramme = useCallback((nextProgrammeId: string | null) => {
    if (programmeIdRef.current !== nextProgrammeId) invalidateProgrammeDetails();
    programmeIdRef.current = nextProgrammeId;
    setProgrammeId(nextProgrammeId);
    if (!nextProgrammeId) {
      setProgrammeName(null);
      setProgrammeCode(null);
      setProgrammeShortName(null);
    }
  }, [invalidateProgrammeDetails]);

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
      const rawList: Array<{
        id: string;
        code: string;
        name: string;
        shortName?: string;
        contractorName?: string;
        employerName?: string;
      }> = Array.isArray(json.data) ? json.data : [];

      const options: ProgrammeOption[] = rawList.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        shortName: p.shortName,
        contractorName: p.contractorName,
        employerName: p.employerName,
      }));

      setAvailableProgrammes(options);

      if (options.length === 0) {
        changeProgramme(null);
      } else if (options.length === 1) {
        const single = options[0];
        if (single) {
          changeProgramme(single.id);
          setProgrammeName(single.name);
          setProgrammeCode(single.code);
          setProgrammeShortName(single.shortName ?? single.code);
        }
      } else {
        const currentProgrammeId = programmeIdRef.current;
        if (!currentProgrammeId || !options.some((option) => option.id === currentProgrammeId)) {
          changeProgramme(null);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ralat ketika memuatkan program';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [changeProgramme]);

  const loadProgrammeDetails = useCallback(async (targetId: string) => {
    detailRequestRef.current?.controller.abort();
    const request = {
      generation: ++detailGenerationRef.current,
      programmeId: targetId,
      controller: new AbortController(),
    };
    detailRequestRef.current = request;
    const ownsRequest = () => detailRequestRef.current === request
      && request.generation === detailGenerationRef.current
      && programmeIdRef.current === request.programmeId;

    setLoading(true);
    setRevisionId(null);
    setRevisionNumber(null);
    setRevisionState('RESOLVING');
    setStartDate(null);
    setFinishDate(null);
    setError(null);

    try {
      const summaryRes = await fetch(`/api/project-summary?programmeId=${encodeURIComponent(targetId)}`, {
        signal: request.controller.signal,
      });
      if (!ownsRequest()) return;
      if (!summaryRes.ok) {
        const errJson = await summaryRes.json().catch(() => null);
        throw new Error(errJson?.error || 'Gagal memuatkan ringkasan projek');
      }

      const summaryData = await summaryRes.json();
      if (!ownsRequest()) return;
      if (!summaryData) throw new Error('Maklumat ringkasan projek tidak sah');

      const resolvedRevisionId: string | null = summaryData.revision_id ?? null;
      setRevisionId(resolvedRevisionId);
      setStartDate(summaryData.start_date ?? null);
      setFinishDate(summaryData.finish_date ?? null);
      if (summaryData.task_name) setProgrammeName(summaryData.task_name);

      if (!resolvedRevisionId) {
        setRevisionState('UNAVAILABLE');
        return;
      }

      const [progRes, revisionsRes] = await Promise.all([
        fetch(`/api/programme/${encodeURIComponent(targetId)}`, { signal: request.controller.signal }),
        fetch(`/api/programme-revision?programmeId=${encodeURIComponent(targetId)}`, { signal: request.controller.signal }),
      ]);
      if (!ownsRequest()) return;

      if (progRes.ok) {
        const progJson = await progRes.json();
        if (!ownsRequest()) return;
        if (progJson.data) {
          if (progJson.data.programmeCode) setProgrammeCode(progJson.data.programmeCode);
          if (progJson.data.programmeName) setProgrammeName(progJson.data.programmeName);
          setProgrammeShortName(
            progJson.data.programmeShortName
              ?? progJson.data.shortName
              ?? progJson.data.programmeCode
              ?? null,
          );
        }
      }

      if (!revisionsRes.ok) {
        throw new Error('Gagal mengesahkan semakan semasa');
      }

      const revisionsJson = await revisionsRes.json();
      if (!ownsRequest()) return;
      const revisions: RevisionProjection[] = Array.isArray(revisionsJson.data) ? revisionsJson.data : [];
      const currentRevision = revisions.find((revision) =>
        revision.revisionId === resolvedRevisionId
        && revision.isCurrentRevision === true
        && revision.revisionStatus === 'Approved'
      );

      if (!currentRevision) {
        setRevisionNumber(null);
        setRevisionState('UNAVAILABLE');
        return;
      }

      setRevisionNumber(currentRevision.revisionNumber);
      setRevisionState('RESOLVED');
    } catch (err: unknown) {
      if (!ownsRequest() || (err instanceof Error && err.name === 'AbortError')) return;
      const msg = err instanceof Error ? err.message : 'Ralat ketika memuatkan perincian program';
      setRevisionId(null);
      setRevisionNumber(null);
      setRevisionState('ERROR');
      setError(msg);
    } finally {
      if (ownsRequest()) {
        detailRequestRef.current = null;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadProgrammes();
  }, [loadProgrammes]);

  useEffect(() => {
    if (programmeId) {
      void loadProgrammeDetails(programmeId);
    } else {
      invalidateProgrammeDetails();
    }
    return () => {
      detailRequestRef.current?.controller.abort();
    };
  }, [programmeId, invalidateProgrammeDetails, loadProgrammeDetails]);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const intervalId = window.setInterval(tick, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const handleSelectProgramme = (selectedId: string) => {
    const matched = availableProgrammes.find((p) => p.id === selectedId);
    if (matched) {
      changeProgramme(matched.id);
      setProgrammeName(matched.name);
      setProgrammeCode(matched.code);
      setProgrammeShortName(matched.shortName ?? matched.code);
    }
  };

  const userInitials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'PT';
  const displayShortName = (programmeShortName || programmeCode || 'PROJEK').toUpperCase();
  const revisionLabel = revisionState === 'RESOLVED'
    ? formatRevision(revisionNumber)
    : revisionState === 'ERROR'
      ? 'R!'
      : 'R—';
  const deadlinePulse = resolveDeadlinePulse(finishDate, now);
  const clockLabel = formatClock(now);

  return (
    <DailyEntryContext.Provider
      value={{
        programmeId,
        setProgrammeId: changeProgramme,
        programmeName,
        programmeCode,
        programmeShortName,
        revisionId,
        revisionNumber,
        revisionState,
        startDate,
        finishDate,
        availableProgrammes,
        loading,
        error,
        refreshContext: loadProgrammes,
      }}
    >
      <div className="ngamsoi-shell datum-shell h-[100dvh] w-full bg-surface-canvas text-tactical-text-primary flex flex-col overflow-hidden">
        <header className="ngamsoi-app-header datum-app-header shrink-0 z-40 w-full bg-surface-primary border-b border-surface-border shadow-sm">
          <div className="ng-header-bar mx-auto w-full">
            <NgamsoiBrand compact />

            {user && (
              <details className="ng-header-profile">
                <summary
                  className="ng-profile-trigger"
                  title={user.email ?? 'Profil'}
                  aria-label="Buka profil pengguna"
                >
                  {userInitials}
                </summary>
                <div className="ng-profile-panel">
                  <div className="ng-profile-copy">
                    <span className="ng-profile-label">Akaun</span>
                    <span className="ng-profile-email" title={user.email ?? ''}>{user.email ?? '—'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="ng-profile-signout"
                  >
                    Keluar
                  </button>
                </div>
              </details>
            )}
          </div>
        </header>

        {programmeId && (
          <section className="ng-project-context datum-project-strip shrink-0 w-full" aria-label="Konteks projek semasa">
            <div className="ng-project-context__meta">
              <div className="ng-project-context__identity">
                <span className="ng-project-short-name" title={programmeShortName || programmeCode || ''}>
                  {displayShortName}
                </span>
                {availableProgrammes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => changeProgramme(null)}
                    className="ng-project-switch"
                    title="Pilih projek lain"
                  >
                    Tukar
                  </button>
                )}
              </div>
            </div>

            <h2 className="ng-project-title" title={programmeName || ''}>
              {programmeName || 'Nama Projek'}
            </h2>

            <div className="ng-project-pulse" aria-label="Ringkasan projek semasa">
              <span className="ng-project-pulse__item" title="Semakan program kerja semasa">
                <small>SEMAKAN</small>
                <strong
                  className={`ng-project-revision ${revisionState === 'RESOLVING' || revisionState === 'UNAVAILABLE' || revisionState === 'IDLE' ? 'ng-project-revision--pending' : ''} ${revisionState === 'ERROR' ? 'ng-project-revision--error' : ''}`.trim()}
                >
                  {revisionLabel}
                </strong>
              </span>
              <span className="ng-project-pulse__item" title={deadlinePulse.title}>
                <small>{deadlinePulse.label}</small>
                <strong>{deadlinePulse.value}</strong>
              </span>
              <span className="ng-project-pulse__item" title="Masa peranti semasa">
                <small>MASA</small>
                <strong>{clockLabel}</strong>
              </span>
            </div>
          </section>
        )}

        {error && (
          <div className="w-full px-4 py-3 shrink-0">
            <div className="max-w-3xl mx-auto rounded-xl border border-red-800/60 bg-red-950/40 p-3.5 text-red-200 flex items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-red-400 shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1-2 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{error}</span>
              </div>
              <button
                onClick={() => void loadProgrammes()}
                className="px-2.5 py-1 rounded bg-red-900 hover:bg-red-800 text-white text-xs font-semibold shrink-0 transition-colors"
              >
                Cuba Semula
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 w-full min-h-0 flex flex-col relative">
          {!loading && availableProgrammes.length === 0 && (
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="max-w-3xl mx-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center my-6">
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
                  onClick={() => void loadProgrammes()}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold text-white transition-colors"
                >
                  Muat Semula
                </button>
              </div>
            </div>
          )}

          {!loading && availableProgrammes.length > 1 && !programmeId && (
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="max-w-3xl mx-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-5 my-4">
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
                        <span className="ng-reference-voice text-xs font-bold text-blue-400 tracking-wider uppercase">
                          {prog.shortName ?? prog.code}
                        </span>
                        <span className="text-[11px] text-zinc-500 group-hover:text-blue-400 transition-colors font-medium">
                          Pilih &rarr;
                        </span>
                      </div>
                      <div className="ng-work-voice text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
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
            </div>
          )}

          {programmeId && children}
        </main>
      </div>
    </DailyEntryContext.Provider>
  );
}
