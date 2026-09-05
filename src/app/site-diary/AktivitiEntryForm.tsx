'use client';

import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ActivityStatus } from '@/types/activity';
import type { SiteDiary, SiteDiaryDailyWorkStatus } from '@/types/siteDiary';
import { useDailyEntryContext } from './DailyEntryShell';
import OpenActivitiesList from './OpenActivitiesList';
import PostSaveConfirmation from './PostSaveConfirmation';
import SmartWorkforceEntry from './SmartWorkforceEntry';
import type { SelectedOperationalSource } from './OperationalSourceSelector';
import type { ManpowerRow } from './WorkforceEntry';
import WeatherEvidenceSection, { EMPTY_WEATHER_EVIDENCE, type WeatherEvidenceValue } from './WeatherEvidenceSection';

type SpineState = 'complete' | 'current' | 'upcoming';

interface AktivitiEntryFormProps {
  readonly onShowRecords?: () => void;
  readonly onAddActivity?: () => void;
}

interface ActivityRecord {
  readonly activity_id: string;
  readonly programme_id: string;
  readonly revision_id: string;
  readonly source_type?: 'MSP' | 'VO';
  readonly task_id?: string | null;
  readonly vo_item_id?: string | null;
  readonly subtask?: string | null;
  readonly subtask_display_name?: string | null;
  readonly status: ActivityStatus | 'New' | 'In Progress' | 'Completed';
  readonly actual_start_date?: string | null;
  readonly completed_date?: string | null;
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function safeError(response: Response, fallback: string): Promise<string> {
  return response.json().catch(() => null).then((body) =>
    body && typeof body.error === 'string' && body.error.trim() ? body.error : fallback,
  );
}

function statusPressed(status: SiteDiaryDailyWorkStatus, button: 'MULA' | 'LAKSANA' | 'SIAP'): boolean {
  if (button === 'MULA') return status === 'MULA' || status === 'MULA_DAN_SIAP';
  if (button === 'SIAP') return status === 'SIAP' || status === 'MULA_DAN_SIAP';
  return status === 'LAKSANA';
}

function nextDailyStatus(current: SiteDiaryDailyWorkStatus, button: 'MULA' | 'LAKSANA' | 'SIAP'): SiteDiaryDailyWorkStatus {
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

function sourceFromActivity(activity: ActivityRecord): SelectedOperationalSource | null {
  const title = activity.subtask_display_name || activity.subtask || 'Aktiviti';
  if (activity.source_type === 'VO' && activity.vo_item_id) return { sourceType: 'VO', id: activity.vo_item_id, title };
  if ((activity.source_type === 'MSP' || !activity.source_type) && activity.task_id) return { sourceType: 'MSP', id: activity.task_id, title };
  return null;
}

function stateFor(step: number, currentStep: number): SpineState {
  if (step < currentStep) return 'complete';
  if (step === currentStep) return 'current';
  return 'upcoming';
}

export default function AktivitiEntryForm({
  onShowRecords = () => undefined,
  onAddActivity = () => undefined,
}: AktivitiEntryFormProps) {
  const { programmeId, revisionId } = useDailyEntryContext();
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityRecord | null>(null);
  const [activityDate, setActivityDate] = useState(todayIso);
  const [dailyStatus, setDailyStatus] = useState<SiteDiaryDailyWorkStatus>('LAKSANA');
  const [knownStartDate, setKnownStartDate] = useState('');
  const [location, setLocation] = useState('');
  const [contractorScope, setContractorScope] = useState<'CONTRACTOR' | 'NSC'>('CONTRACTOR');
  const [workStartTime, setWorkStartTime] = useState('08:00');
  const [workEndTime, setWorkEndTime] = useState('17:00');
  const [timeExpanded, setTimeExpanded] = useState(false);
  const [weather, setWeather] = useState<WeatherEvidenceValue>({ ...EMPTY_WEATHER_EVIDENCE });
  const [manpower, setManpower] = useState<ManpowerRow[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [listVersion, setListVersion] = useState(0);
  const generationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const submitLockRef = useRef(false);

  const selectedSource = useMemo(() => activity ? sourceFromActivity(activity) : null, [activity]);
  const canonicalActualStart = activity?.actual_start_date?.trim() || '';
  const actualStartRequired = Boolean(activity) && !canonicalActualStart && (dailyStatus === 'LAKSANA' || dailyStatus === 'SIAP');
  const actualStartDate = canonicalActualStart || (dailyStatus === 'MULA' || dailyStatus === 'MULA_DAN_SIAP' ? activityDate : knownStartDate);
  const activeManpower = useMemo(
    () => manpower.filter((row) => row.bumi_count + row.non_bumi_count + row.foreign_count > 0),
    [manpower],
  );

  const currentStep = useMemo(() => {
    if (!selectedSource) return 0;
    if (actualStartRequired && !knownStartDate) return 1;
    if (!location.trim()) return 2;
    if (weather.source === 'AUTO') return 3;
    if (manpower.length === 0 && !notes.trim()) return 4;
    if (!notes.trim()) return 5;
    return 6;
  }, [actualStartRequired, knownStartDate, location, manpower.length, notes, selectedSource, weather.source]);

  const invalidate = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    generationRef.current += 1;
    setSelectedActivityId(null);
    setActivity(null);
    setActivityDate(todayIso());
    setDailyStatus('LAKSANA');
    setKnownStartDate('');
    setLocation('');
    setContractorScope('CONTRACTOR');
    setWorkStartTime('08:00');
    setWorkEndTime('17:00');
    setTimeExpanded(false);
    setWeather({ ...EMPTY_WEATHER_EVIDENCE });
    setManpower([]);
    setNotes('');
    setLoading(false);
    setError(null);
    setSuccessId(null);
  }, []);

  useEffect(() => {
    invalidate();
    return () => {
      abortRef.current?.abort();
      generationRef.current += 1;
    };
  }, [programmeId, revisionId, invalidate]);

  const loadActivity = useCallback(async (activityId: string, targetDate: string) => {
    abortRef.current?.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;
    const generation = ++generationRef.current;
    const owns = () => generation === generationRef.current && !abortController.signal.aborted;

    setSelectedActivityId(activityId);
    setActivity(null);
    setLoading(true);
    setError(null);
    setSuccessId(null);
    setDailyStatus('LAKSANA');
    setKnownStartDate('');
    setLocation('');
    setContractorScope('CONTRACTOR');
    setWorkStartTime('08:00');
    setWorkEndTime('17:00');
    setTimeExpanded(false);
    setWeather({ ...EMPTY_WEATHER_EVIDENCE });
    setManpower([]);
    setNotes('');

    try {
      const activityResponse = await fetch(`/api/activity/${encodeURIComponent(activityId)}`, { signal: abortController.signal });
      if (!activityResponse.ok) throw new Error(await safeError(activityResponse, 'Gagal memuatkan aktiviti.'));
      const activityBody = await activityResponse.json();
      const record = activityBody?.data as ActivityRecord | undefined;
      if (!record || record.activity_id !== activityId) throw new Error('Identiti aktiviti tidak sah.');
      if (record.programme_id !== programmeId) throw new Error('Aktiviti bukan milik projek semasa.');
      if (revisionId && record.revision_id !== revisionId) throw new Error('Aktiviti bukan milik Program Kerja semasa.');
      if (record.status === 'Completed') throw new Error('Aktiviti ini telah selesai dan tidak boleh diteruskan.');
      if (!owns()) return;

      setActivity(record);
      setDailyStatus(record.status === 'New' ? 'MULA' : 'LAKSANA');
      setKnownStartDate(record.actual_start_date || '');

      const diariesResponse = await fetch(`/api/site-diary/activity/${encodeURIComponent(activityId)}`, { signal: abortController.signal });
      if (!diariesResponse.ok) {
        if (diariesResponse.status !== 404) throw new Error(await safeError(diariesResponse, 'Gagal memuatkan catatan terdahulu.'));
        return;
      }
      const diariesBody = await diariesResponse.json();
      if (!owns()) return;
      const diaries: SiteDiary[] = Array.isArray(diariesBody?.data) ? diariesBody.data : [];
      const latestPrior = diaries
        .filter((diary) => diary.activity_date < targetDate)
        .sort((a, b) => b.activity_date.localeCompare(a.activity_date))[0];

      if (latestPrior?.print_context?.location) setLocation(latestPrior.print_context.location);
      if (latestPrior?.print_context?.contractor_scope) setContractorScope(latestPrior.print_context.contractor_scope);
      if (Array.isArray(latestPrior?.manpower)) setManpower(latestPrior.manpower.map((row) => ({ ...row })));
    } catch (caught) {
      if (abortController.signal.aborted || !owns()) return;
      setError(caught instanceof Error ? caught.message : 'Gagal memuatkan aktiviti.');
      setActivity(null);
    } finally {
      if (owns()) setLoading(false);
    }
  }, [programmeId, revisionId]);

  const returnToList = () => {
    setListVersion((current) => current + 1);
    invalidate();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitLockRef.current || successId || !activity || !selectedActivityId) return;
    setError(null);

    if (!programmeId || !revisionId) return setError('Program Kerja semasa belum tersedia.');
    if (!activityDate) return setError('Tarikh catatan diperlukan.');
    if (actualStartRequired && !knownStartDate) return setError('Tarikh mula sebenar diperlukan.');
    if (!actualStartDate) return setError('Tarikh mula sebenar tidak tersedia.');
    if (!location.trim()) return setError('Lokasi kerja diperlukan.');
    if (!notes.trim()) return setError('Catatan kerja diperlukan.');
    if (weather.source === 'AUTO') return setError('Sahkan atau ubah cadangan cuaca dahulu.');

    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      const latestResponse = await fetch(`/api/activity/${encodeURIComponent(selectedActivityId)}`);
      if (!latestResponse.ok) throw new Error(await safeError(latestResponse, 'Gagal menyemak status terkini aktiviti.'));
      const latestBody = await latestResponse.json();
      const latest = latestBody?.data as ActivityRecord | undefined;
      if (!latest || latest.activity_id !== selectedActivityId || latest.programme_id !== programmeId || latest.revision_id !== revisionId) {
        throw new Error('Konteks aktiviti telah berubah. Muat semula Aktiviti.');
      }
      if (latest.status === 'Completed') throw new Error('Aktiviti ini telah selesai dan tidak boleh diteruskan.');

      const completesToday = dailyStatus === 'SIAP' || dailyStatus === 'MULA_DAN_SIAP';
      const latestActualStart = latest.actual_start_date?.trim() || actualStartDate;

      if (completesToday) {
        const response = await fetch(`/api/activities/${encodeURIComponent(selectedActivityId)}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actualStartDate: latestActualStart, completedDate: activityDate }),
        });
        if (!response.ok) throw new Error(await safeError(response, 'Gagal menyiapkan aktiviti.'));
      } else if (latest.status === 'New') {
        const response = await fetch(`/api/activities/${encodeURIComponent(selectedActivityId)}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actualStartDate: latestActualStart }),
        });
        if (!response.ok) throw new Error(await safeError(response, 'Gagal memulakan aktiviti.'));
      }

      const firstRain = weather.intervals[0] ?? null;
      const diaryResponse = await fetch('/api/site-diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programme_id: programmeId,
          revision_id: revisionId,
          activity_id: selectedActivityId,
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
      if (!diaryResponse.ok) throw new Error(await safeError(diaryResponse, 'Gagal menyimpan catatan lanjutan.'));
      const diaryBody = await diaryResponse.json();
      const savedId = typeof diaryBody?.data?.site_diary_id === 'string'
        ? diaryBody.data.site_diary_id
        : typeof diaryBody?.data?.siteDiaryId === 'string'
          ? diaryBody.data.siteDiaryId
          : null;
      if (!savedId) throw new Error('ID Buku Harian tidak dapat ditentukan.');
      setSuccessId(savedId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal menyimpan catatan lanjutan.');
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (!selectedActivityId) {
    return (
      <OpenActivitiesList
        key={`${programmeId ?? 'none'}-${listVersion}`}
        programmeId={programmeId}
        onSelectActivity={(activityId) => void loadActivity(activityId, activityDate)}
        onCreateNewActivity={() => undefined}
        showCreateNewActivity={false}
      />
    );
  }

  if (loading) return <div role="status" className="ng-entry-empty">Memuat aktiviti…</div>;

  if (!activity) {
    return (
      <div className="space-y-3">
        {error && <div role="alert" className="ng-entry-alert">{error}</div>}
        <button type="button" onClick={returnToList} className="ng-secondary-action">Kembali</button>
      </div>
    );
  }

  const isInProgress = activity.status === 'In Progress';

  return (
    <form onSubmit={handleSubmit} className="ng-catat-flow w-full" aria-label="Borang Buku Harian Tapak" data-entry-mode="AKTIVITI" data-ui-authority="F45">
      <div className="ng-entry-step ng-entry-panel ng-entry-panel--source" data-entry-step="source" data-spine-state={stateFor(0, currentStep)}>
        <div className="ng-entry-row">
          <div className="min-w-0">
            <div className="ng-entry-heading">SUMBER</div>
            <div className="ng-source-title" title={activity.subtask_display_name || activity.subtask || 'Aktiviti'}>{activity.subtask_display_name || activity.subtask || 'Aktiviti'}</div>
            <div className="ng-entry-meta">{activity.source_type === 'VO' ? 'VO' : 'MSP'} · {isInProgress ? 'Laksana' : 'Mula'}</div>
          </div>
          <button type="button" onClick={returnToList} disabled={isSubmitting || Boolean(successId)} className="ng-secondary-action">Tukar</button>
        </div>
      </div>

      <div className="ng-entry-step ng-entry-panel" data-entry-step="daily" data-spine-state={stateFor(1, currentStep)}>
        <div className="ng-entry-row ng-entry-row--status">
          <div>
            <div className="ng-entry-heading">HARIAN</div>
            <input type="date" value={activityDate} onChange={(event) => setActivityDate(event.target.value)} disabled={isSubmitting || Boolean(successId)} aria-label="Tarikh catatan" className="ng-entry-date" />
          </div>
          <div className="ng-segmented" aria-label="Status kerja hari ini">
            {(['MULA', 'LAKSANA', 'SIAP'] as const).map((button) => {
              const disabledByLifecycle = isInProgress && button === 'MULA';
              const active = statusPressed(dailyStatus, button);
              return <button key={button} type="button" onClick={() => setDailyStatus((current) => nextDailyStatus(current, button))} disabled={isSubmitting || Boolean(successId) || disabledByLifecycle} aria-pressed={active}>{button}</button>;
            })}
          </div>
        </div>
        {canonicalActualStart ? (
          <div className="ng-entry-meta">Mula sebenar · <strong>{canonicalActualStart}</strong></div>
        ) : actualStartRequired ? (
          <div className="ng-entry-field ng-entry-field--compact">
            <label>Mula sebenar</label>
            <input type="date" value={knownStartDate} max={activityDate} onChange={(event) => setKnownStartDate(event.target.value)} disabled={isSubmitting || Boolean(successId)} />
            <small>Tarikh sebenar kerja mula di tapak.</small>
          </div>
        ) : null}
      </div>

      <div className="ng-entry-step ng-entry-panel" data-entry-step="site" data-spine-state={stateFor(2, currentStep)}>
        <div className="ng-entry-heading">TAPAK</div>
        <div className="ng-entry-grid ng-entry-grid--site">
          <div className="ng-entry-field"><label>Lokasi</label><input value={location} onChange={(event) => setLocation(event.target.value)} disabled={isSubmitting || Boolean(successId)} /></div>
          <div className="ng-entry-field"><label>PELAKSANA</label><select value={contractorScope} onChange={(event) => setContractorScope(event.target.value as 'CONTRACTOR' | 'NSC')} disabled={isSubmitting || Boolean(successId)}><option value="CONTRACTOR">Kontraktor Utama</option><option value="NSC">NSC</option></select></div>
        </div>
        <div className="ng-time-summary" data-testid="work-time-summary">
          <span><small>MASA</small><strong>{workStartTime} → {workEndTime}</strong></span>
          <button type="button" onClick={() => setTimeExpanded((current) => !current)} disabled={isSubmitting || Boolean(successId)} aria-expanded={timeExpanded} aria-controls="aktiviti-time-adjustment">{timeExpanded ? 'Tutup' : 'Ubah'}</button>
        </div>
        {timeExpanded && (
          <div id="aktiviti-time-adjustment" className="ng-time-adjustment">
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
          successText="Catatan lanjutan berjaya disimpan."
          onShowRecords={onShowRecords}
          onAddActivity={onAddActivity}
        />
      )}
    </form>
  );
}
