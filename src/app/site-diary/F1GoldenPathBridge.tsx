'use client';

import { FormEvent, ReactNode, useEffect, useRef } from 'react';

interface ExecutionDates {
  activityDate: string;
  actualStartDate: string;
}

const EMPTY_DATES: ExecutionDates = {
  activityDate: '',
  actualStartDate: '',
};

function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function getMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (input instanceof Request) return input.method.toUpperCase();
  return 'GET';
}

function parseJsonBody(input: RequestInfo | URL, init?: RequestInit): Record<string, unknown> {
  const body = init?.body ?? (input instanceof Request ? undefined : null);
  if (typeof body !== 'string') return {};
  try {
    const parsed = JSON.parse(body);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function replaceJsonBody(
  init: RequestInit | undefined,
  body: Record<string, unknown>
): RequestInit {
  return {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

function activityIdFromLifecycleUrl(url: string): string | null {
  const match = url.match(/\/api\/activities\/([^/]+)\/(?:start|complete)(?:\?|$)/);
  return match?.[1] ?? null;
}

/**
 * F1 compatibility bridge for the existing Site Diary screen.
 *
 * The frozen UI already captures Activity Date and, when required, Known Start
 * Date. The legacy submit handler predates the A27 canonical lifecycle routes,
 * so this bridge supplies those already-captured values to the canonical APIs
 * without redesigning the screen or reopening Activity architecture.
 *
 * It also closes the existing `Mula` gap: a newly provisioned Activity that has
 * a successful first Site Diary but whose legacy handler sends no explicit
 * lifecycle request is started after the current submit turn. If the handler
 * does request Start/Complete, that request wins and the fallback is cancelled.
 */
export default function F1GoldenPathBridge({ children }: { children: ReactNode }) {
  const datesRef = useRef<ExecutionDates>(EMPTY_DATES);
  const freshlyCreatedActivityRef = useRef<string | null>(null);
  const lifecycleRequestedRef = useRef<Set<string>>(new Set());

  const captureExecutionDates = (event: FormEvent<HTMLDivElement>) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    const dateInputs = Array.from(
      form.querySelectorAll<HTMLInputElement>('input[type="date"]')
    );

    const activityDate = dateInputs[0]?.value ?? '';
    const actualStartDate = dateInputs[1]?.value ?? '';

    datesRef.current = {
      activityDate,
      actualStartDate,
    };
    lifecycleRequestedRef.current.clear();
  };

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = getRequestUrl(input);
      const method = getMethod(input, init);
      const isActivityCreate = method === 'POST' && /\/api\/activities(?:\?|$)/.test(url);
      const isSiteDiaryCreate = method === 'POST' && /\/api\/site-diary(?:\?|$)/.test(url);
      const lifecycleActivityId = activityIdFromLifecycleUrl(url);
      const isStart = method === 'POST' && /\/start(?:\?|$)/.test(url) && lifecycleActivityId;
      const isComplete = method === 'POST' && /\/complete(?:\?|$)/.test(url) && lifecycleActivityId;

      let nextInit = init;

      if (isStart && lifecycleActivityId) {
        lifecycleRequestedRef.current.add(lifecycleActivityId);
        const body = parseJsonBody(input, init);
        const actualStartDate =
          datesRef.current.actualStartDate || datesRef.current.activityDate;

        if (actualStartDate && body.actualStartDate === undefined) {
          nextInit = replaceJsonBody(init, {
            ...body,
            actualStartDate,
          });
        }
      }

      if (isComplete && lifecycleActivityId) {
        lifecycleRequestedRef.current.add(lifecycleActivityId);
        const body = parseJsonBody(input, init);
        const actualStartDate =
          datesRef.current.actualStartDate || datesRef.current.activityDate;
        const completedDate = datesRef.current.activityDate;

        if (completedDate) {
          nextInit = replaceJsonBody(init, {
            ...body,
            ...(actualStartDate ? { actualStartDate } : {}),
            completedDate,
          });
        }
      }

      const response = await originalFetch(input, nextInit);

      if (isActivityCreate && response.ok) {
        const payload = await response.clone().json().catch(() => null);
        const activityId = payload?.data?.activityId;
        if (typeof activityId === 'string' && activityId) {
          freshlyCreatedActivityRef.current = activityId;
        }
      }

      if (isSiteDiaryCreate && response.ok) {
        const body = parseJsonBody(input, init);
        const activityId =
          typeof body.activity_id === 'string' ? body.activity_id : null;

        if (
          activityId &&
          freshlyCreatedActivityRef.current === activityId
        ) {
          window.setTimeout(async () => {
            if (lifecycleRequestedRef.current.has(activityId)) return;

            const actualStartDate =
              datesRef.current.actualStartDate || datesRef.current.activityDate;
            if (!actualStartDate) return;

            lifecycleRequestedRef.current.add(activityId);
            await originalFetch(`/api/activities/${activityId}/start`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ actualStartDate }),
            });
          }, 0);
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return <div onSubmitCapture={captureExecutionDates}>{children}</div>;
}
