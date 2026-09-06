'use client';

import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDailyEntryContext } from './DailyEntryShell';
import SmartWorkforceEntry from './SmartWorkforceEntry';
import WeatherEvidenceSection, { EMPTY_WEATHER_EVIDENCE, WeatherEvidenceValue } from './WeatherEvidenceSection';
import { operationalSourceLabel } from './sourcePresentation';
import type { Activity } from '@/types/activity';
import type {
  SiteDiary,
  SiteDiaryContractorScope,
  SiteDiaryDailyWorkStatus,
  SiteDiaryManpower,
  SiteDiaryPrintContext,
} from '@/types/siteDiary';
import type { SiteDiaryManagementProjection } from '@/types/siteDiaryManagement';

const FALLBACK = 'Tidak tersedia';

function responseMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;
  const error = (body as Record<string, unknown>).error;
  return typeof error === 'string' && error.trim() ? error : fallback;
}

function normalizedIntervals(context: SiteDiaryPrintContext) {
  if (Array.isArray(context.rain_intervals)) return context.rain_intervals.map((item) => ({ ...item }));
  if (context.rain_start_time && context.rain_end_time) {
    return [{ start: context.rain_start_time, end: context.rain_end_time === '23:59' ? '24:00' : context.rain_end_time }];
  }
  return [];
}

export function weatherEvidenceFromPrintContext(context: SiteDiaryPrintContext): WeatherEvidenceValue {
  return {
    condition: context.weather_condition ?? EMPTY_WEATHER_EVIDENCE.condition,
    intervals: normalizedIntervals(context),
    suggestedIntervals: Array.isArray(context.weather_suggested_intervals)
      ? context.weather_suggested_intervals.map((item) => ({ ...item }))
      : [],
    source: context.weather_source ?? 'MANUAL',
    provider: context.weather_provider ?? null,
    fetchedAt: context.weather_provider_fetched_at ?? null,
    latitude: context.weather_latitude ?? null,
    longitude: context.weather_longitude ?? null,
    timezone: context.weather_timezone ?? 'Asia/Kuala_Lumpur',
  };
}

export interface RecordsEditPatchInput {
  readonly expectedLastModifiedAt: string;
  readonly notes: string;
  readonly manpower: SiteDiaryManpower[];
  readonly originalPrintContext: SiteDiaryPrintContext;
  readonly location: string;
  readonly workStartTime: string;
  readonly workEndTime: string;
  readonly contractorScope: SiteDiaryContractorScope;
  readonly weather: WeatherEvidenceValue;
  readonly weatherTouched: boolean;
}

export function buildRecordsEditPatch(input: RecordsEditPatchInput) {
  const printContext: SiteDiaryPrintContext = {
    ...input.originalPrintContext,
    location: input.location.trim(),
    work_start_time: input.workStartTime.trim() || null,
    work_end_time: input.workEndTime.trim() || null,
    contractor_scope: input.contractorScope,
  };

  if (input.weatherTouched) {
    const first = input.weather.intervals[0] ?? null;
    printContext.weather_condition = input.weather.condition;
    printContext.rain_intervals = input.weather.intervals.map((item) => ({ ...item }));
    printContext.weather_suggested_intervals = input.weather.suggestedIntervals.map((item) => ({ ...item }));
    printContext.weather_source = input.weather.source;
    printContext.weather_provider = input.weather.provider;
    printContext.weather_provider_fetched_at = input.weather.fetchedAt;
    printContext.weather_provider_resolution = input.weather.provider
      ? (input.originalPrintContext.weather_provider_resolution ?? 'HOURLY')
      : null;
    printContext.weather_latitude = input.weather.latitude;
    printContext.weather_longitude = input.weather.longitude;
    printContext.weather_timezone = input.weather.timezone;
    printContext.rain_start_time = first?.start ?? null;
    printContext.rain_end_time = first?.end === '24:00' ? '23:59' : (first?.end ?? null);
  }

  return {
    expected_last_modified_at: input.expectedLastModifiedAt,
    notes: input.notes.trim(),
    manpower: input.manpower.map((row) => ({ ...row })),
    print_context: printContext,
  };
}

function displayDailyStatus(value: SiteDiaryDailyWorkStatus | null): string {
  if (!value) return FALLBACK;
  if (value === 'MULA_DAN_SIAP') return 'MULA + SIAP';
  return value;
}

function readOnlyFact(label: string, value: string, testId?: string) {
  return (
    <div className="ng-record-edit-fact" data-testid={testId}>
      <span className="ng-record-edit-fact__label">{label}</span>
      <strong>{value || FALLBACK}</strong>
    </div>
  );
}

export interface RecordsEditFormProps {
  readonly projection: SiteDiaryManagementProjection;
  readonly onCancel: () => void;
  readonly onSuccess: () => void;
}

export default function RecordsEditForm({ projection, onCancel, onSuccess }: RecordsEditFormProps) {
  const { programmeId, revisionId } = useDailyEntryContext();
  const [detail, setDetail] = useState<SiteDiary | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [originalPrintContext, setOriginalPrintContext] = useState<SiteDiaryPrintContext | null>(null);
  const [expectedLastModifiedAt, setExpectedLastModifiedAt] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [contractorScope, setContractorScope] = useState<SiteDiaryContractorScope>('CONTRACTOR');
  const [workStartTime, setWorkStartTime] = useState('');
  const [workEndTime, setWorkEndTime] = useState('');
  const [timeExpanded, setTimeExpanded] = useState(false);
  const [weather, setWeather] = useState<WeatherEvidenceValue>({ ...EMPTY_WEATHER_EVIDENCE });
  const [weatherPresent, setWeatherPresent] = useState(false);
  const [weatherTouched, setWeatherTouched] = useState(false);
  const [manpower, setManpower] = useState<SiteDiaryManpower[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const submitLockRef = useRef(false);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const generation = ++generationRef.current;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const [diaryResponse, activityResponse] = await Promise.all([
        fetch(`/api/site-diary/${encodeURIComponent(projection.siteDiaryId)}`, { signal: controller.signal }),
        fetch(`/api/activity/${encodeURIComponent(projection.activityId)}`, { signal: controller.signal }),
      ]);
      if (generation !== generationRef.current) return;
      if (!diaryResponse.ok) {
        const body = await diaryResponse.json().catch(() => null);
        throw new Error(responseMessage(body, 'Gagal memuatkan rekod untuk suntingan.'));
      }
      if (!activityResponse.ok) {
        const body = await activityResponse.json().catch(() => null);
        throw new Error(responseMessage(body, 'Gagal memuatkan fakta Aktiviti untuk suntingan.'));
      }

      const [diaryBody, activityBody] = await Promise.all([diaryResponse.json(), activityResponse.json()]);
      if (generation !== generationRef.current) return;
      const nextDetail = diaryBody?.data as SiteDiary | null;
      const nextActivity = activityBody?.data as Activity | null;
      if (!nextDetail || !nextActivity) throw new Error('Rekod atau Aktiviti tidak ditemui.');

      if (
        nextDetail.site_diary_id !== projection.siteDiaryId
        || nextDetail.activity_id !== projection.activityId
        || nextDetail.programme_id !== projection.programmeId
        || nextDetail.revision_id !== projection.revisionId
        || nextActivity.activity_id !== projection.activityId
        || nextActivity.programme_id !== projection.programmeId
        || nextActivity.revision_id !== projection.revisionId
        || (programmeId && nextDetail.programme_id !== programmeId)
        || (revisionId && nextDetail.revision_id !== revisionId)
      ) {
        throw new Error('Identiti rekod suntingan tidak sepadan. Suntingan ditutup untuk keselamatan.');
      }

      const context = nextDetail.print_context;
      if (!context) {
        throw new Error('Konteks rekod tersimpan tidak lengkap. Muat semula atau semak rekod sebelum menyunting.');
      }
      const token = nextDetail.updated_at ?? nextDetail.submitted_at;
      if (!token) throw new Error('Token suntingan rekod tidak tersedia.');

      setDetail(nextDetail);
      setActivity(nextActivity);
      setOriginalPrintContext({ ...context });
      setExpectedLastModifiedAt(token);
      setLocation(context.location ?? '');
      setContractorScope(context.contractor_scope);
      setWorkStartTime(context.work_start_time ?? '');
      setWorkEndTime(context.work_end_time ?? '');
      setManpower(Array.isArray(nextDetail.manpower) ? nextDetail.manpower.map((row) => ({ ...row })) : []);
      setNotes(nextDetail.notes ?? '');
      setWeather(weatherEvidenceFromPrintContext(context));
      setWeatherPresent(context.weather_condition !== null);
      setWeatherTouched(false);
      setTimeExpanded(false);
    } catch (reason: unknown) {
      if (generation !== generationRef.current || controller.signal.aborted) return;
      setDetail(null);
      setActivity(null);
      setOriginalPrintContext(null);
      setExpectedLastModifiedAt(null);
      setError(reason instanceof Error ? reason.message : 'Gagal memuatkan rekod untuk suntingan.');
    } finally {
      if (generation === generationRef.current) setLoading(false);
    }
  }, [programmeId, projection, revisionId]);

  useEffect(() => {
    void load();
    return () => {
      abortRef.current?.abort();
      ++generationRef.current;
    };
  }, [load]);

  const dailyStatus = useMemo<SiteDiaryDailyWorkStatus | null>(() => {
    if (!detail) return null;
    return detail.daily_work_status ?? detail.print_context?.daily_work_status ?? null;
  }, [detail]);

  const handleWeatherChange = (next: WeatherEvidenceValue) => {
    setWeather(next);
    setWeatherPresent(true);
    setWeatherTouched(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitLockRef.current || !detail || !activity || !originalPrintContext || !expectedLastModifiedAt) return;
    setError(null);
    setSuccess(null);
    if (!notes.trim()) {
      setError('Catatan kerja diperlukan.');
      return;
    }

    submitLockRef.current = true;
    setSubmitting(true);
    try {
      const payload = buildRecordsEditPatch({
        expectedLastModifiedAt,
        notes,
        manpower,
        originalPrintContext,
        location,
        workStartTime,
        workEndTime,
        contractorScope,
        weather,
        weatherTouched,
      });
      const response = await fetch(`/api/site-diary/${encodeURIComponent(detail.site_diary_id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => null);
      if (response.status === 409) {
        throw new Error('Rekod ini telah dikemaskini oleh pengguna lain. Muat semula rekod sebelum menyimpan perubahan.');
      }
      if (!response.ok) throw new Error(responseMessage(body, 'Gagal menyimpan perubahan rekod.'));
      if (body?.data?.site_diary_id && body.data.site_diary_id !== detail.site_diary_id) {
        throw new Error('Identiti rekod selepas suntingan tidak sepadan.');
      }
      setSuccess('Perubahan disimpan.');
      onSuccess();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Gagal menyimpan perubahan rekod.');
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div role="status" data-record-edit-state="loading" className="ng-record-edit-state">Memuatkan rekod untuk suntingan...</div>;
  }
  if (error && !detail) {
    return <div role="alert" data-record-edit-state="error" className="ng-record-edit-state"><p>{error}</p><div className="ng-record-edit-state__actions"><button type="button" onClick={load}>Cuba Semula</button><button type="button" onClick={onCancel}>← Kembali ke Butiran</button></div></div>;
  }
  if (!detail || !activity || !originalPrintContext || !expectedLastModifiedAt) return null;

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Edit Rekod Buku Harian Tapak"
      data-ui-context="RECORDS_EDIT_R2A"
      className="ng-record-edit-r2a"
    >
      <div className="ng-record-edit-toolbar">
        <button type="button" onClick={onCancel} disabled={submitting} aria-label="Batal dan kembali ke butiran">← Batal · Kembali ke Butiran</button>
        <span>SUNTING REKOD</span>
      </div>

      <section className="ng-entry-panel ng-record-edit-source" data-record-edit-section="source">
        <div className="ng-entry-heading">SUMBER</div>
        <div className="ng-record-edit-source__meta">{operationalSourceLabel(projection.sourceType)} · {projection.sourceReference || FALLBACK}</div>
        <strong className="ng-record-edit-source__title">{projection.activityTitle || FALLBACK}</strong>
        <div className="ng-entry-meta">Identiti sumber dikekalkan dan tidak boleh ditukar semasa sunting rekod.</div>
      </section>

      <section className="ng-entry-panel" data-record-edit-section="daily">
        <div className="ng-entry-heading">HARIAN</div>
        <div className="ng-record-edit-facts">
          {readOnlyFact('TARIKH', detail.activity_date, 'record-edit-date')}
          {readOnlyFact('MULA SEBENAR', activity.actual_start_date ?? FALLBACK, 'record-edit-actual-start')}
          {readOnlyFact('STATUS', displayDailyStatus(dailyStatus), 'record-edit-daily-status')}
        </div>
        <div className="ng-entry-meta">Fakta harian dikunci kepada rekod tersimpan; suntingan ini tidak mengubah kitar hayat Aktiviti.</div>
      </section>

      <section className="ng-entry-panel" data-record-edit-section="site">
        <div className="ng-entry-heading">TAPAK</div>
        <div className="ng-entry-grid ng-entry-grid--site">
          <div className="ng-entry-field">
            <label htmlFor="record-edit-location">Lokasi</label>
            <input id="record-edit-location" value={location} onChange={(event) => setLocation(event.target.value)} disabled={submitting} />
          </div>
          <div className="ng-entry-field">
            <label htmlFor="record-edit-pelaksana">PELAKSANA</label>
            <select id="record-edit-pelaksana" value={contractorScope} onChange={(event) => setContractorScope(event.target.value as SiteDiaryContractorScope)} disabled={submitting}>
              <option value="CONTRACTOR">Kontraktor Utama</option>
              <option value="NSC">NSC</option>
            </select>
          </div>
        </div>
        <div className="ng-time-summary" data-testid="record-edit-work-time-summary">
          <span><small>MASA</small><strong>{workStartTime || '—'} → {workEndTime || '—'}</strong></span>
          <button type="button" onClick={() => setTimeExpanded((current) => !current)} disabled={submitting} aria-expanded={timeExpanded} aria-controls="record-edit-time-adjustment">{timeExpanded ? 'Tutup' : 'Ubah'}</button>
        </div>
        {timeExpanded && (
          <div id="record-edit-time-adjustment" className="ng-time-adjustment">
            <div className="ng-entry-field"><label htmlFor="record-edit-time-start">Mula</label><input id="record-edit-time-start" type="time" value={workStartTime} onChange={(event) => setWorkStartTime(event.target.value)} disabled={submitting} /></div>
            <div className="ng-entry-field"><label htmlFor="record-edit-time-end">Tamat</label><input id="record-edit-time-end" type="time" value={workEndTime} onChange={(event) => setWorkEndTime(event.target.value)} disabled={submitting} /></div>
          </div>
        )}
      </section>

      {weatherPresent ? (
        <div data-record-edit-section="weather">
          <WeatherEvidenceSection date={detail.activity_date} value={weather} onChange={handleWeatherChange} disabled={submitting} initializationMode="PRESERVE" />
        </div>
      ) : (
        <section className="ng-entry-panel" data-record-edit-section="weather-empty">
          <div className="ng-entry-heading">CUACA</div>
          <div className="ng-weather-evidence__value">Tidak tersedia</div>
          <div className="ng-entry-meta">Tiada bukti cuaca tersimpan. Rekod tidak akan diisi secara automatik.</div>
          <button type="button" className="ng-record-edit-weather-start" disabled={submitting} onClick={() => {
            setWeather({ ...EMPTY_WEATHER_EVIDENCE });
            setWeatherPresent(true);
            setWeatherTouched(true);
          }}>Tetapkan cuaca</button>
        </section>
      )}

      <div data-record-edit-section="workforce">
        <SmartWorkforceEntry
          selectedSource={null}
          manpower={manpower}
          onChange={setManpower}
          disabled={submitting}
          helperOverride="Rekod tenaga kerja tersimpan"
          observeSpine={false}
        />
      </div>

      <section className="ng-entry-panel" data-record-edit-section="notes">
        <div className="ng-entry-heading">CATATAN</div>
        <textarea aria-label="Catatan rekod" required rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} disabled={submitting} placeholder="Catat kerja" />
      </section>

      {error && <div role="alert" className="ng-record-edit-message ng-record-edit-message--error">{error}</div>}
      {success && <div role="status" className="ng-record-edit-message">{success}</div>}

      <div className="ng-record-edit-actions">
        <button type="button" onClick={onCancel} disabled={submitting}>Batal</button>
        <button type="submit" disabled={submitting}>{submitting ? 'Menyimpan…' : 'Simpan Perubahan'}</button>
      </div>
    </form>
  );
}
