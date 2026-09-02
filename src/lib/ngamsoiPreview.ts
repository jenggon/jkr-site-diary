import type { Session, User } from '@supabase/supabase-js';

const PROGRAMME_ID = '11111111-1111-4111-8111-111111111111';
const REVISION_ID = '22222222-2222-4222-8222-222222222222';
const TASK_ID = '33333333-3333-4333-8333-333333333333';
const ACTIVITY_ID = '44444444-4444-4444-8444-444444444444';
const SITE_DIARY_ID = '55555555-5555-4555-8555-555555555555';
const VISUAL_USER_ID = '77777777-7777-4777-8777-777777777777';
const PREVIEW_VO_ID = '88888888-8888-4888-8888-888888888888';

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
          revisionId: '66666666-6666-4666-8666-666666666666',
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
    if (method === 'POST') return jsonResponse({ data: { activityId: ACTIVITY_ID } }, 201);
    return jsonResponse({ data: [] });
  }

  if (path === `/api/activities/${ACTIVITY_ID}/start`) {
    return jsonResponse({
      data: { activity_id: ACTIVITY_ID, status: 'In Progress', actual_start_date: '2026-09-01' },
    });
  }

  if (path === `/api/activities/${ACTIVITY_ID}/complete`) {
    return jsonResponse({
      data: { activity_id: ACTIVITY_ID, status: 'Completed', completed_date: '2026-09-01' },
    });
  }

  if (path === '/api/site-diary') {
    if (method === 'POST') {
      return jsonResponse(
        {
          data: {
            site_diary_id: SITE_DIARY_ID,
            siteDiaryId: SITE_DIARY_ID,
            lastModifiedAt: '2026-09-01T07:30:00.000Z',
            submitted_at: '2026-09-01T07:30:00.000Z',
          },
        },
        201,
      );
    }
    return jsonResponse({ data: [] });
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
