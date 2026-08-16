'use client';

import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';

interface ExecutionDates {
  activityDate: string;
  actualStartDate: string;
}

const EMPTY_DATES: ExecutionDates = { activityDate: '', actualStartDate: '' };

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

function replaceJsonBody(init: RequestInit | undefined, body: Record<string, unknown>): RequestInit {
  return {
    ...init,
    headers: { ...(init?.headers ?? {}), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function activityIdFromLifecycleUrl(url: string): string | null {
  const match = url.match(/\/api\/activities\/([^/]+)\/(?:start|complete)(?:\?|$)/);
  return match?.[1] ?? null;
}

export default function F1GoldenPathBridge({ children }: { children: ReactNode }) {
  const datesRef = useRef<ExecutionDates>(EMPTY_DATES);
  const freshlyCreatedActivityRef = useRef<string | null>(null);
  const lifecycleRequestedRef = useRef<Set<string>>(new Set());

  const [location, setLocation] = useState('');
  const [workStartTime, setWorkStartTime] = useState('');
  const [workEndTime, setWorkEndTime] = useState('');
  const [weatherCondition, setWeatherCondition] = useState<'ELOK' | 'HUJAN' | 'MENDUNG' | 'RIBUT'>('ELOK');
  const [rainStartTime, setRainStartTime] = useState('');
  const [rainEndTime, setRainEndTime] = useState('');
  const [contractorScope, setContractorScope] = useState<'CONTRACTOR' | 'NSC'>('CONTRACTOR');

  const printContextRef = useRef({
    location: '', work_start_time: '', work_end_time: '', weather_condition: 'ELOK',
    rain_start_time: '', rain_end_time: '', contractor_scope: 'CONTRACTOR',
  });

  useEffect(() => {
    printContextRef.current = {
      location,
      work_start_time: workStartTime,
      work_end_time: workEndTime,
      weather_condition: weatherCondition,
      rain_start_time: weatherCondition === 'HUJAN' ? rainStartTime : '',
      rain_end_time: weatherCondition === 'HUJAN' ? rainEndTime : '',
      contractor_scope: contractorScope,
    };
  }, [location, workStartTime, workEndTime, weatherCondition, rainStartTime, rainEndTime, contractorScope]);

  const captureExecutionDates = (event: FormEvent<HTMLDivElement>) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const dateInputs = Array.from(form.querySelectorAll<HTMLInputElement>('input[type="date"]'));
    datesRef.current = {
      activityDate: dateInputs[0]?.value ?? '',
      actualStartDate: dateInputs[1]?.value ?? '',
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

      if (isSiteDiaryCreate) {
        const body = parseJsonBody(input, init);
        nextInit = replaceJsonBody(init, {
          ...body,
          print_context: {
            location: printContextRef.current.location.trim(),
            work_start_time: printContextRef.current.work_start_time || null,
            work_end_time: printContextRef.current.work_end_time || null,
            weather_condition: printContextRef.current.weather_condition,
            rain_start_time: printContextRef.current.rain_start_time || null,
            rain_end_time: printContextRef.current.rain_end_time || null,
            contractor_scope: printContextRef.current.contractor_scope,
          },
        });
      }

      if (isStart && lifecycleActivityId) {
        lifecycleRequestedRef.current.add(lifecycleActivityId);
        const body = parseJsonBody(input, init);
        const actualStartDate = datesRef.current.actualStartDate || datesRef.current.activityDate;
        if (actualStartDate && body.actualStartDate === undefined) {
          nextInit = replaceJsonBody(nextInit, { ...body, actualStartDate });
        }
      }

      if (isComplete && lifecycleActivityId) {
        lifecycleRequestedRef.current.add(lifecycleActivityId);
        const body = parseJsonBody(input, init);
        const actualStartDate = datesRef.current.actualStartDate || datesRef.current.activityDate;
        const completedDate = datesRef.current.activityDate;
        if (completedDate) {
          nextInit = replaceJsonBody(nextInit, {
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
        if (typeof activityId === 'string' && activityId) freshlyCreatedActivityRef.current = activityId;
      }

      if (isSiteDiaryCreate && response.ok) {
        const body = parseJsonBody(input, nextInit);
        const activityId = typeof body.activity_id === 'string' ? body.activity_id : null;
        if (activityId && freshlyCreatedActivityRef.current === activityId) {
          window.setTimeout(async () => {
            if (lifecycleRequestedRef.current.has(activityId)) return;
            const actualStartDate = datesRef.current.actualStartDate || datesRef.current.activityDate;
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

    return () => { window.fetch = originalFetch; };
  }, []);

  return (
    <div onSubmitCapture={captureExecutionDates}>
      <div className="mx-auto w-full max-w-md bg-zinc-950 px-6 pt-5 text-white">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-lg">
          <div className="mb-3 text-sm font-bold">Maklumat Cetakan JKR</div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <label className="col-span-2">Lokasi Aktiviti/Kerja
              <input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2" placeholder="Contoh: Ground Beam Blok A, Grid A1-A4" />
            </label>
            <label>Waktu Mula<input type="time" value={workStartTime} onChange={(e) => setWorkStartTime(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2" /></label>
            <label>Waktu Tamat<input type="time" value={workEndTime} onChange={(e) => setWorkEndTime(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2" /></label>
            <label>Cuaca
              <select value={weatherCondition} onChange={(e) => setWeatherCondition(e.target.value as typeof weatherCondition)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2">
                <option value="ELOK">Elok</option><option value="HUJAN">Hujan</option><option value="MENDUNG">Mendung</option><option value="RIBUT">Ribut</option>
              </select>
            </label>
            <label>Skop
              <select value={contractorScope} onChange={(e) => setContractorScope(e.target.value as typeof contractorScope)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2">
                <option value="CONTRACTOR">Kontraktor</option><option value="NSC">NSC</option>
              </select>
            </label>
            {weatherCondition === 'HUJAN' && <>
              <label>Hujan Mula<input type="time" value={rainStartTime} onChange={(e) => setRainStartTime(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2" /></label>
              <label>Hujan Tamat<input type="time" value={rainEndTime} onChange={(e) => setRainEndTime(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2" /></label>
            </>}
          </div>
        </section>
      </div>
      {children}
    </div>
  );
}
