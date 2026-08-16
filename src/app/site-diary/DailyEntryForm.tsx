'use client';

import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import { useDailyEntryContext } from './DailyEntryShell';
import OperationalSourceSelector, { SelectedOperationalSource } from './OperationalSourceSelector';

export interface ManpowerRow {
  trade_name: string;
  bumi_count: number;
  non_bumi_count: number;
  foreign_count: number;
}

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

const DEFAULT_TRADES = [
  'General Worker',
  'Carpenter',
  'Bar Bender',
  'Concretor',
  'Bricklayer',
  'Plumber',
  'Electrician',
  'Excavator Operator',
  'Site Supervisor',
];

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
  const [newTradeName, setNewTradeName] = useState<string>('');

  // Edit Mode state
  const [editingSiteDiaryId, setEditingSiteDiaryId] = useState<string | null>(initialSiteDiaryId);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(initialActivityId);

  // Form execution state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

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

  useEffect(() => {
    if (initialSiteDiaryId) {
      setEditingSiteDiaryId(initialSiteDiaryId);
      loadExistingDiary(initialSiteDiaryId);
    }
  }, [initialSiteDiaryId, loadExistingDiary]);

  // Handle manpower count changes
  const handleManpowerChange = (index: number, field: 'bumi_count' | 'non_bumi_count' | 'foreign_count', value: number) => {
    setManpower((prev) => {
      const updated = [...prev];
      const row = updated[index];
      if (row) {
        updated[index] = { ...row, [field]: Math.max(0, value) };
      }
      return updated;
    });
  };

  // Add custom trade
  const handleAddTrade = () => {
    const trimmed = newTradeName.trim();
    if (!trimmed) return;
    if (manpower.some((m) => m.trade_name.toLowerCase() === trimmed.toLowerCase())) {
      setNewTradeName('');
      return;
    }
    setManpower((prev) => [
      ...prev,
      { trade_name: trimmed, bumi_count: 0, non_bumi_count: 0, foreign_count: 0 },
    ]);
    setNewTradeName('');
  };

  // Remove trade row
  const handleRemoveTrade = (index: number) => {
    setManpower((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Build compiled print context payload
  const buildPrintContext = (): PrintContextData => ({
    location: location.trim(),
    work_start_time: workStartTime || null,
    work_end_time: workEndTime || null,
    weather_condition: weatherCondition,
    rain_start_time: weatherCondition === 'HUJAN' ? rainStartTime || null : null,
    rain_end_time: weatherCondition === 'HUJAN' ? rainEndTime || null : null,
    contractor_scope: contractorScope,
  });

  // Calculate total manpower
  const totalWorkers = manpower.reduce(
    (acc, cur) => acc + (cur.bumi_count || 0) + (cur.non_bumi_count || 0) + (cur.foreign_count || 0),
    0
  );

  // Native Form Submission Orchestration
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    // Validation
    if (!programmeId || !revisionId) {
      setFormError('Sila pastikan Program dan Semakan Projek sah dipilih.');
      return;
    }

    if (!editingActivityId && !selectedSource) {
      setFormError('Sila pilih Sumber Aktiviti (Kerja Jadual MSP atau Kerja VO).');
      return;
    }

    if (!activityDate) {
      setFormError('Sila masukkan Tarikh Aktiviti Laporan Harian.');
      return;
    }

    if (!notes.trim()) {
      setFormError('Sila masukkan Catatan Kemajuan Kerja.');
      return;
    }

    setIsSubmitting(true);

    try {
      let resolvedActivityId = editingActivityId;

      // 1. Establish Activity if creating a new entry
      if (!resolvedActivityId && selectedSource) {
        const createActivityPayload: Record<string, unknown> = {
          programmeId,
          revisionId,
          sourceType: selectedSource.sourceType,
          activityName: selectedSource.title,
        };

        if (selectedSource.sourceType === 'MSP') {
          createActivityPayload.taskId = selectedSource.id;
        } else {
          createActivityPayload.voItemId = selectedSource.id;
        }

        const actRes = await fetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createActivityPayload),
        });

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

      // 2. Lifecycle Transition Orchestration
      // If completed on same day or marked completed:
      if (workStatus === 'Siap') {
        const compRes = await fetch(`/api/activities/${encodeURIComponent(resolvedActivityId)}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actualStartDate: actualStartDate || activityDate,
            completedDate: activityDate,
          }),
        });

        if (!compRes.ok) {
          const errJson = await compRes.json().catch(() => null);
          throw new Error(errJson?.error || 'Gagal mengemaskini status aktiviti ke Selesai');
        }
      } else {
        // In Progress (Sedang Laksana): transition via /start with known/actual start date
        const startRes = await fetch(`/api/activities/${encodeURIComponent(resolvedActivityId)}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actualStartDate: actualStartDate || activityDate,
          }),
        });

        if (!startRes.ok) {
          // If already in progress, non-blocking or accept
          const errJson = await startRes.json().catch(() => null);
          if (errJson?.error && !errJson.error.includes('already')) {
            // non-fatal if already started, but surface other errors
          }
        }
      }

      // 3. Site Diary Persistence (Create or Edit)
      const compiledPrintContext = buildPrintContext();
      const activeManpower = manpower.filter(
        (m) => m.bumi_count > 0 || m.non_bumi_count > 0 || m.foreign_count > 0
      );

      let savedSiteDiaryId = editingSiteDiaryId;

      if (editingSiteDiaryId) {
        // EDIT MODE: PATCH existing record to preserve site_diary_id
        const patchRes = await fetch(`/api/site-diary/${encodeURIComponent(editingSiteDiaryId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notes: notes.trim(),
            weather: weatherCondition === 'HUJAN' ? 'Rainy' : weatherCondition === 'RIBUT' ? 'HeavyRain' : weatherCondition === 'MENDUNG' ? 'Cloudy' : 'Sunny',
            manpower: activeManpower,
            print_context: compiledPrintContext,
          }),
        });

        if (!patchRes.ok) {
          const errJson = await patchRes.json().catch(() => null);
          throw new Error(errJson?.error || 'Gagal mengemaskini laporan Buku Harian Tapak');
        }

        const patchJson = await patchRes.json();
        savedSiteDiaryId = patchJson?.data?.site_diary_id ?? editingSiteDiaryId;
        setFormSuccess('Laporan Buku Harian Tapak berjaya dikemaskini.');
      } else {
        // CREATE MODE: POST new Site Diary row
        const postRes = await fetch('/api/site-diary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            programme_id: programmeId,
            revision_id: revisionId,
            activity_id: resolvedActivityId,
            activity_date: activityDate,
            notes: notes.trim(),
            weather: weatherCondition === 'HUJAN' ? 'Rainy' : weatherCondition === 'RIBUT' ? 'HeavyRain' : weatherCondition === 'MENDUNG' ? 'Cloudy' : 'Sunny',
            manpower: activeManpower,
            print_context: compiledPrintContext,
          }),
        });

        if (!postRes.ok) {
          const errJson = await postRes.json().catch(() => null);
          const errMessage = errJson?.error || 'Gagal menyimpan laporan Buku Harian Tapak';
          // Duplicate handling detection
          if (errMessage.toLowerCase().includes('unique') || errMessage.toLowerCase().includes('already exists') || errMessage.toLowerCase().includes('duplicate')) {
            throw new Error(`Laporan untuk aktiviti ini pada tarikh ${activityDate} telah wujud.`);
          }
          throw new Error(errMessage);
        }

        const postJson = await postRes.json();
        savedSiteDiaryId = postJson?.data?.site_diary_id ?? postJson?.data?.siteDiaryId ?? null;
        setFormSuccess('Laporan Buku Harian Tapak berjaya disimpan.');
      }

      if (savedSiteDiaryId && onSuccess) {
        onSuccess(savedSiteDiaryId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ralat semasa memproses laporan harian';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
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

      {/* 4. Tenaga Kerja (Workforce) */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 sm:p-5 shadow-lg">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-sm sm:text-base font-bold text-zinc-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Tenaga Kerja di Tapak (Workforce)
          </h3>
          <span className="text-xs font-bold text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-800/50">
            Jumlah: {totalWorkers} Orang
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {manpower.map((row, idx) => (
              <div
                key={row.trade_name}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl border border-zinc-800 bg-zinc-950/60"
              >
                <span className="font-semibold text-zinc-200 sm:w-1/3 truncate" title={row.trade_name}>
                  {row.trade_name}
                </span>

                <div className="grid grid-cols-3 gap-2 flex-1">
                  <div>
                    <label className="block text-[10px] text-zinc-500">Bumi</label>
                    <input
                      type="number"
                      min={0}
                      value={row.bumi_count}
                      onChange={(e) => handleManpowerChange(idx, 'bumi_count', parseInt(e.target.value, 10) || 0)}
                      disabled={isSubmitting}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-center text-zinc-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-500">Bukan Bumi</label>
                    <input
                      type="number"
                      min={0}
                      value={row.non_bumi_count}
                      onChange={(e) => handleManpowerChange(idx, 'non_bumi_count', parseInt(e.target.value, 10) || 0)}
                      disabled={isSubmitting}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-center text-zinc-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-500">Asing</label>
                    <input
                      type="number"
                      min={0}
                      value={row.foreign_count}
                      onChange={(e) => handleManpowerChange(idx, 'foreign_count', parseInt(e.target.value, 10) || 0)}
                      disabled={isSubmitting}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-center text-zinc-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveTrade(idx)}
                  disabled={isSubmitting}
                  className="text-zinc-500 hover:text-red-400 p-1 self-end sm:self-center"
                  title="Padam tred ini"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Add custom trade input */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="text"
              value={newTradeName}
              onChange={(e) => setNewTradeName(e.target.value)}
              placeholder="Tambah tred tenaga kerja baharu..."
              disabled={isSubmitting}
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={handleAddTrade}
              disabled={isSubmitting || !newTradeName.trim()}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 transition-colors disabled:opacity-50"
            >
              + Tambah Tred
            </button>
          </div>
        </div>
      </section>

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

      {/* Error & Success Banners */}
      {formError && (
        <div className="rounded-xl border border-red-800/80 bg-red-950/60 p-3.5 text-xs text-red-200 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{formError}</span>
        </div>
      )}

      {formSuccess && (
        <div className="rounded-xl border border-emerald-800/80 bg-emerald-950/60 p-3.5 text-xs text-emerald-200 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{formSuccess}</span>
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg hover:shadow-blue-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
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
