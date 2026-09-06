import type { Session, User } from '@supabase/supabase-js';
import type { SiteDiaryHistoryEvent } from '@/types/siteDiaryHistory';

const PROGRAMME_ID = '11111111-1111-4111-8111-111111111111';
const REVISION_ID = '22222222-2222-4222-8222-222222222222';
const TASK_ID = '33333333-3333-4333-8333-333333333333';
const ACTIVITY_ID = '44444444-4444-4444-8444-444444444444';
const SITE_DIARY_ID = '55555555-5555-4555-8555-555555555555';
const VISUAL_USER_ID = '77777777-7777-4777-8777-777777777777';
const PREVIEW_VO_ID = '88888888-8888-4888-8888-888888888888';
const HISTORY_REVISION_ID = '66666666-6666-4666-8666-666666666666';
const HISTORY_ACTIVITY_ID = '44444444-4444-4444-9444-444444444449';
const HISTORY_SITE_DIARY_ID = '55555555-5555-4555-9555-555555555559';

type PreviewVoItem = {
  vo_item_id: string;
  programme_id: string;
  revision_id: string;
  vo_reference: string;
  line_item: string;
  description: string | null;
  is_omission: boolean;
  created_at: string;
};

let voItems: PreviewVoItem[] = [
  {
    vo_item_id: PREVIEW_VO_ID,
    programme_id: PROGRAMME_ID,
    revision_id: REVISION_ID,
    vo_reference: 'VO-01',
    line_item: 'Kerja akses sementara ke Zon B',
    description: 'Arahan tambahan di luar aktiviti MSP semasa.',
    is_omission: false,
    created_at: '2026-09-01T00:00:00.000Z',
  },
];

type PreviewSourceType = 'MSP' | 'VO';
type PreviewManpower = { trade_name: string; bumi_count: number; non_bumi_count: number; foreign_count: number };
type PreviewPrintContext = {
  location: string;
  work_start_time: string | null;
  work_end_time: string | null;
  weather_condition: string | null;
  rain_start_time: string | null;
  rain_end_time: string | null;
  contractor_scope: 'CONTRACTOR' | 'NSC';
};
type PreviewDiary = {
  site_diary_id: string;
  programme_id: string;
  revision_id: string;
  activity_id: string;
  activity_date: string;
  weather: string | null;
  status: 'In Progress' | 'Completed';
  notes: string;
  manpower: PreviewManpower[];
  print_context: PreviewPrintContext;
  submitted_by: string;
  submitted_at: string;
  updated_at: string | null;
};

function previewTodayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

let previewActivityTitle = 'Kerja konkrit rasuk aras bawah · Zon B';
let previewSourceType: PreviewSourceType = 'MSP';
let previewSourceReference = 'WBS 1.2.4';
let previewActivityStatus: 'In Progress' | 'Completed' = 'In Progress';

let currentDiary: PreviewDiary = {
  site_diary_id: SITE_DIARY_ID,
  programme_id: PROGRAMME_ID,
  revision_id: REVISION_ID,
  activity_id: ACTIVITY_ID,
  activity_date: previewTodayIso(),
  weather: 'Sunny',
  status: 'In Progress',
  notes: 'Rekod semasa untuk penerimaan fizikal NGAMSOI.',
  manpower: [{ trade_name: 'Pembengkok Besi', bumi_count: 0, non_bumi_count: 0, foreign_count: 3 }],
  print_context: {
    location: 'Blok Pentadbiran · Grid 4–8',
    work_start_time: '08:00',
    work_end_time: '17:00',
    weather_condition: 'ELOK',
    rain_start_time: null,
    rain_end_time: null,
    contractor_scope: 'CONTRACTOR',
  },
  submitted_by: VISUAL_USER_ID,
  submitted_at: new Date().toISOString(),
  updated_at: null,
};

const historicalDiary: PreviewDiary = {
  site_diary_id: HISTORY_SITE_DIARY_ID,
  programme_id: PROGRAMME_ID,
  revision_id: HISTORY_REVISION_ID,
  activity_id: HISTORY_ACTIVITY_ID,
  activity_date: '2026-07-12',
  weather: 'Sunny',
  status: 'Completed',
  notes: 'Rekod sejarah Semakan 02 untuk penerimaan fizikal baca sahaja.',
  manpower: [{ trade_name: 'Pekerja Cerucuk', bumi_count: 1, non_bumi_count: 0, foreign_count: 4 }],
  print_context: {
    location: 'Blok Pentadbiran · Grid 1–4',
    work_start_time: '08:00',
    work_end_time: '17:00',
    weather_condition: 'ELOK',
    rain_start_time: null,
    rain_end_time: null,
    contractor_scope: 'NSC',
  },
  submitted_by: VISUAL_USER_ID,
  submitted_at: '2026-07-12T09:10:00.000Z',
  updated_at: null,
};

let currentHistoryEvents: SiteDiaryHistoryEvent[] = [
  { logId: '88888888-8888-4888-8888-888888888880', eventType: 'NEW', loggedAt: currentDiary.submitted_at, actorLabel: 'Pegawai Tapak', snapshotAvailable: true, changes: [] },
];
const historicalHistoryEvents: SiteDiaryHistoryEvent[] = [
  { logId: '99999999-8888-4888-8888-888888888880', eventType: 'NEW', loggedAt: historicalDiary.submitted_at, actorLabel: 'Pegawai Tapak', snapshotAvailable: true, changes: [] },
];

function currentProjection() {
  return {
    siteDiaryId: currentDiary.site_diary_id,
    activityId: currentDiary.activity_id,
    activityDate: currentDiary.activity_date,
    programmeId: PROGRAMME_ID,
    revisionId: REVISION_ID,
    revisionNumber: 3,
    revisionTitle: 'Semakan 03',
    revisionStatus: 'Approved',
    isCurrentRevision: true,
    isReadOnly: false,
    activityTitle: previewActivityTitle,
    activityStatus: previewActivityStatus,
    sourceType: previewSourceType,
    sourceReference: previewSourceReference,
    location: currentDiary.print_context.location,
    contractorScope: currentDiary.print_context.contractor_scope,
    diaryStatus: previewActivityStatus,
    submittedAt: currentDiary.submitted_at,
    updatedAt: currentDiary.updated_at,
    lastModifiedAt: currentDiary.updated_at ?? currentDiary.submitted_at,
    enrichmentComplete: true,
  };
}

function historicalProjection() {
  return {
    siteDiaryId: historicalDiary.site_diary_id,
    activityId: historicalDiary.activity_id,
    activityDate: historicalDiary.activity_date,
    programmeId: PROGRAMME_ID,
    revisionId: HISTORY_REVISION_ID,
    revisionNumber: 2,
    revisionTitle: 'Semakan 02',
    revisionStatus: 'Superseded',
    isCurrentRevision: false,
    isReadOnly: true,
    activityTitle: 'Kerja cerucuk Blok Pentadbiran',
    activityStatus: 'Completed',
    sourceType: 'VO',
    sourceReference: 'VO-07',
    location: historicalDiary.print_context.location,
    contractorScope: historicalDiary.print_context.contractor_scope,
    diaryStatus: 'Completed',
    submittedAt: historicalDiary.submitted_at,
    updatedAt: historicalDiary.updated_at,
    lastModifiedAt: historicalDiary.updated_at ?? historicalDiary.submitted_at,
    enrichmentComplete: true,
  };
}

function previewManpower(value: unknown): PreviewManpower[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const record = row as Record<string, unknown>;
    return [{
      trade_name: String(record.trade_name ?? 'Pekerja Tapak'),
      bumi_count: Number(record.bumi_count ?? 0),
      non_bumi_count: Number(record.non_bumi_count ?? 0),
      foreign_count: Number(record.foreign_count ?? 0),
    }];
  });
}

function previewPrintContext(value: unknown): PreviewPrintContext {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    location: String(record.location ?? currentDiary.print_context.location),
    work_start_time: typeof record.work_start_time === 'string' ? record.work_start_time : null,
    work_end_time: typeof record.work_end_time === 'string' ? record.work_end_time : null,
    weather_condition: typeof record.weather_condition === 'string' ? record.weather_condition : null,
    rain_start_time: typeof record.rain_start_time === 'string' ? record.rain_start_time : null,
    rain_end_time: typeof record.rain_end_time === 'string' ? record.rain_end_time : null,
    contractor_scope: record.contractor_scope === 'NSC' ? 'NSC' : 'CONTRACTOR',
  };
}

export function isNgamsoiPreviewMode(): boolean {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('preview') === 'ngamsoi';
}

export function createNgamsoiPreviewSession(): Session {
  const user: User = {
    id: VISUAL_USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'pt.ngamsoi@jkr.gov.my',
    email_confirmed_at: '2026-09-01T00:00:00.000Z',
    phone: '',
    confirmed_at: '2026-09-01T00:00:00.000Z',
    last_sign_in_at: '2026-09-01T00:00:00.000Z',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { display_name: 'Pegawai Tapak' },
    identities: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
    is_anonymous: false,
  };

  return {
    access_token: 'ngamsoi-lan-preview-access-token',
    refresh_token: 'ngamsoi-lan-preview-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function requestUrl(input: RequestInfo | URL): URL {
  if (input instanceof URL) return input;
  if (typeof input === 'string') return new URL(input, window.location.origin);
  return new URL(input.url, window.location.origin);
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  return (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
}

async function requestJson(input: RequestInfo | URL, init?: RequestInit): Promise<Record<string, unknown>> {
  const body = init?.body ?? (input instanceof Request ? await input.clone().text() : undefined);
  if (!body || typeof body !== 'string') return {};
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function ngamsoiPreviewFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response | null> {
  if (!isNgamsoiPreviewMode()) return null;

  const url = requestUrl(input);
  if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) return null;

  const method = requestMethod(input, init);
  const path = url.pathname;

  if (path === `/api/task/revision/${REVISION_ID}`) {
    return jsonResponse({
      data: [
        {
          task_id: TASK_ID,
          programme_id: PROGRAMME_ID,
          revision_id: REVISION_ID,
          task_uid: 184,
          wbs: '1.2.4',
          task_name: 'Kerja konkrit rasuk aras bawah · Zon B',
          outline_level: 4,
          outline_number: '1.2.4',
          trade_code: 'CONC',
          trade_name: 'Concrete Works',
          display_order: 184,
          planned_start: '2026-08-28',
          planned_finish: '2026-09-03',
          planned_duration_days: 7,
          is_milestone: false,
          is_critical: true,
          is_summary: false,
          created_at: '2026-08-01T00:00:00.000Z',
          created_by: 'interactive-preview',
        },
      ],
    });
  }

  if (path === `/api/programme/${PROGRAMME_ID}`) {
    return jsonResponse({
      data: {
        programmeId: PROGRAMME_ID,
        programmeCode: 'JKR/FPTV/UPSI',
        programmeName: 'Projek FPTV UPSI (Tawaran Semula)',
        programmeShortName: 'FPTV UPSI',
        currentRevisionId: REVISION_ID,
        status: 'Active',
        isLocked: false,
      },
    });
  }

  if (path === '/api/programme-revision' && url.searchParams.has('programmeId')) {
    return jsonResponse({
      data: [
        {
          programmeId: PROGRAMME_ID,
          revisionId: REVISION_ID,
          revisionNumber: 3,
          revisionTitle: 'Semakan 03',
          revisionStatus: 'Approved',
          isCurrentRevision: true,
          isReadOnly: false,
        },
        {
          programmeId: PROGRAMME_ID,
          revisionId: HISTORY_REVISION_ID,
          revisionNumber: 2,
          revisionTitle: 'Semakan 02',
          revisionStatus: 'Superseded',
          isCurrentRevision: false,
          isReadOnly: true,
        },
      ],
    });
  }

  if (path === '/api/project-summary') {
    return jsonResponse({
      revision_id: REVISION_ID,
      task_name: 'Projek FPTV UPSI (Tawaran Semula)',
      start_date: '2026-01-12',
      finish_date: '2027-03-31',
    });
  }

  if (path === '/api/programme' && url.searchParams.get('status') === 'Active') {
    return jsonResponse({
      data: [
        {
          id: PROGRAMME_ID,
          code: 'JKR/FPTV/UPSI',
          name: 'Projek FPTV UPSI (Tawaran Semula)',
          shortName: 'FPTV UPSI',
          contractorName: 'Kontraktor Utama',
          employerName: 'JKR',
        },
      ],
    });
  }

  if (path === '/api/vo-items') {
    if (method === 'POST') {
      const payload = await requestJson(input, init);
      const created: PreviewVoItem = {
        vo_item_id: `preview-vo-${voItems.length + 1}`,
        programme_id: String(payload.programmeId ?? PROGRAMME_ID),
        revision_id: String(payload.revisionId ?? REVISION_ID),
        vo_reference: String(payload.voReference ?? `VO-${voItems.length + 1}`),
        line_item: String(payload.lineItem ?? 'Item VO preview'),
        description: payload.description ? String(payload.description) : null,
        is_omission: Boolean(payload.isOmission),
        created_at: new Date().toISOString(),
      };
      voItems = [...voItems, created];
      return jsonResponse({ data: created }, 201);
    }
    return jsonResponse({ data: voItems });
  }

  if (path === '/api/activities') {
    if (method === 'POST') {
      const payload = await requestJson(input, init);
      previewActivityTitle = String(payload.activityName ?? previewActivityTitle);
      previewSourceType = payload.sourceType === 'VO' ? 'VO' : 'MSP';
      if (previewSourceType === 'VO') {
        const selected = voItems.find((item) => item.vo_item_id === String(payload.voItemId ?? ''));
        previewSourceReference = selected?.vo_reference ?? 'VO';
      } else {
        previewSourceReference = 'WBS 1.2.4';
      }
      previewActivityStatus = 'In Progress';
      return jsonResponse({ data: { activityId: ACTIVITY_ID } }, 201);
    }
    return jsonResponse({ data: [] });
  }

  if (path === `/api/activities/${ACTIVITY_ID}/start`) {
    previewActivityStatus = 'In Progress';
    return jsonResponse({
      data: { activity_id: ACTIVITY_ID, status: 'In Progress', actual_start_date: previewTodayIso() },
    });
  }

  if (path === `/api/activities/${ACTIVITY_ID}/complete`) {
    previewActivityStatus = 'Completed';
    return jsonResponse({
      data: { activity_id: ACTIVITY_ID, status: 'Completed', completed_date: previewTodayIso() },
    });
  }

  if (path === `/api/site-diary/revision/${REVISION_ID}` && method === 'GET') {
    return jsonResponse({ data: [currentProjection()] });
  }

  if (path === `/api/site-diary/revision/${HISTORY_REVISION_ID}` && method === 'GET') {
    return jsonResponse({ data: [historicalProjection()] });
  }

  if (path === `/api/site-diary/${SITE_DIARY_ID}/history` && method === 'GET') {
    return jsonResponse({ data: { siteDiaryId: SITE_DIARY_ID, events: currentHistoryEvents } });
  }

  if (path === `/api/site-diary/${HISTORY_SITE_DIARY_ID}/history` && method === 'GET') {
    return jsonResponse({ data: { siteDiaryId: HISTORY_SITE_DIARY_ID, events: historicalHistoryEvents } });
  }

  if (path === `/api/site-diary/${SITE_DIARY_ID}`) {
    if (method === 'PATCH') {
      const payload = await requestJson(input, init);
      const expected = typeof payload.expected_last_modified_at === 'string' ? payload.expected_last_modified_at : null;
      const actual = currentDiary.updated_at ?? currentDiary.submitted_at;
      if (!expected || expected !== actual) {
        return jsonResponse({ error: 'Rekod telah berubah. Muat semula sebelum menyimpan.' }, 409);
      }
      const updatedAt = new Date().toISOString();
      currentDiary = {
        ...currentDiary,
        notes: typeof payload.notes === 'string' ? payload.notes : currentDiary.notes,
        manpower: payload.manpower === undefined ? currentDiary.manpower : previewManpower(payload.manpower),
        print_context: payload.print_context === undefined ? currentDiary.print_context : previewPrintContext(payload.print_context),
        updated_at: updatedAt,
      };
      currentHistoryEvents = [...currentHistoryEvents, {
        logId: `preview-log-${currentHistoryEvents.length + 1}`,
        eventType: 'UPDATE',
        loggedAt: updatedAt,
        actorLabel: 'Pegawai Tapak',
        snapshotAvailable: true,
        changes: [{ kind: 'FIELD', field: 'notes', description: 'Catatan rekod dikemaskini dalam preview.' }],
      }];
      return jsonResponse({ data: { site_diary_id: SITE_DIARY_ID, lastModifiedAt: updatedAt, updated_at: updatedAt } });
    }
    if (method === 'GET') return jsonResponse({ data: currentDiary });
  }

  if (path === `/api/site-diary/${HISTORY_SITE_DIARY_ID}` && method === 'GET') {
    return jsonResponse({ data: historicalDiary });
  }

  if (path === '/api/site-diary') {
    if (method === 'POST') {
      const payload = await requestJson(input, init);
      const submittedAt = new Date().toISOString();
      currentDiary = {
        ...currentDiary,
        programme_id: String(payload.programme_id ?? PROGRAMME_ID),
        revision_id: String(payload.revision_id ?? REVISION_ID),
        activity_id: String(payload.activity_id ?? ACTIVITY_ID),
        activity_date: String(payload.activity_date ?? previewTodayIso()),
        weather: typeof payload.weather === 'string' ? payload.weather : null,
        status: previewActivityStatus,
        notes: String(payload.notes ?? ''),
        manpower: previewManpower(payload.manpower),
        print_context: previewPrintContext(payload.print_context),
        submitted_by: VISUAL_USER_ID,
        submitted_at: submittedAt,
        updated_at: null,
      };
      currentHistoryEvents = [{
        logId: '88888888-8888-4888-8888-888888888880',
        eventType: 'NEW',
        loggedAt: submittedAt,
        actorLabel: 'Pegawai Tapak',
        snapshotAvailable: true,
        changes: [],
      }];
      return jsonResponse(
        { data: { site_diary_id: SITE_DIARY_ID, siteDiaryId: SITE_DIARY_ID, lastModifiedAt: submittedAt, submitted_at: submittedAt } },
        201,
      );
    }
    if (method === 'GET') return jsonResponse({ data: [currentDiary] });
  }

  if (path === '/api/approval') {
    return jsonResponse(
      {
        data: {
          approval_id: '99999999-9999-4999-8999-999999999999',
          approval_status: 'Pending',
          site_diary_id: SITE_DIARY_ID,
        },
      },
      201,
    );
  }

  // Match the existing Playwright preview harness: unrelated app APIs are safe-empty.
  return jsonResponse({ data: [] });
}
