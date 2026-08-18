'use client';

import React, { useState, useEffect, useCallback, useRef, FormEvent } from 'react';
import { useDailyEntryContext } from './DailyEntryShell';
import OperationalSourceSelector, { SelectedOperationalSource } from './OperationalSourceSelector';
import WorkforceEntry, { ManpowerRow, COMMON_TRADES_CATALOG } from './WorkforceEntry';
import DailyEntryFeedback from './DailyEntryFeedback';
import OpenActivitiesList from './OpenActivitiesList';

export type { ManpowerRow };

export type DailyEntryMode = 'NEW_ACTIVITY' | 'CONTINUE_ACTIVITY' | 'EDIT_SITE_DIARY';

export interface PrintContextData {
  location: string;
  work_start_time: string | null;
  work_end_time: string | null;
  weather_condition: 'ELOK' | 'HUJAN' | 'MENDUNG' | 'RIBUT' | null;
  rain_start_time: string | null;
  rain_end_time: string | null;
  contractor_scope: 'CONTRACTOR' | 'NSC';
}

export interface DailyEntryFormProps {
  initialSiteDiaryId?: string | null;
  initialActivityId?: string | null;
  initialTab?: 'OPEN_ACTIVITIES' | 'NEW_ACTIVITY';
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
  workStartTime?: string | null;
  workEndTime?: string | null;
  weatherCondition?: 'ELOK' | 'HUJAN' | 'MENDUNG' | 'RIBUT' | null;
  rainStartTime?: string | null;
  rainEndTime?: string | null;
  contractorScope: 'CONTRACTOR' | 'NSC';
  notes: string;
  manpower: ManpowerRow[];
  editingSiteDiaryId?: string | null;
  expectedLastModifiedAt?: string | null;
  editingActivityId?: string | null;
  fetchFn?: typeof fetch;
}

export function resolveDailyEntryMode(params: {
  editingSiteDiaryId?: string | null;
  editingActivityId?: string | null;
  selectedSource?: SelectedOperationalSource | null;
}): DailyEntryMode {
  const hasSiteDiaryId = Boolean(params.editingSiteDiaryId && params.editingSiteDiaryId.trim());
  const hasActivityId = Boolean(params.editingActivityId && params.editingActivityId.trim());
  const hasSource = Boolean(params.selectedSource);

  const authorityCount = (hasSiteDiaryId ? 1 : 0) + (hasActivityId ? 1 : 0) + (hasSource ? 1 : 0);

  if (authorityCount === 0) {
    throw new Error('Sila pilih Sumber Aktiviti (Kerja Jadual MSP atau Kerja VO).');
  }

  if (authorityCount > 1) {
    if (hasSiteDiaryId && hasActivityId) {
      throw new Error('Konflik mod borang: ID Buku Harian dan ID Aktiviti tidak boleh dibekalkan serentak.');
    }
    if (hasSiteDiaryId && hasSource) {
      throw new Error('Konflik mod borang: Mod Suntingan Laporan tidak membenarkan pemilihan Sumber Aktiviti.');
    }
    if (hasActivityId && hasSource) {
      throw new Error('Konflik mod borang: Mod Lanjutan Aktiviti tidak membenarkan pemilihan Sumber Aktiviti baharu.');
    }
    throw new Error('Konflik mod borang: Hanya satu autoriti dibenarkan.');
  }

  if (hasSiteDiaryId) {
    return 'EDIT_SITE_DIARY';
  }

  if (hasActivityId) {
    return 'CONTINUE_ACTIVITY';
  }

  return 'NEW_ACTIVITY';
}

export async function submitDailyEntry(params: SubmitDailyEntryParams): Promise<{
  siteDiaryId: string;
  activityId: string;
  lastModifiedAt: string | null;
}> {
  const fetcher = params.fetchFn || (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);

  // 1. Client-Side Field Validation & Explicit Mode Resolution
  if (!params.programmeId || !params.revisionId) {
    throw new Error('Sila pastikan Program dan Semakan Projek sah dipilih.');
  }

  const mode = resolveDailyEntryMode(params);

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

  let resolvedActivityId: string | null = params.editingActivityId ?? null;

  // 2. Establish Activity if creating a new entry
  if (mode === 'NEW_ACTIVITY') {
    if (!params.selectedSource) {
      throw new Error('Sila pilih Sumber Aktiviti (Kerja Jadual MSP atau Kerja VO).');
    }

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

  if (mode !== 'EDIT_SITE_DIARY' && !resolvedActivityId) {
    throw new Error('ID Aktiviti tidak dapat ditentukan.');
  }

  // 3. Lifecycle Transition Orchestration
  if (mode === 'CONTINUE_ACTIVITY' && resolvedActivityId) {
    // Query authoritative Activity state from server
    const actStateRes = await fetcher(`/api/activity/${encodeURIComponent(resolvedActivityId)}`);
    if (actStateRes.status === 401) {
      throw new Error('Sesi telah tamat atau pengguna tidak disahkan. Sila log masuk semula.');
    }
    if (!actStateRes.ok) {
      const errJson = await actStateRes.json().catch(() => null);
      throw new Error(errJson?.error || 'Gagal menyemak status terkini aktiviti');
    }

    const actStateJson = await actStateRes.json();
    const serverActivity = actStateJson?.data;
    const serverStatus: string | undefined = serverActivity?.status;

    // Fail closed on unknown or invalid status
    const canonicalStatuses = ['New', 'In Progress', 'Completed'];
    if (!serverStatus || !canonicalStatuses.includes(serverStatus)) {
      throw new Error(`Status aktiviti tidak sah: ${serverStatus ?? 'null'}`);
    }

    if (serverStatus === 'Completed') {
      // Check for legitimate completion recovery:
      // Activity is Completed with non-null completed_date exactly matching activityDate, and user submits Siap
      const isLegitimateCompletionRecovery =
        params.workStatus === 'Siap' &&
        serverActivity?.completed_date != null &&
        serverActivity.completed_date === params.activityDate;

      if (!isLegitimateCompletionRecovery) {
        throw new Error('Aktiviti ini telah selesai sepenuhnya dan tidak boleh diteruskan.');
      }
      // Legitimate completion recovery: DO NOT call /complete again (no replay).
      // Proceed directly to Step 4 (Site Diary write).
    } else if (params.workStatus === 'Siap') {
      // Transition from New or In Progress to Completed
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
    } else if (serverStatus === 'New') {
      // If still New and workStatus is Sedang Laksana, transition to In Progress via /start
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
    // If serverStatus === 'In Progress' and params.workStatus === 'Sedang Laksana': NO-OP (no /start replay)
  } else if (mode === 'NEW_ACTIVITY' && resolvedActivityId) {
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
    work_start_time: params.workStartTime?.trim() ? params.workStartTime.trim() : null,
    work_end_time: params.workEndTime?.trim() ? params.workEndTime.trim() : null,
    weather_condition: params.weatherCondition ?? null,
    rain_start_time: params.weatherCondition === 'HUJAN' && params.rainStartTime?.trim() ? params.rainStartTime.trim() : null,
    rain_end_time: params.weatherCondition === 'HUJAN' && params.rainEndTime?.trim() ? params.rainEndTime.trim() : null,
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
      : params.weatherCondition === 'ELOK'
      ? 'Sunny'
      : null;

  let savedSiteDiaryId: string | null = params.editingSiteDiaryId ?? null;
  let responseLastModifiedAt: string | null = params.expectedLastModifiedAt ?? null;

  if (mode === 'EDIT_SITE_DIARY' && params.editingSiteDiaryId) {
    if (!params.expectedLastModifiedAt) {
      throw new Error('Token suntingan laporan tidak tersedia. Muat semula rekod sebelum menyimpan.');
    }
    // EDIT MODE: PATCH existing record to preserve site_diary_id
    const patchRes = await fetcher(`/api/site-diary/${encodeURIComponent(params.editingSiteDiaryId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expected_last_modified_at: params.expectedLastModifiedAt,
        notes: params.notes.trim(),
        weather: mappedWeather,
        manpower: activeManpower,
        print_context: compiledPrintContext,
      }),
    });

    if (patchRes.status === 401) {
      throw new Error('Sesi telah tamat atau pengguna tidak disahkan. Sila log masuk semula.');
    }

    if (patchRes.status === 409) {
      throw new Error('Laporan ini telah dikemaskini oleh pengguna lain. Muat semula rekod terkini sebelum menyimpan semula perubahan.');
    }

    if (!patchRes.ok) {
      const errJson = await patchRes.json().catch(() => null);
      throw new Error(errJson?.error || 'Gagal mengemaskini laporan Buku Harian Tapak');
    }

    const patchJson = await patchRes.json();
    savedSiteDiaryId = patchJson?.data?.site_diary_id ?? params.editingSiteDiaryId;
    responseLastModifiedAt = patchJson?.data?.lastModifiedAt
      ?? patchJson?.data?.updated_at
      ?? patchJson?.data?.submitted_at
      ?? null;
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
        operation_intent: params.workStatus === 'Siap' ? 'FINAL_COMPLETION_DIARY' : 'IN_PROGRESS_DIARY',
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

  return {
    siteDiaryId: savedSiteDiaryId,
    activityId: resolvedActivityId ?? '',
    lastModifiedAt: responseLastModifiedAt,
  };
}

export default function DailyEntryForm({
  initialSiteDiaryId = null,
  initialActivityId = null,
  initialTab,
  onSuccess,
  className = '',
}: DailyEntryFormProps) {
  const { programmeId, revisionId } = useDailyEntryContext();

  // Mode Switch Tab State: Default landing tab is 'OPEN_ACTIVITIES' when no initial id is supplied
  const [activeTab, setActiveTab] = useState<'OPEN_ACTIVITIES' | 'NEW_ACTIVITY'>(
    initialTab ?? (initialActivityId || initialSiteDiaryId ? 'NEW_ACTIVITY' : 'OPEN_ACTIVITIES')
  );

  // Operational Source
  const [selectedSource, setSelectedSource] = useState<SelectedOperationalSource | null>(null);

  // Diary & Activity Dates
  const todayIso = new Date().toISOString().split('T')[0] ?? '';
  const [activityDate, setActivityDate] = useState<string>(todayIso);
  const [actualStartDate, setActualStartDate] = useState<string>(todayIso);
  const [workStatus, setWorkStatus] = useState<'Sedang Laksana' | 'Siap'>('Sedang Laksana');

  // Print Context (JKR Page 1 Fields)
  const [location, setLocation] = useState<string>('');
  const [workStartTime, setWorkStartTime] = useState<string>(initialActivityId ? '' : '08:00');
  const [workEndTime, setWorkEndTime] = useState<string>(initialActivityId ? '' : '17:00');
  const [weatherCondition, setWeatherCondition] = useState<'ELOK' | 'HUJAN' | 'MENDUNG' | 'RIBUT' | null>(
    initialActivityId ? null : 'ELOK'
  );
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

  // Continuation / Edit Mode state
  const [editingSiteDiaryId, setEditingSiteDiaryId] = useState<string | null>(initialSiteDiaryId);
  const [expectedLastModifiedAt, setExpectedLastModifiedAt] = useState<string | null>(null);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(initialActivityId);
  const [existingActivityInfo, setExistingActivityInfo] = useState<{
    subtask?: string;
    sourceType?: string;
    status?: string;
  } | null>(null);

  // Form execution state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [savedDiaryId, setSavedDiaryId] = useState<string | null>(null);
  const isSubmittingRef = useRef<boolean>(false);

  const editDiaryGenerationRef = useRef<number>(0);
  const editDiaryAbortRef = useRef<AbortController | null>(null);
  const continuationPrefillGenerationRef = useRef<number>(0);
  const continuationPrefillAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (editDiaryAbortRef.current) {
        editDiaryAbortRef.current.abort();
        editDiaryAbortRef.current = null;
      }
      editDiaryGenerationRef.current += 1;

      if (continuationPrefillAbortRef.current) {
        continuationPrefillAbortRef.current.abort();
        continuationPrefillAbortRef.current = null;
      }
      continuationPrefillGenerationRef.current += 1;
    };
  }, []);

  /**
   * Centralized continuation / form invalidation authority.
   * Cancels any pending in-flight async prefill operations, increments the generation token,
   * resets continuation & form state, and optionally navigates the UI tab.
   */
  const invalidateContinuationContext = useCallback(
    (targetTab?: 'OPEN_ACTIVITIES' | 'NEW_ACTIVITY') => {
      // 1. Abort pending continuation prefill requests & increment generation
      if (continuationPrefillAbortRef.current) {
        continuationPrefillAbortRef.current.abort();
        continuationPrefillAbortRef.current = null;
      }
      continuationPrefillGenerationRef.current += 1;

      // 2. Abort pending edit diary requests & increment generation
      if (editDiaryAbortRef.current) {
        editDiaryAbortRef.current.abort();
        editDiaryAbortRef.current = null;
      }
      editDiaryGenerationRef.current += 1;

      // 3. Clear editingActivityId, banner info & editingSiteDiaryId
      setEditingActivityId(null);
      setExistingActivityInfo(null);
      setEditingSiteDiaryId(null);
      setExpectedLastModifiedAt(null);

      // 4. Clear operational source & form inputs
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
      setFormError(null);
      setFormSuccess(null);
      setSavedDiaryId(null);
      setManpower(
        DEFAULT_TRADES.map((trade) => ({
          trade_name: trade,
          bumi_count: 0,
          non_bumi_count: 0,
          foreign_count: 0,
        }))
      );

      // 5. Navigate to target tab if specified
      if (targetTab) {
        setActiveTab(targetTab);
      }
    },
    [todayIso]
  );


  // If editing an existing Site Diary, load its data
  const loadExistingDiary = useCallback(async (diaryId: string) => {
    if (editDiaryAbortRef.current) {
      editDiaryAbortRef.current.abort();
      editDiaryAbortRef.current = null;
    }
    const abortController = new AbortController();
    editDiaryAbortRef.current = abortController;
    const currentGeneration = ++editDiaryGenerationRef.current;

    try {
      const res = await fetch(`/api/site-diary/${encodeURIComponent(diaryId)}`, {
        signal: abortController.signal,
      });
      if (!res.ok) return;
      const json = await res.json();
      if (currentGeneration === editDiaryGenerationRef.current) {
        const diary = json.data;
        if (!diary) return;

        setExpectedLastModifiedAt(diary.updated_at ?? diary.submitted_at ?? null);

        if (diary.notes) setNotes(diary.notes);
        if (diary.activity_date) setActivityDate(diary.activity_date);
        // Mode authority is strictly editingSiteDiaryId; do not set editingActivityId
        setEditingActivityId(null);
        setSelectedSource(null);

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
      }
    } catch {
      // ignore
    }
  }, []);

  // If continuing an existing Activity, load its details and prefill ONLY safe continuation fields
  const loadExistingActivityAndPrefill = useCallback(async (actId: string, targetDate: string) => {
    if (continuationPrefillAbortRef.current) {
      continuationPrefillAbortRef.current.abort();
      continuationPrefillAbortRef.current = null;
    }
    const abortController = new AbortController();
    continuationPrefillAbortRef.current = abortController;
    const currentGeneration = ++continuationPrefillGenerationRef.current;

    try {
      // 1. Reset observational evidence fields explicitly for continuation mode
      setWeatherCondition(null);
      setWorkStartTime('');
      setWorkEndTime('');
      setRainStartTime('');
      setRainEndTime('');
      setNotes('');

      // 2. Fetch Authoritative Activity details
      const actRes = await fetch(`/api/activity/${encodeURIComponent(actId)}`, {
        signal: abortController.signal,
      });
      if (actRes.ok) {
        const actJson = await actRes.json();
        if (currentGeneration === continuationPrefillGenerationRef.current) {
          const act = actJson.data;
          if (act) {
            setExistingActivityInfo({
              subtask: act.subtask,
              sourceType: act.source_type,
              status: act.status,
            });
            if (act.actual_start_date) {
              setActualStartDate(act.actual_start_date);
            }
            if (act.status === 'In Progress') {
              setWorkStatus('Sedang Laksana');
            }
          }
        }
      }

      // 3. Fetch Previous Diaries for Continuation Prefill
      const diariesRes = await fetch(`/api/site-diary/activity/${encodeURIComponent(actId)}`, {
        signal: abortController.signal,
      });
      if (diariesRes.ok) {
        const diariesJson = await diariesRes.json();
        if (currentGeneration === continuationPrefillGenerationRef.current) {
          const diaries: Array<{
            activity_date: string;
            manpower?: ManpowerRow[] | null;
            print_context?: Partial<PrintContextData> | null;
          }> = diariesJson.data;

          if (Array.isArray(diaries) && diaries.length > 0) {
            // Find strictly previous diaries before targetDate
            const priorDiaries = diaries.filter((d) => d.activity_date < targetDate);
            // Sort descending by activity_date to pick the latest prior
            priorDiaries.sort((a, b) => b.activity_date.localeCompare(a.activity_date));
            const latestPrior = priorDiaries[0];

            if (latestPrior) {
              if (Array.isArray(latestPrior.manpower) && latestPrior.manpower.length > 0) {
                setManpower(latestPrior.manpower);
              }
              if (latestPrior.print_context?.location) {
                setLocation(latestPrior.print_context.location);
              }
              if (latestPrior.print_context?.contractor_scope) {
                setContractorScope(latestPrior.print_context.contractor_scope);
              }
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Clear stale transient source, exit continuation mode, and reset to open activities list if Programme changes
  const prevProgrammeIdRef = useRef<string | null>(programmeId);
  useEffect(() => {
    if (prevProgrammeIdRef.current !== null && prevProgrammeIdRef.current !== programmeId) {
      invalidateContinuationContext('OPEN_ACTIVITIES');
    }
    prevProgrammeIdRef.current = programmeId;
  }, [programmeId, invalidateContinuationContext]);

  // Decoupled initialSiteDiaryId effect (eliminates redundant reload on activityDate change)
  useEffect(() => {
    if (initialSiteDiaryId) {
      setEditingSiteDiaryId(initialSiteDiaryId);
      loadExistingDiary(initialSiteDiaryId);
    }
  }, [initialSiteDiaryId, loadExistingDiary]);

  // Decoupled initialActivityId effect
  useEffect(() => {
    if (initialActivityId) {
      setEditingActivityId(initialActivityId);
      loadExistingActivityAndPrefill(initialActivityId, activityDate);
    }
  }, [initialActivityId, loadExistingActivityAndPrefill]);

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
        selectedSource: editingSiteDiaryId || editingActivityId ? null : selectedSource,
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
        editingSiteDiaryId: editingSiteDiaryId || null,
        expectedLastModifiedAt,
        editingActivityId: editingSiteDiaryId ? null : editingActivityId || null,
      });

      setSavedDiaryId(result.siteDiaryId);
      if (editingSiteDiaryId && result.lastModifiedAt) {
        setExpectedLastModifiedAt(result.lastModifiedAt);
      }

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
    <div className={`w-full space-y-4 ${className}`}>
      {/* Top Mode Switch Nav (Aktiviti Terbuka XOR + Laporan Baharu) */}
      {!editingActivityId && !editingSiteDiaryId && (
        <nav aria-label="Navigasi Mod Laporan" className="w-full">
          <div
            role="tablist"
            aria-label="Pilihan Mod Buku Harian"
            className="grid grid-cols-2 p-1 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-sm"
          >
            <button
              type="button"
              role="tab"
              id="tab-open-activities"
              aria-selected={activeTab === 'OPEN_ACTIVITIES'}
              aria-controls="panel-open-activities"
              onClick={() => {
                setActiveTab('OPEN_ACTIVITIES');
                setFormError(null);
              }}
              data-testid="tab-open-activities"
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] flex items-center justify-center gap-2 ${
                activeTab === 'OPEN_ACTIVITIES'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Aktiviti Terbuka</span>
            </button>

            <button
              type="button"
              role="tab"
              id="tab-new-activity"
              aria-selected={activeTab === 'NEW_ACTIVITY'}
              aria-controls="panel-new-activity"
              onClick={() => {
                setActiveTab('NEW_ACTIVITY');
                setFormError(null);
              }}
              data-testid="tab-new-activity"
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] flex items-center justify-center gap-2 ${
                activeTab === 'NEW_ACTIVITY'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Laporan Baharu</span>
            </button>
          </div>
        </nav>
      )}

      {/* View A: Open Activities List */}
      {!editingActivityId && !editingSiteDiaryId && activeTab === 'OPEN_ACTIVITIES' ? (
        <div id="panel-open-activities" role="tabpanel" aria-labelledby="tab-open-activities" className="w-full space-y-4">
          <OpenActivitiesList
            programmeId={programmeId}
            onSelectActivity={(actId) => {
              setEditingActivityId(actId);
              setFormError(null);
              setFormSuccess(null);
              loadExistingActivityAndPrefill(actId, activityDate);
            }}
            onCreateNewActivity={() => {
              invalidateContinuationContext('NEW_ACTIVITY');
            }}
          />
        </div>
      ) : (
        /* View B: Form for New Entry, Continuation, or Edit */
        <form
          id="panel-new-activity"
          role={!editingActivityId && !editingSiteDiaryId ? "tabpanel" : undefined}
          aria-labelledby={!editingActivityId && !editingSiteDiaryId ? "tab-new-activity" : undefined}
          onSubmit={handleSubmit}
          className="w-full space-y-4"
          aria-label="Borang Buku Harian Tapak"
        >
          {/* 1. Operational Source Selector (MSP XOR VO) or Continuation Banner */}
          {!editingActivityId ? (
            <OperationalSourceSelector
              selectedSource={selectedSource}
              onSelectSource={setSelectedSource}
              disabled={isSubmitting}
            />
          ) : (
            !editingSiteDiaryId && (
              <section
                data-testid="continuation-banner"
                className="rounded-2xl border border-blue-800/60 bg-blue-950/40 p-4 sm:p-5 shadow-lg space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-blue-400">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    <span>Melanjutkan Aktiviti Sedia Ada (Continuation Mode)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      invalidateContinuationContext('OPEN_ACTIVITIES');
                    }}
                    data-testid="back-to-open-activities-btn"
                    aria-label="Kembali ke Senarai Aktiviti Terbuka"
                    className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 min-h-[36px]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>Kembali ke Aktiviti Terbuka</span>
                  </button>
                </div>

                {existingActivityInfo?.subtask && (
                  <div className="text-zinc-100 text-sm sm:text-base font-bold pt-0.5 break-words">
                    {existingActivityInfo.subtask}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {existingActivityInfo?.sourceType && (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        existingActivityInfo.sourceType === 'VO'
                          ? 'bg-emerald-950/80 border border-emerald-800/60 text-emerald-300'
                          : 'bg-indigo-950/80 border border-indigo-800/60 text-indigo-300'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          existingActivityInfo.sourceType === 'VO' ? 'bg-emerald-400' : 'bg-indigo-400'
                        }`}
                      ></span>
                      {existingActivityInfo.sourceType === 'VO' ? 'Kerja Tambahan / VO (APK)' : 'Kerja Jadual (MSP)'}
                    </span>
                  )}
                  {existingActivityInfo?.status && (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        existingActivityInfo.status === 'In Progress'
                          ? 'bg-amber-950/80 border border-amber-800/60 text-amber-300'
                          : 'bg-blue-950/80 border border-blue-800/60 text-blue-300'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          existingActivityInfo.status === 'In Progress' ? 'bg-amber-400 animate-pulse' : 'bg-blue-400'
                        }`}
                      ></span>
                      {existingActivityInfo.status === 'In Progress' ? 'Sedang Laksana' : 'Belum Mula'}
                    </span>
                  )}
                </div>
              </section>
            )
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
                  Status Kemajuan Kerja *
                </label>
                <select
                  value={workStatus}
                  onChange={(e) => setWorkStatus(e.target.value as 'Sedang Laksana' | 'Siap')}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="Sedang Laksana">Sedang Laksana (In Progress)</option>
                  <option value="Siap">Siap (Completed)</option>
                </select>
              </div>
            </div>
          </section>

          {/* 3. Maklumat Konteks Cetakan JKR (Print Context) */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 sm:p-5 shadow-lg">
            <h3 className="text-sm sm:text-base font-bold text-zinc-100 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Maklumat Tapak & Cuaca (Format JKR Page 1)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
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
                  placeholder="cth: Aras 2, Blok Pentadbiran, Grid 4-8"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">
                  Skop Pelaksanaan *
                </label>
                <select
                  value={contractorScope}
                  onChange={(e) => setContractorScope(e.target.value as 'CONTRACTOR' | 'NSC')}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="CONTRACTOR">Kontraktor Utama (Main Contractor)</option>
                  <option value="NSC">Sub-Kontraktor Dinamakan (NSC)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mt-3 pt-3 border-t border-zinc-800">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">
                  Keadaan Cuaca Utama
                </label>
                <select
                  value={weatherCondition ?? ''}
                  onChange={(e) =>
                    setWeatherCondition(
                      e.target.value === '' ? null : (e.target.value as 'ELOK' | 'HUJAN' | 'MENDUNG' | 'RIBUT')
                    )
                  }
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Pilih Keadaan Cuaca (Pilihan) --</option>
                  <option value="ELOK">Elok (Sunny/Fair)</option>
                  <option value="HUJAN">Hujan (Rainy)</option>
                  <option value="MENDUNG">Mendung (Cloudy)</option>
                  <option value="RIBUT">Ribut (Stormy)</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">
                  Masa Mula Kerja
                </label>
                <input
                  type="time"
                  value={workStartTime}
                  onChange={(e) => setWorkStartTime(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">
                  Masa Tamat Kerja
                </label>
                <input
                  type="time"
                  value={workEndTime}
                  onChange={(e) => setWorkEndTime(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {weatherCondition === 'HUJAN' && (
                <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">
                      Masa Mula Hujan
                    </label>
                    <input
                      type="time"
                      value={rainStartTime}
                      onChange={(e) => setRainStartTime(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">
                      Masa Tamat Hujan
                    </label>
                    <input
                      type="time"
                      value={rainEndTime}
                      onChange={(e) => setRainEndTime(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
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
            onBackToOpenActivities={() => {
              invalidateContinuationContext('OPEN_ACTIVITIES');
            }}
            onResetForNewEntry={() => {
              invalidateContinuationContext('NEW_ACTIVITY');
            }}
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
      )}
    </div>
  );
}
