'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDailyEntryContext } from './DailyEntryShell';
import { SiteDiaryManagementProjection, SiteDiaryManagementRevision } from '@/types/siteDiaryManagement';

type ViewMode = 'CURRENT' | 'HISTORY';
type SourceFilter = 'ALL' | 'MSP' | 'VO';
type ScopeFilter = 'ALL' | 'CONTRACTOR' | 'NSC';

const SESSION_MESSAGE = 'Sesi telah tamat. Sila log masuk semula.';

function formatDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(Date.UTC(year, month - 1, day)));
}

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('ms-MY', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(parsed);
}

function revisionLabel(revision: SiteDiaryManagementRevision): string {
  return `Semakan ${revision.revisionNumber} — ${revision.revisionTitle}`;
}

export default function DiaryManagementList() {
  const { programmeId } = useDailyEntryContext();
  const [revisions, setRevisions] = useState<SiteDiaryManagementRevision[]>([]);
  const [currentRevision, setCurrentRevision] = useState<SiteDiaryManagementRevision | null>(null);
  const [selectedHistoricalId, setSelectedHistoricalId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('CURRENT');
  const [diaries, setDiaries] = useState<SiteDiaryManagementProjection[]>([]);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('ALL');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('ALL');
  const [loadingRevisions, setLoadingRevisions] = useState(false);
  const [loadingDiaries, setLoadingDiaries] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const revisionAbortRef = useRef<AbortController | null>(null);
  const diaryAbortRef = useRef<AbortController | null>(null);
  const revisionGenerationRef = useRef(0);
  const diaryGenerationRef = useRef(0);

  const loadDiaries = useCallback(async (targetProgrammeId: string, revisionId: string, text: string) => {
    diaryAbortRef.current?.abort();
    const controller = new AbortController();
    diaryAbortRef.current = controller;
    const generation = ++diaryGenerationRef.current;
    setLoadingDiaries(true);
    setError(null);
    try {
      const query = new URLSearchParams({ programmeId: targetProgrammeId });
      if (text.trim()) query.set('text', text.trim());
      const response = await fetch(
        `/api/site-diary/revision/${encodeURIComponent(revisionId)}?${query.toString()}`,
        { signal: controller.signal }
      );
      if (generation !== diaryGenerationRef.current) return;
      if (response.status === 401) throw new Error(SESSION_MESSAGE);
      if (!response.ok) {
        const json = await response.json().catch(() => null);
        throw new Error(json?.error || 'Gagal memuatkan rekod Buku Harian Tapak.');
      }
      const json = await response.json();
      if (generation === diaryGenerationRef.current) {
        setDiaries(Array.isArray(json.data) ? json.data : []);
      }
    } catch (reason: unknown) {
      if (generation !== diaryGenerationRef.current || controller.signal.aborted) return;
      setDiaries([]);
      setError(reason instanceof Error ? reason.message : 'Gagal memuatkan rekod Buku Harian Tapak.');
    } finally {
      if (generation === diaryGenerationRef.current) setLoadingDiaries(false);
    }
  }, []);

  const loadRevisions = useCallback(async (targetProgrammeId: string) => {
    revisionAbortRef.current?.abort();
    diaryAbortRef.current?.abort();
    const controller = new AbortController();
    revisionAbortRef.current = controller;
    const generation = ++revisionGenerationRef.current;
    ++diaryGenerationRef.current;
    setLoadingRevisions(true);
    setLoadingDiaries(false);
    setError(null);
    setDiaries([]);
    try {
      const response = await fetch(
        `/api/programme-revision?programmeId=${encodeURIComponent(targetProgrammeId)}`,
        { signal: controller.signal }
      );
      if (generation !== revisionGenerationRef.current) return;
      if (response.status === 401) throw new Error(SESSION_MESSAGE);
      if (!response.ok) {
        const json = await response.json().catch(() => null);
        throw new Error(json?.error || 'Gagal memuatkan semakan projek.');
      }
      const json = await response.json();
      const nextRevisions: SiteDiaryManagementRevision[] = Array.isArray(json.data) ? json.data : [];
      if (generation !== revisionGenerationRef.current) return;
      setRevisions(nextRevisions);
      const current = nextRevisions.filter((revision) => revision.isCurrentRevision);
      if (current.length !== 1) {
        setCurrentRevision(null);
        setDiaries([]);
        setError(current.length === 0
          ? 'Tiada semakan semasa yang sah untuk projek ini.'
          : 'Maklumat semakan semasa tidak konsisten.');
        return;
      }
      setCurrentRevision(current[0] ?? null);
    } catch (reason: unknown) {
      if (generation !== revisionGenerationRef.current || controller.signal.aborted) return;
      setRevisions([]);
      setCurrentRevision(null);
      setDiaries([]);
      setError(reason instanceof Error ? reason.message : 'Gagal memuatkan semakan projek.');
    } finally {
      if (generation === revisionGenerationRef.current) setLoadingRevisions(false);
    }
  }, []);

  useEffect(() => {
    revisionAbortRef.current?.abort();
    diaryAbortRef.current?.abort();
    ++revisionGenerationRef.current;
    ++diaryGenerationRef.current;
    setRevisions([]);
    setCurrentRevision(null);
    setSelectedHistoricalId(null);
    setViewMode('CURRENT');
    setDiaries([]);
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setSourceFilter('ALL');
    setScopeFilter('ALL');
    setError(null);
    setLoadingRevisions(false);
    setLoadingDiaries(false);
    if (programmeId) void loadRevisions(programmeId);
    return () => {
      revisionAbortRef.current?.abort();
      diaryAbortRef.current?.abort();
    };
  }, [programmeId, loadRevisions]);

  const activeRevisionId = viewMode === 'CURRENT' ? currentRevision?.revisionId : selectedHistoricalId;
  useEffect(() => {
    if (!programmeId || !activeRevisionId || loadingRevisions) return;
    void loadDiaries(programmeId, activeRevisionId, search);
  }, [programmeId, activeRevisionId, search, loadingRevisions, loadDiaries]);

  const historicalRevisions = revisions.filter((revision) => !revision.isCurrentRevision);
  const selectedRevision = revisions.find((revision) => revision.revisionId === activeRevisionId) ?? null;
  const filteredDiaries = useMemo(() => diaries.filter((diary) => {
    if (dateFrom && diary.activityDate < dateFrom) return false;
    if (dateTo && diary.activityDate > dateTo) return false;
    if (sourceFilter !== 'ALL' && diary.sourceType !== sourceFilter) return false;
    if (scopeFilter !== 'ALL' && diary.contractorScope !== scopeFilter) return false;
    return true;
  }), [diaries, dateFrom, dateTo, sourceFilter, scopeFilter]);

  const chooseCurrent = () => {
    setViewMode('CURRENT');
    setSelectedHistoricalId(null);
    setSearch('');
  };
  const chooseHistorical = (revisionId: string) => {
    setViewMode('HISTORY');
    setSelectedHistoricalId(revisionId);
    setSearch('');
  };
  const retry = () => {
    if (!programmeId) return;
    if (!activeRevisionId) void loadRevisions(programmeId);
    else void loadDiaries(programmeId, activeRevisionId, search);
  };

  return (
    <section aria-label="Pengurusan Rekod Buku Harian" className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <div role="tablist" aria-label="Konteks rekod" className="grid grid-cols-2 gap-2">
          <button type="button" role="tab" aria-selected={viewMode === 'CURRENT'} onClick={chooseCurrent}
            className={`min-h-[44px] rounded-xl px-3 py-2 text-sm font-bold ${viewMode === 'CURRENT' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-300'}`}>
            Rekod Semasa
          </button>
          <button type="button" role="tab" aria-selected={viewMode === 'HISTORY'}
            onClick={() => setViewMode('HISTORY')}
            className={`min-h-[44px] rounded-xl px-3 py-2 text-sm font-bold ${viewMode === 'HISTORY' ? 'bg-amber-700 text-white' : 'bg-zinc-800 text-zinc-300'}`}>
            Semakan Terdahulu
          </button>
        </div>

        {viewMode === 'CURRENT' && currentRevision && (
          <p className="mt-3 text-xs text-zinc-300" data-testid="current-revision-label">
            {revisionLabel(currentRevision)} · {currentRevision.revisionStatus}
          </p>
        )}

        {viewMode === 'HISTORY' && (
          <div className="mt-3 space-y-2">
            {historicalRevisions.length === 0 ? (
              <p className="text-sm text-zinc-400">Tiada semakan terdahulu.</p>
            ) : (
              <label className="block text-xs font-semibold text-zinc-300">
                Pilih semakan sejarah
                <select aria-label="Pilih semakan sejarah" value={selectedHistoricalId ?? ''}
                  onChange={(event) => chooseHistorical(event.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm">
                  <option value="">Pilih semakan</option>
                  {historicalRevisions.map((revision) => (
                    <option key={revision.revisionId} value={revision.revisionId}>
                      {revisionLabel(revision)} · {revision.revisionStatus}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button type="button" onClick={chooseCurrent} className="min-h-[44px] text-sm font-semibold text-blue-400 underline">
              Kembali ke Rekod Semasa
            </button>
          </div>
        )}
      </div>

      {activeRevisionId && (
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:grid-cols-3">
          <label className="col-span-2 text-xs text-zinc-300 sm:col-span-3">
            Cari aktiviti
            <input aria-label="Cari aktiviti" value={search} onChange={(event) => setSearch(event.target.value)}
              placeholder="Tajuk, rujukan atau aktiviti" className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm" />
          </label>
          <label className="text-xs text-zinc-300">Tarikh mula
            <input aria-label="Tarikh mula" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-2" />
          </label>
          <label className="text-xs text-zinc-300">Tarikh akhir
            <input aria-label="Tarikh akhir" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-2" />
          </label>
          <label className="text-xs text-zinc-300">Sumber
            <select aria-label="Tapis sumber" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-2">
              <option value="ALL">Semua</option><option value="MSP">MSP</option><option value="VO">VO</option>
            </select>
          </label>
          <label className="text-xs text-zinc-300">Skop kontraktor
            <select aria-label="Tapis skop kontraktor" value={scopeFilter} onChange={(event) => setScopeFilter(event.target.value as ScopeFilter)}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-2">
              <option value="ALL">Semua</option><option value="CONTRACTOR">Kontraktor</option><option value="NSC">NSC</option>
            </select>
          </label>
        </div>
      )}

      {(loadingRevisions || loadingDiaries) && (
        <div role="status" aria-live="polite" className="rounded-xl bg-zinc-900 p-4 text-sm text-zinc-300">Memuatkan rekod...</div>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-red-800 bg-red-950/50 p-4 text-sm text-red-200">
          <p>{error}</p>
          <button type="button" onClick={retry} className="mt-2 min-h-[44px] font-bold underline">Cuba Semula</button>
        </div>
      )}

      {!error && !loadingRevisions && !loadingDiaries && viewMode === 'HISTORY' && !selectedHistoricalId && historicalRevisions.length > 0 && (
        <p className="rounded-xl bg-zinc-900 p-5 text-center text-sm text-zinc-400">Pilih semakan terdahulu untuk melihat rekod sejarah.</p>
      )}
      {!error && !loadingRevisions && !loadingDiaries && activeRevisionId && filteredDiaries.length === 0 && (
        <p className="rounded-xl bg-zinc-900 p-5 text-center text-sm text-zinc-400">
          {diaries.length === 0
            ? viewMode === 'CURRENT' ? 'Tiada rekod semasa.' : 'Tiada rekod bagi semakan terdahulu ini.'
            : 'Tiada rekod sepadan dengan tapisan.'}
        </p>
      )}

      <div className="space-y-3" aria-label="Senarai rekod Buku Harian">
        {activeRevisionId && filteredDiaries.map((diary) => (
          <article key={diary.siteDiaryId} className={`rounded-2xl border p-4 shadow-sm ${
            viewMode === 'HISTORY' ? 'border-amber-800/70 bg-amber-950/20' : 'border-zinc-800 bg-zinc-900'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <time dateTime={diary.activityDate} className="text-xs font-bold text-blue-300">{formatDate(diary.activityDate)}</time>
                <h3 className="mt-1 text-base font-bold text-zinc-100">
                  {diary.activityTitle ?? 'Maklumat aktiviti tidak tersedia'}
                </h3>
              </div>
              {diary.sourceType && <span className="rounded-lg bg-zinc-800 px-2 py-1 text-xs font-bold">{diary.sourceType}</span>}
            </div>
            {viewMode === 'HISTORY' && (
              <p className="mt-2 text-xs font-bold text-amber-300">Sejarah / Baca Sahaja</p>
            )}
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <div><dt className="text-zinc-500">Rujukan</dt><dd className="text-zinc-200">{diary.sourceReference ?? 'Tidak tersedia'}</dd></div>
              <div><dt className="text-zinc-500">Lokasi</dt><dd className="text-zinc-200">{diary.location ?? 'Tidak tersedia'}</dd></div>
              <div><dt className="text-zinc-500">Skop</dt><dd className="text-zinc-200">{diary.contractorScope ?? 'Tidak tersedia'}</dd></div>
              <div><dt className="text-zinc-500">Status</dt><dd className="text-zinc-200">{diary.diaryStatus ?? diary.activityStatus ?? 'Rekod Harian'}</dd></div>
            </dl>
            {viewMode === 'HISTORY' && selectedRevision && (
              <p className="mt-3 text-xs text-zinc-400">{revisionLabel(selectedRevision)} · {selectedRevision.revisionStatus}</p>
            )}
            <p className="mt-3 text-[11px] text-zinc-500">Dikemaskini {formatTimestamp(diary.lastModifiedAt)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
