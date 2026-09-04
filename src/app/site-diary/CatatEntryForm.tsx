'use client';

import React, { FormEvent, useMemo, useRef, useState } from 'react';
import { useDailyEntryContext } from './DailyEntryShell';
import OperationalSourceSelector, { SelectedOperationalSource } from './OperationalSourceSelector';
import PostSaveConfirmation from './PostSaveConfirmation';
import SmartWorkforceEntry from './SmartWorkforceEntry';
import type { ManpowerRow } from './WorkforceEntry';
import WeatherEvidenceSection, { EMPTY_WEATHER_EVIDENCE, WeatherEvidenceValue } from './WeatherEvidenceSection';
import type { SiteDiaryDailyWorkStatus } from '@/types/siteDiary';

type SpineState = 'complete' | 'current' | 'upcoming';

interface CatatEntryFormProps {
  readonly onShowRecords?: () => void;
}

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

function stateFor(step: number, currentStep: number): SpineState {
  if (step < currentStep) return 'complete';
  if (step === currentStep) return 'current';
  return 'upcoming';
}

export default function CatatEntryForm({ onShowRecords = () => undefined }: CatatEntryFormProps) {
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
  const [timeExpanded, setTimeExpanded] = useState(false);
  const [weather, setWeather] = useState<WeatherEvidenceValue>({ ...EMPTY_WEATHER_EVIDENCE });
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

  const currentStep = useMemo(() => {
    if (!selectedSource) return 0;
    if (knownStartRequired && !knownStartDate) return 1;
    if (!location.trim()) return 2;
    if (weather.source === 'AUTO') return 3;
    if (manpower.length === 0 && !notes.trim()) return 4;
    if (!notes.trim()) return 5;
    return 6;
  }, [knownStartDate, knownStartRequired, location, manpower.length, notes, selectedSource, weather.source]);

  const resetForNextActivity = () => {
    setSuccessId(null);
    setSelectedSource(null);
    setDailyStatus('MULA');
    setKnownStartDate('');
    setLocation('');
    setContractorScope('CONTRACTOR');
    setWorkStartTime('08:00');
    setWorkEndTime('17:00');
    setTimeExpanded(false);
    setWeather({ ...EMPTY_WEATHER_EVIDENCE });
    setManpower([]);
    setNotes('');
    setError(null);

    window.requestAnimationFrame(() => {
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      sourceRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      sourceRef.current?.querySelector<HTMLInputElement>('input[type="search"], input[type="text"]')?.focus({ preventScroll: true });
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitLock.current || successId) return;
    setError(null);

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
          : null;
      if (!savedId) throw new Error('ID Buku Harian tidak dapat ditentukan.');
      setSuccessId(savedId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal menyimpan catatan.');
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="ng-catat-flow w-full" aria-label="Borang Buku Harian Tapak" data-entry-mode="CATAT" data-ui-authority="F45">
      <div ref={sourceRef} className="ng-entry-step ng-entry-step--source" data-entry-step="source" data-spine-state={stateFor(0, currentStep)} data-catat-start>
        <OperationalSourceSelector selectedSource={selectedSource} onSelectSource={setSelectedSource} disabled={isSubmitting || Boolean(successId)} />
      </div>

      <div className="ng-entry-step ng-entry-panel" data-entry-step="daily" data-spine-state={stateFor(1, currentStep)}>
        <div className="ng-entry-row ng-entry-row--status">
          <div>
            <div className="ng-entry-heading">HARIAN</div>
            <input type="date" value={activityDate} onChange={(event) => setActivityDate(event.target.value)} disabled={isSubmitting || Boolean(successId)} aria-label="Tarikh catatan" className="ng-entry-date" />
          </div>
          <div className="ng-segmented" aria-label="Status kerja hari ini">
            {(['MULA', 'LAKSANA', 'SIAP'] as const).map((button) => {
              const active = dailyButtonState(dailyStatus, button);
              return <button key={button} type="button" onClick={() => setDailyStatus((current) => nextStatus(current, button))} disabled={isSubmitting || Boolean(successId)} aria-pressed={active}>{button}</button>;
            })}
          </div>
        </div>
        {dailyStatus === 'MULA_DAN_SIAP' && <div className="ng-entry-note ng-entry-note--valid" data-testid="same-day-start-complete">Mula + Siap</div>}
        {knownStartRequired && (
          <div className="ng-entry-field ng-entry-field--compact">
            <label>Mula sebenar</label>
            <input type="date" value={knownStartDate} max={activityDate} onChange={(event) => setKnownStartDate(event.target.value)} disabled={isSubmitting || Boolean(successId)} />
            <small>Bukan tarikh MSP.</small>
          </div>
        )}
      </div>

      <div className="ng-entry-step ng-entry-panel" data-entry-step="site" data-spine-state={stateFor(2, currentStep)}>
        <div className="ng-entry-heading">TAPAK</div>
        <div className="ng-entry-grid ng-entry-grid--site">
          <div className="ng-entry-field">
            <label>Lokasi</label>
            <input value={location} onChange={(event) => setLocation(event.target.value)} disabled={isSubmitting || Boolean(successId)} placeholder="cth: Aras 2 · Grid 4–8" />
          </div>
          <div className="ng-entry-field">
            <label>Skop</label>
            <select value={contractorScope} onChange={(event) => setContractorScope(event.target.value as 'CONTRACTOR' | 'NSC')} disabled={isSubmitting || Boolean(successId)}>
              <option value="CONTRACTOR">Utama</option>
              <option value="NSC">NSC</option>
            </select>
          </div>
        </div>
        <div className="ng-time-summary" data-testid="work-time-summary">
          <span><small>MASA</small><strong>{workStartTime} → {workEndTime}</strong></span>
          <button type="button" onClick={() => setTimeExpanded((current) => !current)} disabled={isSubmitting || Boolean(successId)} aria-expanded={timeExpanded} aria-controls="catat-time-adjustment">{timeExpanded ? 'Tutup' : 'Ubah'}</button>
        </div>
        {timeExpanded && (
          <div id="catat-time-adjustment" className="ng-time-adjustment">
            <div className="ng-entry-field"><label>Mula</label><input type="time" value={workStartTime} onChange={(event) => setWorkStartTime(event.target.value)} disabled={isSubmitting || Boolean(successId)} /></div>
            <div className="ng-entry-field"><label>Tamat</label><input type="time" value={workEndTime} onChange={(event) => setWorkEndTime(event.target.value)} disabled={isSubmitting || Boolean(successId)} /></div>
          </div>
        )}
      </div>

      <div className="ng-entry-step" data-entry-step="weather" data-spine-state={stateFor(3, currentStep)}>
        <WeatherEvidenceSection date={activityDate} value={weather} onChange={setWeather} disabled={isSubmitting || Boolean(successId)} />
      </div>

      <div className="ng-entry-step" data-entry-step="workforce" data-spine-state={stateFor(4, currentStep)}>
        <SmartWorkforceEntry selectedSource={selectedSource} manpower={manpower} onChange={setManpower} disabled={isSubmitting || Boolean(successId)} />
      </div>

      <div className="ng-entry-step ng-entry-panel" data-entry-step="notes" data-spine-state={stateFor(5, currentStep)}>
        <div className="ng-entry-heading">CATATAN</div>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} disabled={isSubmitting || Boolean(successId)} rows={3} placeholder="Catat kerja" />
      </div>

      {error && <div role="alert" className="ng-entry-alert">{error}</div>}

      {!successId && (
        <div className="ng-entry-step ng-entry-step--save" data-entry-step="save" data-spine-state={stateFor(6, currentStep)}>
          <button type="submit" disabled={isSubmitting} className="ng-save-action">{isSubmitting ? 'Simpan…' : 'Simpan'}</button>
        </div>
      )}

      {successId && (
        <PostSaveConfirmation
          savedSiteDiaryId={successId}
          successText="Buku Harian Tapak berjaya disimpan."
          onShowRecords={onShowRecords}
          onAddActivity={resetForNextActivity}
        />
      )}
    </form>
  );
}
