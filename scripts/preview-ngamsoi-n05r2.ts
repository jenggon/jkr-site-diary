import { chromium } from 'playwright';
import { installN05R2PreviewRoutes } from './n05r2-preview-routes';

const MOBILE = { width: 390, height: 844 };
const BASE_URL = process.env.N05R2_BASE_URL ?? 'http://127.0.0.1:3000';
const PROGRAMME_ID = '11111111-1111-4111-8111-111111111111';
const REVISION_ID = '22222222-2222-4222-8222-222222222222';
const TASK_ID = '33333333-3333-4333-8333-333333333333';
const VISUAL_USER_ID = '77777777-7777-4777-8777-777777777777';

function supabaseAuthStorageKey(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder-project.supabase.co';
  const projectRef = new URL(url).hostname.split('.')[0] || 'placeholder-project';
  return `sb-${projectRef}-auth-token`;
}

function previewSession(): string {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
  return JSON.stringify({
    access_token: 'n05r2-preview-access-token',
    refresh_token: 'n05r2-preview-refresh-token',
    expires_in: 3600,
    expires_at: expiresAt,
    token_type: 'bearer',
    user: {
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
    },
  });
}

async function json(route: Parameters<Parameters<import('playwright').Page['route']>[1]>[0], body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function main(): Promise<void> {
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
  });

  const context = await browser.newContext({
    viewport: MOBILE,
    screen: MOBILE,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });

  await context.addInitScript(
    ({ storageKey, session }) => {
      window.localStorage.setItem(storageKey, session);
    },
    { storageKey: supabaseAuthStorageKey(), session: previewSession() },
  );

  const page = await context.newPage();

  // Safe default for unrelated endpoints. More specific interactive fixtures below win.
  await page.route('**/api/**', async (route) => {
    await json(route, { data: [] });
  });

  await installN05R2PreviewRoutes(page, {
    programmeId: PROGRAMME_ID,
    revisionId: REVISION_ID,
  });

  await page.route(`**/api/task/revision/${REVISION_ID}`, async (route) => {
    await json(route, {
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
  });

  await page.route(`**/api/programme/${PROGRAMME_ID}`, async (route) => {
    await json(route, {
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
  });

  await page.route('**/api/programme-revision?programmeId=**', async (route) => {
    await json(route, {
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
  });

  await page.route('**/api/project-summary**', async (route) => {
    await json(route, {
      revision_id: REVISION_ID,
      task_name: 'Projek FPTV UPSI (Tawaran Semula)',
      start_date: '2026-01-12',
      finish_date: '2027-03-31',
    });
  });

  await page.route('**/api/programme?status=Active', async (route) => {
    await json(route, {
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
  });

  await page.goto(`${BASE_URL}/site-diary`, { waitUntil: 'domcontentloaded' });
  await page.bringToFront();

  console.log('NGAMSOI N05R.2 interactive preview is open at 390x844.');
  console.log('MSP, VO registration and the save/completion path are interactive preview fixtures.');
  console.log('Close the preview window when you are done.');

  await new Promise<void>((resolve) => {
    browser.on('disconnected', () => resolve());
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
