'use client';

import React, { useEffect, useState } from 'react';
import DailyEntryShell from '../../DailyEntryShell';
import SiteDiaryWorkspace from '../../SiteDiaryWorkspace';

const PROGRAMME_ID = '11111111-1111-4111-8111-111111111111';
const REVISION_ID = '22222222-2222-4222-8222-222222222222';
const TASK_ID = '33333333-3333-4333-8333-333333333333';
const ACTIVITY_ID = '44444444-4444-4444-8444-444444444444';
const SITE_DIARY_ID = '55555555-5555-4555-8555-555555555555';
const PREVIEW_VO_ID = '88888888-8888-4888-8888-888888888888';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function requestUrl(input: RequestInfo | URL): URL {
  if (typeof input === 'string') return new URL(input, window.location.origin);
  if (input instanceof URL) return new URL(input.toString(), window.location.origin);
  return new URL(input.url, window.location.origin);
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (typeof Request !== 'undefined' && input instanceof Request) return input.method.toUpperCase();
  return 'GET';
}

async function requestJson(input: RequestInfo | URL, init?: RequestInit): Promise<Record<string, unknown>> {
  if (typeof init?.body === 'string') {
    try {
      return JSON.parse(init.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof Request !== 'undefined' && input instanceof Request) {
    try {
      return await input.clone().json() as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

export default function N05R3LanPreview() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    let voItems: Array<Record<string, unknown>> = [
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

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = requestMethod(input, init);

      if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) {
        return originalFetch(input, init);
      }

      if (url.pathname === '/api/programme' && method === 'GET') {
        return jsonResponse({
          data: [{
            id: PROGRAMME_ID,
            code: 'JKR/FPTV/UPSI',
            name: 'Projek FPTV UPSI (Tawaran Semula)',
            shortName: 'FPTV UPSI',
            contractorName: 'Kontraktor Utama',
            employerName: 'JKR',
          }],
        });
      }

      if (url.pathname === '/api/project-summary' && method === 'GET') {
        return jsonResponse({
          revision_id: REVISION_ID,
          task_name: 'Projek FPTV UPSI (Tawaran Semula)',
          start_date: '2026-01-12',
          finish_date: '2027-03-31',
        });
      }

      if (url.pathname === `/api/programme/${PROGRAMME_ID}` && method === 'GET') {
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

      if (url.pathname === '/api/programme-revision' && method === 'GET') {
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

      if (url.pathname === `/api/task/revision/${REVISION_ID}` && method === 'GET') {
        return jsonResponse({
          data: [{
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
            created_by: 'lan-preview',
          }],
        });
      }

      if (url.pathname === '/api/vo-items') {
        if (method === 'POST') {
          const payload = await requestJson(input, init);
          const created = {
            vo_item_id: `preview-vo-${voItems.length + 1}`,
            programme_id: String(payload.programmeId ?? PROGRAMME_ID),
            revision_id: String(payload.revisionId ?? REVISION_ID),
            vo_reference: String(payload.voReference ?? 'VO-PREVIEW'),
            line_item: String(payload.lineItem ?? 'Kerja VO Preview'),
            description: payload.description ? String(payload.description) : null,
            is_omission: Boolean(payload.isOmission),
            created_at: new Date().toISOString(),
          };
          voItems = [...voItems, created];
          return jsonResponse({ data: created }, 201);
        }
        return jsonResponse({ data: voItems });
      }

      if (url.pathname === '/api/activities' && method === 'POST') {
        return jsonResponse({ data: { activityId: ACTIVITY_ID } }, 201);
      }

      if (url.pathname === `/api/activities/${ACTIVITY_ID}/start` && method === 'POST') {
        return jsonResponse({
          data: { activity_id: ACTIVITY_ID, status: 'In Progress', actual_start_date: '2026-09-01' },
        });
      }

      if (url.pathname === `/api/activities/${ACTIVITY_ID}/complete` && method === 'POST') {
        return jsonResponse({
          data: { activity_id: ACTIVITY_ID, status: 'Completed', completed_date: '2026-09-01' },
        });
      }

      if (url.pathname === '/api/site-diary' && method === 'POST') {
        return jsonResponse({
          data: {
            site_diary_id: SITE_DIARY_ID,
            siteDiaryId: SITE_DIARY_ID,
            lastModifiedAt: '2026-09-01T07:30:00.000Z',
            submitted_at: '2026-09-01T07:30:00.000Z',
          },
        }, 201);
      }

      if (url.pathname === '/api/approval' && method === 'POST') {
        return jsonResponse({
          data: {
            approval_id: '99999999-9999-4999-8999-999999999999',
            approval_status: 'Pending',
            site_diary_id: SITE_DIARY_ID,
          },
        }, 201);
      }

      return jsonResponse({ data: [] });
    };

    setReady(true);
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  if (!ready) {
    return <div className="min-h-screen bg-black" aria-label="Memuatkan NGAMSOI preview" />;
  }

  return (
    <DailyEntryShell>
      <SiteDiaryWorkspace />
    </DailyEntryShell>
  );
}
