'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import NgamsoiBrand from '@/components/brand/NgamsoiBrand';
import { useAuth } from '@/context/AuthContext';
import { isNgamsoiPreviewMode, ngamsoiPreviewFetch } from '@/lib/ngamsoiPreview';
import ProjectWeatherPulse from './ProjectWeatherPulse';

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
  if (!context) throw new Error('useDailyEntryContext must be used within a DailyEntryShell');
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
const DAY_MS = 86_400_000;

function formatRevision(number: number | null): string {
  if (number === null || !Number.isFinite(number)) return 'R—';
  return `R${Math.max(0, Math.trunc(number)).toString().padStart(2, '0')}`;
}

function dateParts(value: string | null): [number, number, number] | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return Number.isInteger(year) && Number.isInteger(month) && Number.isInteger(day) ? [year, month, day] : null;
}

export function resolveProjectDayPulse(startDate: string | null, finishDate: string | null, now: Date | null) {
  if (!now) return { remainingDays: '—' as const, dayNumber: '—' as const };
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  let remainingDays: number | '—' = '—';
  let dayNumber: number | '—' = '—';

  const start = dateParts(startDate);
  if (start) {
    const startUtc = Date.UTC(start[0], start[1] - 1, start[2]);
    const delta = Math.floor((todayUtc - startUtc) / DAY_MS);
    dayNumber = delta < 0 ? 0 : delta + 1;
  }

  const finish = dateParts(finishDate);
  if (finish) {
    const finishUtc = Date.UTC(finish[0], finish[1] - 1, finish[2]);
    remainingDays = Math.floor((finishUtc - todayUtc) / DAY_MS);
  }
  return { remainingDays, dayNumber };
}

function formatClock(date: Date | null): string {
  if (!date) return '--:--';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatDeviceDate(date: Date | null): string {
  if (!date) return '--/--/--';
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}`;
}

function formatFinish(value: string | null): string {
  const parts = dateParts(value);
  return parts ? `${String(parts[2]).padStart(2, '0')}/${String(parts[1]).padStart(2, '0')}/${String(parts[0]).slice(-2)}` : '—';
}

export default function DailyEntryShell({ children, initialProgrammeId }: DailyEntryShellProps) {
  const { user, signOut } = useAuth();
  const [availableProgrammes, setAvailableProgrammes] = useState<ProgrammeOption[]>([]);
  const [programmeId, setProgrammeIdState] = useState<string | null>(initialProgrammeId ?? null);
  const [programmeName, setProgrammeName] = useState<string | null>(null);
  const [programmeCode, setProgrammeCode] = useState<string | null>(null);
  const [programmeShortName, setProgrammeShortName] = useState<string | null>(null);
  const [revisionId, setRevisionId] = useState<string | null>(null);
  const [revisionNumber, setRevisionNumber] = useState<number | null>(null);
  const [revisionState, setRevisionState] = useState<DailyEntryContextType['revisionState']>('IDLE');
  const [startDate, setStartDate] = useState<string | null>(null);
  const [finishDate, setFinishDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const programmeIdRef = useRef<string | null>(initialProgrammeId ?? null);
  const requestGeneration = useRef(0);

  const fetchApp = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (isNgamsoiPreviewMode()) {
      const preview = await ngamsoiPreviewFetch(input, init);
      if (preview) return preview;
    }
    return fetch(input, init);
  }, []);

  const clearProjectDetail = useCallback(() => {
    requestGeneration.current += 1;
    setRevisionId(null);
    setRevisionNumber(null);
    setRevisionState('IDLE');
    setStartDate(null);
    setFinishDate(null);
    setError(null);
  }, []);

  const changeProgramme = useCallback((next: string | null) => {
    if (programmeIdRef.current !== next) clearProjectDetail();
    programmeIdRef.current = next;
    setProgrammeIdState(next);
    if (!next) {
      setProgrammeName(null);
      setProgrammeCode(null);
      setProgrammeShortName(null);
    }
  }, [clearProjectDetail]);

  const loadProgrammes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApp('/api/programme?status=Active');
      if (!response.ok) throw new Error('Gagal memuatkan senarai projek');
      const body = await response.json();
      const list = Array.isArray(body.data) ? body.data : [];
      const options: ProgrammeOption[] = list.map((item: Record<string, unknown>) => ({
        id: String(item.id ?? ''),
        code: String(item.code ?? ''),
        name: String(item.name ?? ''),
        shortName: typeof item.shortName === 'string' ? item.shortName : undefined,
        contractorName: typeof item.contractorName === 'string' ? item.contractorName : undefined,
        employerName: typeof item.employerName === 'string' ? item.employerName : undefined,
      })).filter((item: ProgrammeOption) => item.id && item.name);
      setAvailableProgrammes(options);

      const current = programmeIdRef.current;
      if (options.length === 0) changeProgramme(null);
      else if (options.length === 1) {
        const only = options[0]!;
        changeProgramme(only.id);
        setProgrammeName(only.name);
        setProgrammeCode(only.code);
        setProgrammeShortName(only.shortName ?? only.code);
      } else if (!current || !options.some((item) => item.id === current)) changeProgramme(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal memuatkan projek');
    } finally {
      setLoading(false);
    }
  }, [changeProgramme, fetchApp]);

  const loadProgrammeDetails = useCallback(async (targetId: string) => {
    const generation = ++requestGeneration.current;
    const owns = () => generation === requestGeneration.current && programmeIdRef.current === targetId;
    setLoading(true);
    setRevisionState('RESOLVING');
    setError(null);
    try {
      const summaryResponse = await fetchApp(`/api/project-summary?programmeId=${encodeURIComponent(targetId)}`);
      if (!summaryResponse.ok) throw new Error('Gagal memuatkan ringkasan projek');
      const summary = await summaryResponse.json();
      if (!owns()) return;
      const resolvedRevisionId = typeof summary.revision_id === 'string' ? summary.revision_id : null;
      setRevisionId(resolvedRevisionId);
      setStartDate(typeof summary.start_date === 'string' ? summary.start_date : null);
      setFinishDate(typeof summary.finish_date === 'string' ? summary.finish_date : null);
      if (typeof summary.task_name === 'string') setProgrammeName(summary.task_name);
      if (!resolvedRevisionId) {
        setRevisionState('UNAVAILABLE');
        return;
      }

      const [programmeResponse, revisionsResponse] = await Promise.all([
        fetchApp(`/api/programme/${encodeURIComponent(targetId)}`),
        fetchApp(`/api/programme-revision?programmeId=${encodeURIComponent(targetId)}`),
      ]);
      if (!owns()) return;
      if (programmeResponse.ok) {
        const programmeBody = await programmeResponse.json();
        const data = programmeBody.data ?? {};
        if (typeof data.programmeCode === 'string') setProgrammeCode(data.programmeCode);
        if (typeof data.programmeName === 'string') setProgrammeName(data.programmeName);
        setProgrammeShortName(data.programmeShortName ?? data.shortName ?? data.programmeCode ?? null);
      }
      if (!revisionsResponse.ok) throw new Error('Gagal mengesahkan Program Kerja');
      const revisionsBody = await revisionsResponse.json();
      const revisions: RevisionProjection[] = Array.isArray(revisionsBody.data) ? revisionsBody.data : [];
      const current = revisions.find((revision) => revision.revisionId === resolvedRevisionId && revision.isCurrentRevision && revision.revisionStatus === 'Approved');
      if (!current) {
        setRevisionNumber(null);
        setRevisionState('UNAVAILABLE');
      } else {
        setRevisionNumber(current.revisionNumber);
        setRevisionState('RESOLVED');
      }
    } catch (caught) {
      if (!owns()) return;
      setRevisionId(null);
      setRevisionNumber(null);
      setRevisionState('ERROR');
      setError(caught instanceof Error ? caught.message : 'Gagal memuatkan konteks projek');
    } finally {
      if (owns()) setLoading(false);
    }
  }, [fetchApp]);

  useEffect(() => { void loadProgrammes(); }, [loadProgrammes]);
  useEffect(() => {
    if (programmeId) void loadProgrammeDetails(programmeId);
    else clearProjectDetail();
  }, [clearProjectDetail, loadProgrammeDetails, programmeId]);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const selectProgramme = (id: string) => {
    const matched = availableProgrammes.find((item) => item.id === id);
    if (!matched) return;
    changeProgramme(matched.id);
    setProgrammeName(matched.name);
    setProgrammeCode(matched.code);
    setProgrammeShortName(matched.shortName ?? matched.code);
  };

  const pulse = resolveProjectDayPulse(startDate, finishDate, now);
  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'PT';
  const shortName = (programmeShortName || programmeCode || 'PROJEK').toUpperCase();
  const revisionLabel = revisionState === 'RESOLVED' ? formatRevision(revisionNumber) : revisionState === 'ERROR' ? 'R!' : 'R—';
  const dayLabel = now ? (MALAY_DAY_NAMES[now.getDay()] ?? '—') : '—';

  return (
    <DailyEntryContext.Provider value={{
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
    }}>
      <div className="ngamsoi-shell datum-shell flex h-[100dvh] w-full flex-col overflow-hidden bg-surface-canvas text-tactical-text-primary">
        <header className="ngamsoi-app-header datum-app-header z-40 w-full shrink-0 border-b border-surface-border bg-surface-primary shadow-sm">
          <div className="ng-header-bar mx-auto w-full">
            <NgamsoiBrand compact />
            {user && (
              <details className="ng-header-profile">
                <summary className="ng-profile-trigger" title={user.email ?? 'Profil'} aria-label="Buka profil pengguna">{initials}</summary>
                <div className="ng-profile-panel">
                  <div className="ng-profile-copy"><span className="ng-profile-label">Akaun</span><span className="ng-profile-email" title={user.email ?? ''}>{user.email ?? '—'}</span></div>
                  <div className="border-t border-surface-border pt-2 text-xs text-tactical-text-muted">Tetapan projek akan diletakkan di sini.</div>
                  <button type="button" onClick={() => void signOut()} className="ng-profile-signout">Keluar</button>
                </div>
              </details>
            )}
          </div>
        </header>

        {programmeId && (
          <section className="ng-project-context datum-project-strip w-full shrink-0" aria-label="Konteks projek semasa">
            <div className="ng-project-context__meta">
              <div className="ng-project-context__identity">
                <span className="ng-project-short-name" title={programmeShortName || programmeCode || ''}>{shortName}</span>
                {availableProgrammes.length > 1 && <button type="button" onClick={() => changeProgramme(null)} className="ng-project-switch" title="Pilih projek lain">Tukar</button>}
              </div>
            </div>
            <h2 className="ng-project-title" title={programmeName || ''}>{programmeName || 'Nama Projek'}</h2>

            <div className="ng-project-pulse ng-project-pulse--f45" aria-label="Ringkasan projek semasa" data-dashboard-facts="4">
              <span className="ng-project-pulse__item" data-pulse="programme" title="Program Kerja semasa"><small>PROGRAM KERJA</small><strong>{revisionLabel}</strong></span>
              <span className="ng-project-pulse__item" data-pulse="remaining" title={`Siap semasa ${finishDate ?? '—'}`}><small>TINGGAL</small><strong>{pulse.remainingDays} HARI · SIAP {formatFinish(finishDate)}</strong></span>
              <span className="ng-project-pulse__item" data-pulse="now" title="Tarikh dan masa peranti semasa"><small>SEMASA</small><strong>{dayLabel} {formatDeviceDate(now)} · {formatClock(now)}</strong></span>
              <ProjectWeatherPulse />
            </div>
          </section>
        )}

        {error && <div className="w-full shrink-0 px-4 py-2"><div className="flex items-center justify-between gap-3 rounded-xl border border-red-800 bg-red-950/60 px-4 py-3 text-sm text-red-200"><span>● {error}</span><button type="button" onClick={() => void loadProgrammes()} className="rounded-md bg-red-800 px-3 py-1.5 text-xs font-semibold text-white">Cuba Semula</button></div></div>}

        <main className="min-h-0 flex-1 overflow-hidden">
          {loading && availableProgrammes.length === 0 ? (
            <div className="flex h-full items-center justify-center px-4 text-sm text-tactical-text-secondary">Memuatkan konteks projek…</div>
          ) : availableProgrammes.length === 0 ? (
            <div className="flex h-full items-start justify-center px-4 pt-12"><div className="w-full max-w-3xl rounded-2xl border border-surface-border bg-surface-secondary p-8 text-center"><h3 className="font-bold">Tiada Projek Aktif Ditemui</h3><p className="mt-2 text-sm text-tactical-text-secondary">Sila hubungi pentadbir sistem untuk mendaftarkan projek.</p><button type="button" onClick={() => void loadProgrammes()} className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Muat Semula</button></div></div>
          ) : !programmeId && availableProgrammes.length > 1 ? (
            <div className="h-full overflow-y-auto px-4 py-6"><div className="mx-auto w-full max-w-3xl"><h1 className="text-xl font-bold">Pilih Projek</h1><p className="mt-1 text-sm text-tactical-text-secondary">Pilih satu projek aktif untuk meneruskan Buku Harian Tapak.</p><div className="mt-5 grid gap-3">{availableProgrammes.map((programme) => <button key={programme.id} type="button" onClick={() => selectProgramme(programme.id)} className="rounded-xl border border-surface-border bg-surface-secondary p-4 text-left hover:border-blue-500/60"><div className="text-xs font-semibold uppercase tracking-wide text-blue-400">{programme.code}</div><div className="mt-1 font-semibold">{programme.name}</div>{(programme.employerName || programme.contractorName) && <div className="mt-2 text-xs text-tactical-text-secondary">{[programme.employerName, programme.contractorName].filter(Boolean).join(' · ')}</div>}</button>)}</div></div></div>
          ) : children}
        </main>
      </div>
    </DailyEntryContext.Provider>
  );
}
