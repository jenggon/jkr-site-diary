import type { Page, Route } from 'playwright';

const ACTIVITY_ID = '44444444-4444-4444-8444-444444444444';
const SITE_DIARY_ID = '55555555-5555-4555-8555-555555555555';
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

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

export async function installN05R2PreviewRoutes(
  page: Page,
  context: { programmeId: string; revisionId: string },
): Promise<void> {
  let voItems: PreviewVoItem[] = [
    {
      vo_item_id: PREVIEW_VO_ID,
      programme_id: context.programmeId,
      revision_id: context.revisionId,
      vo_reference: 'VO-01',
      line_item: 'Kerja akses sementara ke Zon B',
      description: 'Arahan tambahan di luar aktiviti MSP semasa.',
      is_omission: false,
      created_at: '2026-09-01T00:00:00.000Z',
    },
  ];

  await page.route('**/api/vo-items**', async (route) => {
    if (route.request().method() === 'POST') {
      const payload = route.request().postDataJSON() as {
        programmeId: string;
        revisionId: string;
        voReference: string;
        lineItem: string;
        description?: string;
        isOmission?: boolean;
      };
      const created: PreviewVoItem = {
        vo_item_id: `preview-vo-${voItems.length + 1}`,
        programme_id: payload.programmeId,
        revision_id: payload.revisionId,
        vo_reference: payload.voReference,
        line_item: payload.lineItem,
        description: payload.description ?? null,
        is_omission: Boolean(payload.isOmission),
        created_at: new Date().toISOString(),
      };
      voItems = [...voItems, created];
      await json(route, { data: created }, 201);
      return;
    }
    await json(route, { data: voItems });
  });

  await page.route('**/api/activities', async (route) => {
    if (route.request().method() === 'POST') {
      await json(route, { data: { activityId: ACTIVITY_ID } }, 201);
      return;
    }
    await json(route, { data: [] });
  });

  await page.route(`**/api/activities/${ACTIVITY_ID}/start`, async (route) => {
    await json(route, {
      data: {
        activity_id: ACTIVITY_ID,
        status: 'In Progress',
        actual_start_date: '2026-09-01',
      },
    });
  });

  await page.route(`**/api/activities/${ACTIVITY_ID}/complete`, async (route) => {
    await json(route, {
      data: {
        activity_id: ACTIVITY_ID,
        status: 'Completed',
        completed_date: '2026-09-01',
      },
    });
  });

  await page.route('**/api/site-diary', async (route) => {
    if (route.request().method() === 'POST') {
      await json(route, {
        data: {
          site_diary_id: SITE_DIARY_ID,
          siteDiaryId: SITE_DIARY_ID,
          lastModifiedAt: '2026-09-01T07:30:00.000Z',
          submitted_at: '2026-09-01T07:30:00.000Z',
        },
      }, 201);
      return;
    }
    await json(route, { data: [] });
  });

  await page.route('**/api/approval', async (route) => {
    await json(route, {
      data: {
        approval_id: '99999999-9999-4999-8999-999999999999',
        approval_status: 'Pending',
        site_diary_id: SITE_DIARY_ID,
      },
    }, 201);
  });
}
