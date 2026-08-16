'use client';

import React, { useState, useEffect, useCallback, useRef, FormEvent } from 'react';
import { useDailyEntryContext } from './DailyEntryShell';
import OperationalSourceSelector, { SelectedOperationalSource } from './OperationalSourceSelector';
import WorkforceEntry, { ManpowerRow, COMMON_TRADES_CATALOG } from './WorkforceEntry';
import DailyEntryFeedback from './DailyEntryFeedback';

export type { ManpowerRow };

export interface PrintContextData {
  location: string;
  work_start_time: string | null;
  work_end_time: string | null;
  weather_condition: 'ELOK' | 'HUJAN' | 'MENDUNG' | 'RIBUT';
  rain_start_time: string | null;
  rain_end_time: string | null;
  contractor_scope: 'CONTRACTOR' | 'NSC';
}

export interface DailyEntryFormProps {
  initialSiteDiaryId?: string | null;
  initialActivityId?: string | null;
  onSuccess?: (siteDiaryId: string) => void;
  className?: string;
}

const DEFAULT_TRADES = COMMON_TRADES_CATALOG.slice(0, 9);

export interface SubmitDailyEntryParams {
  programmeId: string;
  revisionId: string;
  selectedSource: SelectedOperationalSource | null;
  activityDate: string;
  actualStartDate: string;
  workStatus: 'Sedang Laksana' | 'Siap';
  location: string;
  workStartTime: string;
  workEndTime: string;
  weatherCondition: 'ELOK' | 'HUJAN' | 'MENDUNG' | 'RIBUT';
  rainStartTime: string;
  rainEndTime: string;
  contractorScope: 'CONTRACTOR' | 'NSC';
  notes: string;
  manpower: ManpowerRow[];
  editingSiteDiaryId?: string | null;
  editingActivityId?: string | null;
  fetchFn?: typeof fetch;
}

export async function submitDailyEntry(params: SubmitDailyEntryParams): Promise<{ siteDiaryId: string; activityId: string }> {
  const fetcher = params.fetchFn || (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);

  // 1. Client-Side Field Validation
  if (!params.programmeId || !params.revisionId) {
    throw new Error('Sila pastikan Program dan Semakan Projek sah dipilih.');
  }

  if (!params.editingActivityId && !params.selectedSource) {
    throw new Error('Sila pilih Sumber Aktiviti (Kerja Jadual MSP atau Kerja VO).');
  }

  if (!params.activityDate) {
    throw new Error('Tarikh Laporan Harian adalah wajib.');
  }

  if (!params.actualStartDate) {
    throw new Error('Tarikh Mula Sebenar (Known Start Date) adalah wajib.');
  }

  if (!params.location || !params.location.trim()) {
    throw new Error('Lokasi terperinci / Grid line adalah wajib.');
  }

  if (!params.notes || !params.notes.trim()) {
    throw new Error('Sila masukkan Catatan Kemajuan Kerja.');
  }

  let resolvedActivityId = params.editingActivityId ?? null;

  // 2. Establish Activity if creating a new entry
  if (!resolvedActivityId && params.selectedSource) {
    const createActivityPayload: Record<string, unknown> = {
      programmeId: params.programmeId,
      revisionId: params.revisionId,
      sourceType: params.selectedSource.sourceType,
      activityName: params.selectedSource.title,
    };

    if (params.selectedSource.sourceType === 'MSP') {
      createActivityPayload.taskId = params.selectedSource.id;
    } else {
      createActivityPayload.voItemId = params.selectedSource.id;
    }

    const actRes = await fetcher('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createActivityPayload),
    });

    if (actRes.status === 401) {
      throw new Error('Sesi telah tamat atau pengguna tidak disahkan. Sila log masuk semula.');
    }

    if (!actRes.ok) {
      const errJson = await actRes.json().catch(() => null);
      throw new Error(errJson?.error || 'Gagal mendaftar aktiviti baharu');
    }

    const actJson = await actRes.json();
    resolvedActivityId = actJson?.data?.activityId ?? null;
  }

  if (!resolvedActivityId) {
    throw new Error('ID Aktiviti tidak dapat ditentukan.');
  }

  // 3. Lifecycle Transition Orchestration (only when creating a new diary entry)
  if (!params.editingSiteDiaryId) {
    if (params.workStatus === 'Siap') {
      const compRes = await fetcher(`/api/activities/${encodeURIComponent(resolvedActivityId)}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualStartDate: params.actualStartDate || params.activityDate,
          completedDate: params.activityDate,
        }),
      });

      if (compRes.status === 401) {
        throw new Error('Sesi telah tamat atau pengguna tidak disahkan. Sila log masuk semula.');
      }

      if (!compRes.ok) {
        const errJson = await compRes.json().catch(() => null);
        throw new Error(errJson?.error || 'Gagal mengemaskini status aktiviti ke Selesai');
      }
    } else {
      // In Progress (Sedang Laksana): transition via /start with known/actual start date
      const startRes = await fetcher(`/api/activities/${encodeURIComponent(resolvedActivityId)}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualStartDate: params.actualStartDate || params.activityDate,
        }),
      });

      if (startRes.status === 401) {
        throw new Error('Sesi telah tamat atau pengguna tidak disahkan. Sila log masuk semula.');
      }

      if (!startRes.ok) {
        const errJson = await startRes.json().catch(() => null);
        const errMsg = errJson?.error || 'Gagal memulakan aktiviti';
        throw new Error(errMsg);
      }
    }
  }

  // 4. Site Diary Persistence (Create or Edit)
  const compiledPrintContext: PrintContextData = {
    location: params.location.trim(),
    work_start_time: params.workStartTime || null,
    work_end_time: params.workEndTime || null,
    weather_condition: params.weatherCondition,
    rain_start_time: params.weatherCondition === 'HUJAN' ? params.rainStartTime || null : null,
    rain_end_time: params.weatherCondition === 'HUJAN' ? params.rainEndTime || null : null,
    contractor_scope: params.contractorScope,
  };

  const activeManpower = params.manpower.filter(
    (m) => m.bumi_count > 0 || m.non_bumi_count > 0 || m.foreign_count > 0
  );

  const mappedWeather =
    params.weatherCondition === 'HUJAN'
      ? 'Rainy'
      : params.weatherCondition === 'RIBUT'
      ? 'HeavyRain'
      : params.weatherCondition === 'MENDUNG'
      ? 'Cloudy'
      : 'Sunny';

  let savedSiteDiaryId: string | null = params.editingSiteDiaryId ?? null;

  if (params.editingSiteDiaryId) {
    // EDIT MODE: PATCH existing record to preserve site_diary_id
    const patchRes = await fetcher(`/api/site-diary/${encodeURIComponent(params.editingSiteDiaryId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notes: params.notes.trim(),
        weather: mappedWeather,
        manpower: activeManpower,
        print_context: compiledPrintContext,
      }),
    });

    if (patchRes.status === 401) {
      throw new Error('Sesi telah tamat atau pengguna tidak disahkan. Sila log masuk semula.');
    }

    if (!patchRes.ok) {
      const errJson = await patchRes.json().catch(() => null);
      throw new Error(errJson?.error || 'Gagal mengemaskini laporan Buku Harian Tapak');
    }

    const patchJson = await patchRes.json();
    savedSiteDiaryId = patchJson?.data?.site_diary_id ?? params.editingSiteDiaryId;
  } else {
    // CREATE MODE: POST new Site Diary row
    const postRes = await fetcher('/api/site-diary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        programme_id: params.programmeId,
        revision_id: params.revisionId,
        activity_id: resolvedActivityId,
        activity_date: params.activityDate,
        notes: params.notes.trim(),
        weather: mappedWeather,
        manpower: activeManpower,
        print_context: compiledPrintContext,
      }),
    });

    if (postRes.status === 401) {
      throw new Error('Sesi telah tamat atau pengguna tidak disahkan. Sila log masuk semula.');
    }

    if (!postRes.ok) {
      const errJson = await postRes.json().catch(() => null);
      const errMessage = errJson?.error || 'Gagal menyimpan laporan Buku Harian Tapak';
      // Duplicate handling detection
      if (
        errMessage.toLowerCase().includes('unique') ||
        errMessage.toLowerCase().includes('already exists') ||
        errMessage.toLowerCase().includes('duplicate')
      ) {
        throw new Error(`Laporan untuk aktiviti ini pada tarikh ${params.activityDate} telah wujud.`);
      }
      throw new Error(errMessage);
    }

    const postJson = await postRes.json();
    savedSiteDiaryId = postJson?.data?.site_diary_id ?? postJson?.data?.siteDiaryId ?? null;
  }

  if (!savedSiteDiaryId) {
    throw new Error('ID Laporan Buku Harian Tapak tidak dapat diperolehi.');
  }

  return { siteDiaryId: savedSiteDiaryId, activityId: resolvedActivityId };
}

export default function DailyEntryForm({
  initialSiteDiaryId = null,
  initialActivityId = null,
  onSuccess,
  className = '',
}: DailyEntryFormProps) {
  const { programmeId, revisionId } = useDailyEntryContext();

  // Operational Source
  const [selectedSource, setSelectedSource] = useState<SelectedOperationalSource | null>(null);

  // Diary & Activity Dates
  const todayIso = new Date().toISOString().split('T')[0] ?? '';
  const [activityDate, setActivityDate] = useState<string>(todayIso);
  const [actualStartDate, setActualStartDate] = useState<string>(todayIso);
  const [workStatus, setWorkStatus] = useState<'Sedang Laksana' | 'Siap'>('Sedang Laksana');

  // Print Context (JKR Page 1 Fields)
  const [location, setLocation] = useState<string>('');
  const [workStartTime, setWorkStartTime] = useState<string>('08:00');
  const [workEndTime, setWorkEndTime] = useState<string>('17:00');
  const [weatherCondition, setWeatherCondition] = useState<'ELOK' | 'HUJAN' | 'MENDUNG' | 'RIBUT'>('ELOK');
  const [rainStartTime, setRainStartTime] = useState<string>('');
  const [rainEndTime, setRainEndTime] = useState<string>('');
  const [contractorScope, setContractorScope] = useState<'CONTRACTOR' | 'NSC'>('CONTRACTOR');

  // General Notes & Weather
  const [notes, setNotes] = useState<string>('');

  // Workforce (Tenaga Kerja)
  const [manpower, setManpower] = useState<ManpowerRow[]>(
    DEFAULT_TRADES.map((trade) => ({
      trade_name: trade,
      bumi_count: 0,
      non_bumi_count: 0,
      foreign_count: 0,
    }))
  );

  // Edit Mode state
  const [editingSiteDiaryId, setEditingSiteDiaryId] = useState<string | null>(initialSiteDiaryId);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(initialActivityId);

  // Form execution state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [savedDiaryId, setSavedDiaryId] = useState<string | null>(null);
  const isSubmittingRef = useRef<boolean>(false);

  // Reset helper for starting a new entry
  const handleResetForNewEntry = useCallback(() => {
    setSelectedSource(null);
    setActivityDate(todayIso);
    setActualStartDate(todayIso);
    setWorkStatus('Sedang Laksana');
    setLocation('');
    setWorkStartTime('08:00');
    setWorkEndTime('17:00');
    setWeatherCondition('ELOK');
    setRainStartTime('');
    setRainEndTime('');
    setContractorScope('CONTRACTOR');
    setNotes('');
    setManpower(
      DEFAULT_TRADES.map((trade) => ({
        trade_name: trade,
        bumi_count: 0,
        non_bumi_count: 0,
        foreign_count: 0,
      }))
    );
    setSavedDiaryId(null);
    setFormError(null);
    setFormSuccess(null);
  }, [todayIso]);

  // If editing an existing Site Diary, load its data
  const loadExistingDiary = useCallback(async (diaryId: string) => {
    try {
      const res = await fetch(`/api/site-diary/${encodeURIComponent(diaryId)}`);
      if (!res.ok) return;
      const json = await res.json();
      const diary = json.data;
      if (!diary) return;

      if (diary.notes) setNotes(diary.notes);
      if (diary.activity_date) setActivityDate(diary.activity_date);
      if (diary.activity_id) setEditingActivityId(diary.activity_id);

      if (diary.print_context) {
        if (diary.print_context.location) setLocation(diary.print_context.location);
        if (diary.print_context.work_start_time) setWorkStartTime(diary.print_context.work_start_time);
        if (diary.print_context.work_end_time) setWorkEndTime(diary.print_context.work_end_time);
        if (diary.print_context.weather_condition) setWeatherCondition(diary.print_context.weather_condition);
        if (diary.print_context.rain_start_time) setRainStartTime(diary.print_context.rain_start_time);
        if (diary.print_context.rain_end_time) setRainEndTime(diary.print_context.rain_end_time);
        if (diary.print_context.contractor_scope) setContractorScope(diary.print_context.contractor_scope);
      }

      if (Array.isArray(diary.manpower) && diary.manpower.length > 0) {
        setManpower(diary.manpower);
      }
    } catch {
      // ignore
    }
  }, []);

  // Clear stale transient source and states if Programme changes while not in edit mode
  const prevProgrammeIdRef = useRef<string | null>(programmeId);
  useEffect(() => {
    if (prevProgrammeIdRef.current !== null && prevProgrammeIdRef.current !== programmeId) {
      if (!editingSiteDiaryId) {
        setSelectedSource(null);
        setFormError(null);
        setFormSuccess(null);
        setSavedDiaryId(null);
      }
    }
    prevProgrammeIdRef.current = programmeId;
  }, [programmeId, editingSiteDiaryId]);

  useEffect(() => {
    if (initialSiteDiaryId) {
      setEditingSiteDiaryId(initialSiteDiaryId);
      loadExistingDiary(initialSiteDiaryId);
    }
  }, [initialSiteDiaryId, loadExistingDiary]);

  // Native Form Submission Handler
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setFormError(null);
    setFormSuccess(null);
    setIsSubmitting(true);

    try {
      const result = await submitDailyEntry({
        programmeId: programmeId || '',
        revisionId: revisionId || '',
        selectedSource,
        activityDate,
        actualStartDate,
        workStatus,
        location,
        workStartTime,
        workEndTime,
        weatherCondition,
        rainStartTime,
        rainEndTime,
        contractorScope,
        notes,
        manpower,
        editingSiteDiaryId,
        editingActivityId,
      });

      setSavedDiaryId(result.siteDiaryId);

      if (editingSiteDiaryId) {
        setFormSuccess('Buku Harian Tapak berjaya dikemaskini.');
      } else {
        setFormSuccess('Buku Harian Tapak berjaya disimpan.');
      }

      if (onSuccess && result.siteDiaryId) {
        onSuccess(result.siteDiaryId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ralat semasa memproses laporan harian';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`w-full space-y-4 ${className}`} aria-label="Borang Buku Harian Tapak">
      {/* 1. Operational Source Selector (MSP XOR VO) */}
      {!editingActivityId && (
        <OperationalSourceSelector
          selectedSource={selectedSource}
          onSelectSource={setSelectedSource}
          disabled={isSubmitting}
        />
      )}

      {/* 2. Tarikh & Status Perlaksanaan */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 sm:p-5 shadow-lg">
        <h3 className="text-sm sm:text-base font-bold text-zinc-100 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          Tarikh & Status Kerja
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-zinc-400 font-semibold mb-1">
              Tarikh Laporan Harian *
            </label>
            <input
              type="date"
              required
              value={activityDate}
              onChange={(e) => setActivityDate(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">
              Tarikh Mula Sebenar (Known Start) *
            </label>
            <input
              type="date"
              required
              value={actualStartDate}
              onChange={(e) => setActualStartDate(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">
              Status Kemajuan Aktiviti
            </label>
            <select
              value={workStatus}
              onChange={(e) => setWorkStatus(e.target.value as 'Sedang Laksana' | 'Siap')}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-200 focus:outline-none focus:border-blue-500"
            >
              <option value="Sedang Laksana">Sedang Laksana (In Progress)</option>
              <option value="Siap">Siap Sepenuhnya (Completed)</option>
            </select>
          </div>
        </div>
      </section>

      {/* 3. Maklumat Cetakan JKR (Page 1) */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 sm:p-5 shadow-lg">
        <h3 className="text-sm sm:text-base font-bold text-zinc-100 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Maklumat Tapak & Cuaca (Format JKR Page 1)
        </h3>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-zinc-400 font-semibold mb-1">
              Lokasi Terperinci / Grid Line *
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={isSubmitting}
              placeholder="Contoh: Ground Beam Blok A, Grid A1-A4 (Aras Bawah)"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-zinc-400 font-semibold mb-1">Waktu Mula Kerja</label>
              <input
                type="time"
                value={workStartTime}
                onChange={(e) => setWorkStartTime(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-zinc-400 font-semibold mb-1">Waktu Tamat Kerja</label>
              <input
                type="time"
                value={workEndTime}
                onChange={(e) => setWorkEndTime(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-zinc-400 font-semibold mb-1">Keadaan Cuaca</label>
              <select
                value={weatherCondition}
                onChange={(e) => setWeatherCondition(e.target.value as typeof weatherCondition)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="ELOK">Elok / Cerah</option>
                <option value="MENDUNG">Mendung</option>
                <option value="HUJAN">Hujan</option>
                <option value="RIBUT">Ribut / Hujan Lebat</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 font-semibold mb-1">Skop Kontraktor</label>
              <select
                value={contractorScope}
                onChange={(e) => setContractorScope(e.target.value as typeof contractorScope)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="CONTRACTOR">Kontraktor Utama</option>
                <option value="NSC">Sub-Kontraktor Dinamakan (NSC)</option>
              </select>
            </div>
          </div>

          {weatherCondition === 'HUJAN' && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-blue-950/30 border border-blue-800/40">
              <div>
                <label className="block text-blue-300 font-semibold mb-1">Waktu Hujan Mula</label>
                <input
                  type="time"
                  value={rainStartTime}
                  onChange={(e) => setRainStartTime(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-blue-300 font-semibold mb-1">Waktu Hujan Tamat</label>
                <input
                  type="time"
                  value={rainEndTime}
                  onChange={(e) => setRainEndTime(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. Tenaga Kerja (Workforce Entry Component) */}
      <WorkforceEntry
        manpower={manpower}
        onChange={setManpower}
        disabled={isSubmitting}
      />

      {/* 5. Catatan Kemajuan Kerja (Notes) */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 sm:p-5 shadow-lg">
        <h3 className="text-sm sm:text-base font-bold text-zinc-100 mb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
          Catatan & Huraian Kemajuan Kerja *
        </h3>
        <textarea
          required
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isSubmitting}
          placeholder="Nyatakan kemajuan fizikal, kuantiti kerja disiapkan, ujian konkrit/tetulang, atau isu tapak hari ini..."
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-purple-500 leading-relaxed"
        />
      </section>

      {/* Feedback & Status Surfaces (Accessible role=alert / role=status) */}
      <DailyEntryFeedback
        error={formError}
        success={formSuccess}
        savedSiteDiaryId={savedDiaryId}
        isEditMode={Boolean(editingSiteDiaryId)}
        onResetForNewEntry={handleResetForNewEntry}
      />

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          aria-disabled={isSubmitting}
          className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg hover:shadow-blue-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" aria-hidden="true"></span>
              <span>Menyimpan Laporan...</span>
            </>
          ) : (
            <span>
              {editingSiteDiaryId ? 'Kemaskini Laporan Buku Harian Tapak' : 'Hantar & Simpan Buku Harian Tapak'}
            </span>
          )}
        </button>
      </div>
    </form>
  );
}
