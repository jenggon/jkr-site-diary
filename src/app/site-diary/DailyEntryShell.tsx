'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import NgamsoiBrand from '@/components/brand/NgamsoiBrand';
import { useAuth } from '@/context/AuthContext';
import { isNgamsoiPreviewMode, ngamsoiPreviewFetch } from '@/lib/ngamsoiPreview';

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

const MALAY_DAY_NAMES = ['AHAD', 'ISNIN', 'SELASA', 'RABU', 'KHAMIS', 'JUMAAT', 'SABTU'] as const;

function formatRevision(number: number | null): string {
  if (number === null || !Number.isFinite(number)) return 'R—';
  return `R${Math.max(0, Math.trunc(number)).toString().padStart(2, '0')}`;
}

function formatClock(date: Date | null): string {
  if (!date) return '--:--';
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function formatDeviceDay(date: Date | null): string {
  if (!date) return '—';
  return MALAY_DAY_NAMES[date.getDay()] ?? '—';
}

function formatDeviceDate(date: Date | null): string {
  if (!date) return '--/--/--';
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  return `${day}/${month}/${year}`;
}

function resolveProjectDayPulse(
  startDate: string | null,
  finishDate: string | null,
  now: Date | null,
): { remainingDays: number | '—'; dayNumber: number | '—'; title?: string } {
  if (!now) return { remainingDays: '—', dayNumber: '—' };

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  let remainingDays: number | '—' = '—';
  let dayNumber: number | '—' = '—';

  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`);
    if (!Number.isNaN(start.getTime())) {
      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
      const elapsedDays = Math.floor((today - startDay) / 86_400_000);
      dayNumber = Math.max(0, elapsedDays + 1);
    }
  }

  if (finishDate) {
    const finish = new Date(`${finishDate}T23:59:59`);
    if (!Number.isNaN(finish.getTime())) {
      remainingDays = Math.max(0, Math.ceil((finish.getTime() - now.getTime()) / 86_400_000));
    }
  }

  return {
    remainingDays,
    dayNumber,
    title: finishDate ? `Tarikh tamat projek: ${finishDate}` : undefined,
  };
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

  const fetchApp = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (isNgamsoiPreviewMode()) {
      const previewResponse = await ngamsoiPreviewFetch(input, init);
      if (previewResponse) return previewResponse;
    }
    return fetch(input, init);
  }, []);

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
      const res = await fetchApp('/api/programme?status=Active');
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
  }, [changeProgramme, fetchApp]);

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
      const summaryRes = await fetchApp(`/api/project-summary?programmeId=${encodeURIComponent(targetId)}`, {
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
        fetchApp(`/api/programme/${encodeURIComponent(targetId)}`, { signal: request.controller.signal }),
        fetchApp(`/api/programme-revision?programmeId=${encodeURIComponent(targetId)}`, { signal: request.controller.signal }),
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
  }, [fetchApp]);

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
  const projectDayPulse = resolveProjectDayPulse(startDate, finishDate, now);
  const deviceDay = formatDeviceDay(now);
  const deviceDate = formatDeviceDate(now);
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
                <small>PROGRAM KERJA</small>
                <strong
                  className={`ng-project-revision ${revisionState === 'RESOLVING' || revisionState === 'UNAVAILABLE' || revisionState === 'IDLE' ? 'ng-project-revision--pending' : ''} ${revisionState === 'ERROR' ? 'ng-project-revision--error' : ''}`.trim()}
                >
                  {revisionLabel}
                </strong>
              </span>

              <span className="ng-project-pulse__item ng-project-pulse__item--split" title={projectDayPulse.title}>
                <span className="ng-project-pulse__pair">
                  <span className="ng-project-pulse__metric">
                    <small>TINGGAL</small>
                    <strong>{projectDayPulse.remainingDays}</strong>
                  </span>
                  <span className="ng-project-pulse__metric">
                    <small>HARI KE</small>
                    <strong>{projectDayPulse.dayNumber}</strong>
                  </span>
                </span>
              </span>

              <span className="ng-project-pulse__item ng-project-pulse__item--split" title="Hari, tarikh dan masa peranti semasa">
                <span className="ng-project-pulse__pair">
                  <span className="ng-project-pulse__metric">
                    <small>{deviceDay}</small>
                    <strong>{deviceDate}</strong>
                  </span>
                  <span className="ng-project-pulse__metric">
                    <small>MASA</small>
                    <strong>{clockLabel}</strong>
                  </span>
                </span>
              </span>
            </div>
          </section>
        )}

        {error && (
          <div className="w-full px-4 py-3 shrink-0">
            <div className="rounded-xl border border-red-800 bg-red-950/60 px-4 py-3 text-sm text-red-200 flex items-center justify-between gap-3">
              <span>● {error}</span>
              <button
                type="button"
                onClick={() => void loadProgrammes()}
                className="rounded-md bg-red-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              >
                Cuba Semula
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 min-h-0 overflow-hidden">
          {loading && availableProgrammes.length === 0 ? (
            <div className="h-full flex items-center justify-center px-4">
              <div className="text-center text-sm text-tactical-text-secondary">Memuatkan konteks projek…</div>
            </div>
          ) : availableProgrammes.length === 0 ? (
            <div className="h-full flex items-start justify-center px-4 pt-12">
              <div className="w-full max-w-3xl rounded-2xl border border-surface-border bg-surface-secondary p-8 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-elevated text-tactical-text-secondary">▣</div>
                <h3 className="text-base font-bold text-tactical-text-primary">Tiada Projek Aktif Ditemui</h3>
                <p className="mx-auto mt-2 max-w-lg text-sm text-tactical-text-secondary">
                  Tiada program atau projek aktif dalam pangkalan data untuk akaun ini. Sila hubungi pentadbir sistem untuk mendaftarkan projek.
                </p>
                <button
                  type="button"
                  onClick={() => void loadProgrammes()}
                  className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  Muat Semula
                </button>
              </div>
            </div>
          ) : !programmeId && availableProgrammes.length > 1 ? (
            <div className="h-full overflow-y-auto px-4 py-6">
              <div className="mx-auto w-full max-w-3xl">
                <div className="mb-5">
                  <h1 className="text-xl font-bold text-tactical-text-primary">Pilih Projek</h1>
                  <p className="mt-1 text-sm text-tactical-text-secondary">Pilih satu projek aktif untuk meneruskan Buku Harian Tapak.</p>
                </div>
                <div className="grid gap-3">
                  {availableProgrammes.map((programme) => (
                    <button
                      key={programme.id}
                      type="button"
                      onClick={() => handleSelectProgramme(programme.id)}
                      className="rounded-xl border border-surface-border bg-surface-secondary p-4 text-left transition hover:border-blue-500/60 hover:bg-surface-elevated"
                    >
                      <div className="text-xs font-semibold uppercase tracking-wide text-blue-400">{programme.code}</div>
                      <div className="mt-1 font-semibold text-tactical-text-primary">{programme.name}</div>
                      {(programme.contractorName || programme.employerName) && (
                        <div className="mt-2 text-xs text-tactical-text-secondary">
                          {[programme.employerName, programme.contractorName].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </DailyEntryContext.Provider>
  );
}
