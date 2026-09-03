'use client';

import React, { FormEvent, useMemo, useRef, useState } from 'react';
import NgamsoiCompletionRitual from '@/components/brand/NgamsoiCompletionRitual';
import { useDailyEntryContext } from './DailyEntryShell';
import OperationalSourceSelector, { SelectedOperationalSource } from './OperationalSourceSelector';
import SmartWorkforceEntry from './SmartWorkforceEntry';
import type { ManpowerRow } from './WorkforceEntry';
import WeatherEvidenceSection, { EMPTY_WEATHER_EVIDENCE, WeatherEvidenceValue } from './WeatherEvidenceSection';
import type { SiteDiaryDailyWorkStatus } from '@/types/siteDiary';

function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dailyButtonState(status: SiteDiaryDailyWorkStatus, button: 'MULA' | 'LAKSANA' | 'SIAP'): boolean {
  if (button === 'MULA') return status === 'MULA' || status === 'MULA_DAN_SIAP';
  if (button === 'SIAP') return status === 'SIAP' || status === 'MULA_DAN_SIAP';
  return status === 'LAKSANA';
}

function nextStatus(current: SiteDiaryDailyWorkStatus, button: 'MULA' | 'LAKSANA' | 'SIAP'): SiteDiaryDailyWorkStatus {
  if (button === 'LAKSANA') return 'LAKSANA';
  if (button === 'MULA') {
    if (current === 'SIAP') return 'MULA_DAN_SIAP';
    if (current === 'MULA_DAN_SIAP') return 'SIAP';
    return 'MULA';
  }
  if (current === 'MULA') return 'MULA_DAN_SIAP';
  if (current === 'MULA_DAN_SIAP') return 'MULA';
  return 'SIAP';
}

async function safeError(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null);
  return body && typeof body.error === 'string' && body.error.trim() ? body.error : fallback;
}

function resolveActivityId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  for (const key of ['activityId', 'activity_id']) {
    if (typeof record[key] === 'string' && record[key]) return record[key] as string;
  }
  return null;
}

export default function CatatEntryForm() {
  const { programmeId, revisionId } = useDailyEntryContext();
  const sourceRef = useRef<HTMLDivElement | null>(null);
  const submitLock = useRef(false);
  const [selectedSource, setSelectedSource] = useState<SelectedOperationalSource | null>(null);
  const [activityDate, setActivityDate] = useState(todayIso);
  const [dailyStatus, setDailyStatus] = useState<SiteDiaryDailyWorkStatus>('MULA');
  const [knownStartDate, setKnownStartDate] = useState('');
  const [location, setLocation] = useState('');
  const [contractorScope, setContractorScope] = useState<'CONTRACTOR' | 'NSC'>('CONTRACTOR');
  const [workStartTime, setWorkStartTime] = useState('08:00');
  const [workEndTime, setWorkEndTime] = useState('17:00');
  const [weather, setWeather] = useState<WeatherEvidenceValue>(EMPTY_WEATHER_EVIDENCE);
  const [manpower, setManpower] = useState<ManpowerRow[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const knownStartRequired = dailyStatus === 'LAKSANA' || dailyStatus === 'SIAP';
  const actualStartDate = knownStartRequired ? knownStartDate : activityDate;
  const activeManpower = useMemo(
    () => manpower.filter((row) => row.bumi_count + row.non_bumi_count + row.foreign_count > 0),
    [manpower],
  );

  const softReset = (savedId: string) => {
    setSuccessId(savedId);
    setSelectedSource(null);
    setDailyStatus('MULA');
    setKnownStartDate('');
    setLocation('');
    setContractorScope('CONTRACTOR');
    setWorkStartTime('08:00');
    setWorkEndTime('17:00');
    setManpower([]);
    setNotes('');

    window.setTimeout(() => {
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      sourceRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      const search = sourceRef.current?.querySelector<HTMLInputElement>('input[type="search"], input[type="text"]');
      search?.focus({ preventScroll: true });
    }, 850);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitLock.current) return;
    setError(null);
    setSuccessId(null);

    if (!programmeId || !revisionId) return setError('Program Kerja semasa belum tersedia.');
    if (!selectedSource) return setError('Pilih kerja MSP atau VO dahulu.');
    if (!activityDate) return setError('Tarikh catatan diperlukan.');
    if (knownStartRequired && !knownStartDate) return setError('Tarikh mula sebenar diperlukan untuk status ini.');
    if (!location.trim()) return setError('Lokasi kerja diperlukan.');
    if (!notes.trim()) return setError('Catatan kerja diperlukan.');
    if (weather.source === 'AUTO') return setError('Sahkan atau ubah cadangan cuaca dahulu.');

    submitLock.current = true;
    setIsSubmitting(true);
    try {
      const createActivityPayload: Record<string, unknown> = {
        programmeId,
        revisionId,
        sourceType: selectedSource.sourceType,
        activityName: selectedSource.title,
      };
      if (selectedSource.sourceType === 'MSP') createActivityPayload.taskId = selectedSource.id;
      else createActivityPayload.voItemId = selectedSource.id;

      const activityResponse = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createActivityPayload),
      });
      if (!activityResponse.ok) throw new Error(await safeError(activityResponse, 'Gagal membuka aktiviti.'));
      const activityBody = await activityResponse.json();
      const activityId = resolveActivityId(activityBody?.data);
      if (!activityId) throw new Error('ID Aktiviti tidak dapat ditentukan.');

      const completesToday = dailyStatus === 'SIAP' || dailyStatus === 'MULA_DAN_SIAP';
      const lifecycleResponse = await fetch(
        completesToday
          ? `/api/activities/${encodeURIComponent(activityId)}/complete`
          : `/api/activities/${encodeURIComponent(activityId)}/start`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(completesToday
            ? { actualStartDate, completedDate: activityDate }
            : { actualStartDate }),
        },
      );
      if (!lifecycleResponse.ok) throw new Error(await safeError(lifecycleResponse, 'Gagal mengemaskini kitar hayat aktiviti.'));

      const firstRain = weather.intervals[0] ?? null;
      const diaryResponse = await fetch('/api/site-diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programme_id: programmeId,
          revision_id: revisionId,
          activity_id: activityId,
          activity_date: activityDate,
          operation_intent: completesToday ? 'FINAL_COMPLETION_DIARY' : 'IN_PROGRESS_DIARY',
          weather: weather.condition === 'HUJAN' ? 'Rainy' : 'Sunny',
          notes: notes.trim(),
          manpower: activeManpower,
          print_context: {
            location: location.trim(),
            work_start_time: workStartTime || null,
            work_end_time: workEndTime || null,
            daily_work_status: dailyStatus,
            weather_condition: weather.condition,
            rain_start_time: firstRain?.start ?? null,
            rain_end_time: firstRain?.end === '24:00' ? '23:59' : (firstRain?.end ?? null),
            rain_intervals: weather.intervals,
            weather_suggested_intervals: weather.suggestedIntervals,
            weather_source: weather.source,
            weather_provider: weather.provider,
            weather_provider_fetched_at: weather.fetchedAt,
            weather_provider_resolution: weather.provider ? 'HOURLY' : null,
            weather_latitude: weather.latitude,
            weather_longitude: weather.longitude,
            weather_timezone: weather.timezone,
            contractor_scope: contractorScope,
          },
        }),
      });
      if (!diaryResponse.ok) throw new Error(await safeError(diaryResponse, 'Gagal menyimpan catatan.'));
      const diaryBody = await diaryResponse.json();
      const savedId = typeof diaryBody?.data?.site_diary_id === 'string'
        ? diaryBody.data.site_diary_id
        : typeof diaryBody?.data?.siteDiaryId === 'string'
          ? diaryBody.data.siteDiaryId
          : activityId;
      softReset(savedId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal menyimpan catatan.');
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="ng-catat-flow w-full space-y-4" aria-label="Borang Buku Harian Tapak" data-entry-mode="CATAT">
      <div ref={sourceRef} className="ng-catat-source-step" data-catat-start>
        <OperationalSourceSelector selectedSource={selectedSource} onSelectSource={setSelectedSource} disabled={isSubmitting} />
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 sm:p-5 shadow-lg">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">HARIAN</div>
            <input
              type="date"
              value={activityDate}
              onChange={(event) => setActivityDate(event.target.value)}
              disabled={isSubmitting}
              aria-label="Tarikh catatan"
              className="mt-1 rounded-lg border border-transparent bg-transparent p-0 text-sm font-bold text-zinc-100 outline-none focus:border-zinc-700"
            />
          </div>
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1" aria-label="Status kerja hari ini">
            {(['MULA', 'LAKSANA', 'SIAP'] as const).map((button) => {
              const active = dailyButtonState(dailyStatus, button);
              return (
                <button
                  key={button}
                  type="button"
                  onClick={() => setDailyStatus((current) => nextStatus(current, button))}
                  disabled={isSubmitting}
                  aria-pressed={active}
                  className={`min-h-[42px] rounded-lg px-3 text-xs font-bold transition ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200'}`}
                >
                  {button}
                </button>
              );
            })}
          </div>
        </div>
        {dailyStatus === 'MULA_DAN_SIAP' && (
          <div className="mt-2 text-[11px] font-semibold text-emerald-300" data-testid="same-day-start-complete">Mula + Siap hari yang sama</div>
        )}
        {knownStartRequired && (
          <div className="mt-3 max-w-xs">
            <label className="block text-xs font-semibold text-zinc-400">Mula sebenar</label>
            <input type="date" value={knownStartDate} max={activityDate} onChange={(event) => setKnownStartDate(event.target.value)} disabled={isSubmitting} className="mt-1 min-h-[44px] w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100" />
            <p className="mt-1 text-[11px] text-zinc-600">Bukan tarikh mula terancang MSP.</p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 sm:p-5 shadow-lg">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">TAPAK</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-zinc-400">Lokasi</label>
            <input value={location} onChange={(event) => setLocation(event.target.value)} disabled={isSubmitting} placeholder="cth: Aras 2 · Grid 4–8" className="mt-1 min-h-[44px] w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400">Skop</label>
            <select value={contractorScope} onChange={(event) => setContractorScope(event.target.value as 'CONTRACTOR' | 'NSC')} disabled={isSubmitting} className="mt-1 min-h-[44px] w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100">
              <option value="CONTRACTOR">Utama</option>
              <option value="NSC">NSC</option>
            </select>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div><label className="block text-xs font-semibold text-zinc-400">Mula kerja</label><input type="time" value={workStartTime} onChange={(event) => setWorkStartTime(event.target.value)} disabled={isSubmitting} className="mt-1 min-h-[44px] w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100" /></div>
          <div><label className="block text-xs font-semibold text-zinc-400">Tamat kerja</label><input type="time" value={workEndTime} onChange={(event) => setWorkEndTime(event.target.value)} disabled={isSubmitting} className="mt-1 min-h-[44px] w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100" /></div>
        </div>
      </section>

      <WeatherEvidenceSection date={activityDate} value={weather} onChange={setWeather} disabled={isSubmitting} />
      <SmartWorkforceEntry selectedSource={selectedSource} manpower={manpower} onChange={setManpower} disabled={isSubmitting} />

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 sm:p-5 shadow-lg">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">CATATAN</div>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} disabled={isSubmitting} rows={3} placeholder="Catat kerja" className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-sm text-zinc-100" />
      </section>

      {error && <div role="alert" className="rounded-xl border border-red-800/70 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div>}
      {successId && (
        <div data-testid="catat-completion">
          <NgamsoiCompletionRitual savedSiteDiaryId={successId} isEditMode={false} successText="Buku Harian Tapak berjaya disimpan." />
        </div>
      )}

      <button type="submit" disabled={isSubmitting} className="min-h-[50px] w-full rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-lg hover:bg-blue-500 disabled:opacity-50">
        {isSubmitting ? 'Simpan…' : 'Simpan'}
      </button>
    </form>
  );
}
