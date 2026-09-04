import { expect, type Page } from '@playwright/test';

const PROGRAMME_ID = '11111111-1111-4111-8111-111111111111';
const REVISION_ID = '22222222-2222-4222-8222-222222222222';
const TASK_ID = '33333333-3333-4333-8333-333333333333';
const ACTIVITY_ID = '44444444-4444-4444-8444-444444444444';
const SITE_DIARY_ID = '55555555-5555-4555-8555-555555555555';
const USER_ID = '77777777-7777-4777-8777-777777777777';
const VO_ID = '88888888-8888-4888-8888-888888888888';
const ACCESS_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjo0MTAyNDQ0ODAwLCJzdWIiOiI3Nzc3Nzc3Ny03Nzc3LTQ3NzctODc3Ny03Nzc3Nzc3Nzc3NzciLCJlbWFpbCI6InB0Lm5nYW1zb2lAamtyLmdvdi5teSIsInJvbGUiOiJhdXRoZW50aWNhdGVkIn0.' +
  'fixture';

function supabaseStorageKey(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
  const hostname = new URL(url).hostname;
  const projectRef = hostname.split('.')[0] || 'placeholder-project';
  return `sb-${projectRef}-auth-token`;
}

const session = {
  access_token: ACCESS_TOKEN,
  refresh_token: 'f45-e2e-refresh-token',
  expires_in: 315360000,
  expires_at: 4102444800,
  token_type: 'bearer',
  user: {
    id: USER_ID,
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
  },
};

const revisions = [
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
];

const task = {
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
  created_by: 'f45-e2e-fixture',
};

const voItem = {
  vo_item_id: VO_ID,
  programme_id: PROGRAMME_ID,
  revision_id: REVISION_ID,
  vo_reference: 'VO-01',
  line_item: 'Kerja akses sementara ke Zon B',
  description: 'Arahan tambahan di luar aktiviti MSP semasa.',
  is_omission: false,
  created_at: '2026-09-01T00:00:00.000Z',
};

function json(body: unknown) {
  return {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  };
}

export async function installF45AcceptanceFixture(page: Page) {
  const unexpectedRequests: string[] = [];
  const storageKey = supabaseStorageKey();

  await page.setExtraHTTPHeaders({ Authorization: `Bearer ${ACCESS_TOKEN}` });
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value));
      window.localStorage.removeItem('site-diary-nav-collapsed');
    },
    { key: storageKey, value: session },
  );

  await page.route(/https:\/\/[^/]+\.supabase\.co\/.*/, async (route) => {
    unexpectedRequests.push(`EXTERNAL ${route.request().method()} ${route.request().url()}`);
    await route.abort('blockedbyclient');
  });

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method().toUpperCase();
    const path = url.pathname;
    const label = `${method} ${path}${url.search}`;

    if (request.headers()['authorization'] !== `Bearer ${ACCESS_TOKEN}`) {
      unexpectedRequests.push(`${label} [missing acceptance bearer]`);
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'F45_E2E_AUTH_MISSING' }),
      });
      return;
    }

    if (method === 'GET' && path === '/api/programme' && url.searchParams.get('status') === 'Active') {
      await route.fulfill(json({
        data: [{
          id: PROGRAMME_ID,
          code: 'JKR/FPTV/UPSI',
          name: 'Projek FPTV UPSI (Tawaran Semula)',
          shortName: 'FPTV UPSI',
          contractorName: 'Kontraktor Utama',
          employerName: 'JKR',
        }],
      }));
      return;
    }

    if (method === 'GET' && path === '/api/project-summary' && url.searchParams.get('programmeId') === PROGRAMME_ID) {
      await route.fulfill(json({
        revision_id: REVISION_ID,
        task_name: 'Projek FPTV UPSI (Tawaran Semula)',
        start_date: '2026-01-12',
        finish_date: '2027-03-31',
      }));
      return;
    }

    if (method === 'GET' && path === `/api/programme/${PROGRAMME_ID}`) {
      await route.fulfill(json({
        data: {
          programmeId: PROGRAMME_ID,
          programmeCode: 'JKR/FPTV/UPSI',
          programmeName: 'Projek FPTV UPSI (Tawaran Semula)',
          programmeShortName: 'FPTV UPSI',
          currentRevisionId: REVISION_ID,
          status: 'Active',
          isLocked: false,
        },
      }));
      return;
    }

    if (method === 'GET' && path === '/api/programme-revision' && url.searchParams.get('programmeId') === PROGRAMME_ID) {
      await route.fulfill(json({ data: revisions }));
      return;
    }

    if (method === 'GET' && path === `/api/site-diary/revision/${REVISION_ID}` && url.searchParams.get('programmeId') === PROGRAMME_ID) {
      await route.fulfill(json({ data: [] }));
      return;
    }

    if (method === 'GET' && path === `/api/task/revision/${REVISION_ID}`) {
      await route.fulfill(json({ data: [task] }));
      return;
    }

    if (method === 'GET' && path === '/api/vo-items'
      && url.searchParams.get('programmeId') === PROGRAMME_ID
      && url.searchParams.get('revisionId') === REVISION_ID) {
      await route.fulfill(json({ data: [voItem] }));
      return;
    }

    if (method === 'GET' && path === '/api/weather/site' && url.searchParams.get('mode') === 'forecast') {
      await route.fulfill(json({
        data: {
          mode: 'forecast',
          date: '2026-09-04',
          provider: 'VISUAL_CROSSING',
          providerResolution: 'HOURLY',
          fetchedAt: '2026-09-04T02:30:00.000Z',
          latitude: 3.983583,
          longitude: 101.061639,
          timezone: 'Asia/Kuala_Lumpur',
          condition: 'ELOK',
          rainIntervals: [],
          current: {
            temperatureC: 31,
            conditions: 'Clear',
            precipitationProbability: 10,
          },
          nextRainWindow: null,
          hourly: [
            {
              hour: '10:00',
              temperatureC: 31,
              precipitationMm: 0,
              precipitationProbability: 10,
              rainy: false,
            },
          ],
          configurationSource: 'ENV_FALLBACK',
        },
      }));
      return;
    }

    if (method === 'GET' && path === '/api/intelligence' && url.searchParams.get('programmeId') === PROGRAMME_ID) {
      await route.fulfill(json({
        tradeResolution: {
          tradeName: 'Tukang Kayu',
          alternatives: ['Pekerja Am'],
          resolutionSource: 'MSP_RESOURCE',
        },
      }));
      return;
    }

    if (method === 'POST' && path === '/api/activities') {
      const body = request.postDataJSON() as Record<string, unknown>;
      const valid = body.programmeId === PROGRAMME_ID
        && body.revisionId === REVISION_ID
        && body.sourceType === 'MSP'
        && body.taskId === TASK_ID
        && typeof body.activityName === 'string'
        && body.activityName.length > 0;
      if (!valid) {
        unexpectedRequests.push(`${label} [unexpected create-activity payload]`);
        await route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ error: 'F45_E2E_ACTIVITY_PAYLOAD' }) });
        return;
      }
      await route.fulfill(json({ data: { activityId: ACTIVITY_ID } }));
      return;
    }

    if (method === 'POST' && path === `/api/activities/${ACTIVITY_ID}/start`) {
      const body = request.postDataJSON() as Record<string, unknown>;
      if (typeof body.actualStartDate !== 'string' || body.actualStartDate.length === 0) {
        unexpectedRequests.push(`${label} [unexpected activity-start payload]`);
        await route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ error: 'F45_E2E_START_PAYLOAD' }) });
        return;
      }
      await route.fulfill(json({ data: { activityId: ACTIVITY_ID, status: 'In Progress', actual_start_date: body.actualStartDate } }));
      return;
    }

    if (method === 'POST' && path === '/api/site-diary') {
      const body = request.postDataJSON() as Record<string, unknown>;
      const printContext = body.print_context as Record<string, unknown> | undefined;
      const valid = body.programme_id === PROGRAMME_ID
        && body.revision_id === REVISION_ID
        && body.activity_id === ACTIVITY_ID
        && body.operation_intent === 'IN_PROGRESS_DIARY'
        && typeof body.activity_date === 'string'
        && typeof body.notes === 'string'
        && body.notes.length > 0
        && typeof printContext?.location === 'string'
        && printContext.location.length > 0;
      if (!valid) {
        unexpectedRequests.push(`${label} [unexpected site-diary payload]`);
        await route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ error: 'F45_E2E_DIARY_PAYLOAD' }) });
        return;
      }
      await route.fulfill(json({ data: { site_diary_id: SITE_DIARY_ID } }));
      return;
    }

    unexpectedRequests.push(label);
    await route.fulfill({
      status: 599,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'UNEXPECTED_F45_E2E_REQUEST', request: label }),
    });
  });

  return {
    accessToken: ACCESS_TOKEN,
    assertNoUnexpectedApiCalls() {
      expect(unexpectedRequests, `Unexpected F4.5 fixture requests:\n${unexpectedRequests.join('\n')}`).toEqual([]);
    },
  };
}
