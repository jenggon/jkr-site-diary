import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const file = (path) => join(root, path);
const read = (path) => readFileSync(file(path), 'utf8').replace(/\r\n/g, '\n');
const write = (path, content) => writeFileSync(file(path), content, 'utf8');

function replaceOnce(path, from, to) {
  const source = read(path);
  const count = source.split(from).length - 1;
  if (count !== 1) {
    throw new Error(`${path}: expected exactly one match, found ${count}: ${from.slice(0, 120)}`);
  }
  write(path, source.replace(from, to));
}

function replaceAllExact(path, from, to, expectedMinimum = 1) {
  const source = read(path);
  const count = source.split(from).length - 1;
  if (count < expectedMinimum) {
    throw new Error(`${path}: expected at least ${expectedMinimum} matches, found ${count}: ${from.slice(0, 120)}`);
  }
  write(path, source.split(from).join(to));
}

const lockDoc = 'docs/10_Development/N09A-PHYSICAL-ACCEPTANCE-R1-LOCKS.md';
if (!existsSync(file(lockDoc))) throw new Error('N09A physical R1 lock document is missing');

// ---------------------------------------------------------------------------
// 1. ACTIVE LOCKSET — P1-P8 durable machine-readable capture.
// ---------------------------------------------------------------------------
const locksetPath = 'docs/00_Governance/ACTIVE_LOCKSET.json';
const lockset = JSON.parse(read(locksetPath));
if (lockset.locksetVersion !== '2026.09.06.1') {
  throw new Error(`Unexpected starting lockset ${lockset.locksetVersion}`);
}

const additions = [
  {
    id: 'NGUI-SOURCE-001',
    title: 'Field-language source vocabulary',
    state: 'LOCKED',
    statement: 'Internal sourceType MSP and VO semantics remain unchanged, but normal user-facing source-category language is Skop Kontrak for MSP and Perubahan Skop (VO) for VO. The mapping must be consistent in CATAT source selection, selected-source presentation, REKOD source filters, record rows and REKOD detail context. /APK and raw MSP must not remain as normal source-category labels. Specific VO references such as VO-01 remain valid identifiers.',
    enforcement: [
      { type: 'source', path: lockDoc },
      { type: 'source', path: 'src/app/site-diary/sourcePresentation.ts' },
      { type: 'test', path: 'tests/unit/ui/f45FinalVisualContract.test.ts' },
      { type: 'browser', path: 'tests/e2e/n09a-records-current-state.e2e.spec.ts' },
      { type: 'manual', note: 'Product Owner must confirm Skop Kontrak / Perubahan Skop (VO) copy across CATAT and REKOD during resumed N09A physical acceptance.' },
    ],
  },
  {
    id: 'NGUI-PELAKSANA-001',
    title: 'Pelaksana wording retained',
    state: 'LOCKED',
    statement: 'The accepted user-facing executor language remains PELAKSANA with Kontraktor Utama and NSC choices. Existing internal CONTRACTOR and NSC persistence/domain values remain unchanged. N09A physical remediation must not reopen or rename this accepted terminology.',
    enforcement: [
      { type: 'source', path: lockDoc },
      { type: 'test', path: 'tests/integration/ui/diaryManagementList.test.ts' },
      { type: 'browser', path: 'tests/e2e/n09a-records-current-state.e2e.spec.ts' },
    ],
  },
  {
    id: 'NGUI-DATE-001',
    title: 'Shared HARIAN date grammar and no-future rule',
    state: 'LOCKED',
    statement: 'CATAT HARIAN is the accepted date-control grammar. REKOD Tarikh mula and Tarikh akhir retain range semantics but reuse the same date-control visual family. CATAT diary date and REKOD filter dates may be today or any past date but must not allow a future local date. This does not change Programme dates, Actual Start authority, historical records, provider evidence or database authority.',
    enforcement: [
      { type: 'source', path: lockDoc },
      { type: 'test', path: 'tests/unit/ui/f45FinalVisualContract.test.ts' },
      { type: 'test', path: 'tests/integration/ui/diaryManagementList.test.ts' },
      { type: 'browser', path: 'tests/e2e/n09a-records-current-state.e2e.spec.ts' },
      { type: 'manual', note: 'Product Owner must confirm the REKOD date controls visually match the accepted HARIAN date grammar and cannot select future dates.' },
    ],
  },
  {
    id: 'NGUI-PREVIEW-001',
    title: 'Interactive preview supports the physical REKOD acceptance path',
    state: 'LOCKED',
    statement: 'The existing development-only preview=ngamsoi boundary may keep in-memory canonical-shaped state solely for physical UI acceptance. A successful preview CATAT Save must be readable through preview REKOD; preview exposes at least one current Approved editable record and one Superseded read-only historical record, with normal UI reachability through Tunjuk Rekod, Lihat Butiran, workforce/audit readback, Edit Rekod, Batal and historical read-only detail. Preview must not alter production persistence, database, auth, RLS/RBAC, revision/edit authority or add a production bypass.',
    enforcement: [
      { type: 'source', path: lockDoc },
      { type: 'source', path: 'src/lib/ngamsoiPreview.ts' },
      { type: 'test', path: 'tests/unit/ui/ngamsoiPreviewN09AR1.test.ts' },
      { type: 'manual', note: 'Product Owner resumes N09A physical acceptance only after the normal preview path CATAT -> Save -> Tunjuk Rekod -> Detail -> Edit/Batal -> historical read-only is reachable.' },
    ],
  },
];

const existingIds = new Set(lockset.requirements.map((item) => item.id));
for (const requirement of additions) {
  if (existingIds.has(requirement.id)) throw new Error(`Lockset already contains ${requirement.id}`);
  lockset.requirements.push(requirement);
}
lockset.locksetVersion = '2026.09.06.2';
lockset.activeProgramme = {
  ...lockset.activeProgramme,
  currentStage: 'N09A_PHYSICAL_R1_REMEDIATION',
  physicalAcceptanceStatus: 'REMEDIATION_REQUIRED',
};
write(locksetPath, JSON.stringify(lockset));

// ---------------------------------------------------------------------------
// 2. Shared source presentation authority.
// ---------------------------------------------------------------------------
write('src/app/site-diary/sourcePresentation.ts', `export type OperationalSourceCode = 'MSP' | 'VO';

export const OPERATIONAL_SOURCE_LABELS: Readonly<Record<OperationalSourceCode, string>> = {
  MSP: 'Skop Kontrak',
  VO: 'Perubahan Skop (VO)',
};

export function operationalSourceLabel(value: string | null | undefined): string {
  if (value === 'MSP' || value === 'VO') return OPERATIONAL_SOURCE_LABELS[value];
  return value?.trim() || 'Tidak tersedia';
}

export function operationalSourceMark(value: OperationalSourceCode): string {
  return value === 'MSP' ? 'SKOP' : 'VO';
}
`);

// ---------------------------------------------------------------------------
// 3. CATAT source vocabulary + no-future HARIAN date.
// ---------------------------------------------------------------------------
const selector = 'src/app/site-diary/OperationalSourceSelector.tsx';
replaceOnce(selector,
  "import { Task } from '@/types/task';\n",
  "import { Task } from '@/types/task';\nimport { operationalSourceLabel, operationalSourceMark } from './sourcePresentation';\n",
);
replaceAllExact(selector, 'Gagal memuatkan tugasan jadual (MSP)', 'Gagal memuatkan Skop Kontrak');
replaceAllExact(selector, 'Ralat memuatkan kerja jadual (MSP)', 'Ralat memuatkan Skop Kontrak');
replaceAllExact(selector, 'Gagal memuatkan rekod VO / APK', 'Gagal memuatkan Perubahan Skop (VO)');
replaceAllExact(selector, 'Ralat memuatkan item VO / APK', 'Ralat memuatkan Perubahan Skop (VO)');
replaceOnce(selector,
  '              {currentSelection.sourceType}\n',
  '              {operationalSourceMark(currentSelection.sourceType)}\n',
);
replaceOnce(selector,
  "                  {currentSelection.sourceType === 'MSP' ? 'Jadual MSP' : 'VO / APK'}\n",
  '                  {operationalSourceLabel(currentSelection.sourceType)}\n',
);
replaceOnce(selector, '>\n              MSP\n            </button>', '>\n              Skop Kontrak\n            </button>');
replaceOnce(selector, '>\n              VO / APK\n            </button>', '>\n              Perubahan Skop (VO)\n            </button>');
replaceOnce(selector,
  "aria-label={activeTab === 'MSP' ? 'Cari tugasan MSP' : 'Cari kerja VO atau APK'}",
  "aria-label={activeTab === 'MSP' ? 'Cari kerja Skop Kontrak' : 'Cari Perubahan Skop (VO)'}",
);
replaceAllExact(selector, 'Tiada tugasan MSP ditemui.', 'Tiada kerja Skop Kontrak ditemui.');
replaceOnce(selector,
  'Tiada VO / APK ditemui. Daftar hanya jika kerja itu memang di luar jadual MSP semasa.',
  'Tiada Perubahan Skop (VO) ditemui. Daftar hanya jika kerja itu memang di luar Skop Kontrak semasa.',
);
replaceAllExact(selector, 'Sumber luar MSP', 'Di luar Skop Kontrak');
replaceAllExact(selector, 'VO / APK Baharu', 'Perubahan Skop (VO) Baharu');
replaceAllExact(selector, 'Contoh: VO-03 / APK-01', 'Contoh: VO-03');

const catat = 'src/app/site-diary/CatatEntryForm.tsx';
replaceAllExact(catat, 'Pilih kerja MSP atau VO dahulu.', 'Pilih Skop Kontrak atau Perubahan Skop (VO) dahulu.');
replaceOnce(catat,
  '<input type="date" value={activityDate} onChange={(event) => setActivityDate(event.target.value)} disabled={isSubmitting || Boolean(successId)} aria-label="Tarikh catatan" className="ng-entry-date" />',
  '<input type="date" value={activityDate} max={todayIso()} data-date-authority="HARIAN" onChange={(event) => setActivityDate(event.target.value)} disabled={isSubmitting || Boolean(successId)} aria-label="Tarikh catatan" className="ng-entry-date" />',
);

// ---------------------------------------------------------------------------
// 4. REKOD source presentation + HARIAN-aligned bounded date inputs.
// ---------------------------------------------------------------------------
const list = 'src/app/site-diary/DiaryManagementList.tsx';
replaceOnce(list,
  "import DailyEntryForm from './DailyEntryForm';\n",
  "import DailyEntryForm from './DailyEntryForm';\nimport { operationalSourceLabel } from './sourcePresentation';\n",
);
replaceOnce(list,
  "function displayPelaksana(value: string | null | undefined): string {\n  if (value === 'CONTRACTOR') return 'Kontraktor Utama';\n  if (value === 'NSC') return 'NSC';\n  return value?.trim() || FALLBACK;\n}\n",
  "function displayPelaksana(value: string | null | undefined): string {\n  if (value === 'CONTRACTOR') return 'Kontraktor Utama';\n  if (value === 'NSC') return 'NSC';\n  return value?.trim() || FALLBACK;\n}\n\nfunction todayIsoLocal(): string {\n  const now = new Date();\n  const year = now.getFullYear();\n  const month = String(now.getMonth() + 1).padStart(2, '0');\n  const day = String(now.getDate()).padStart(2, '0');\n  return `${year}-${month}-${day}`;\n}\n\nfunction boundToToday(value: string, today: string): string {\n  return value && value > today ? today : value;\n}\n",
);
replaceOnce(list,
  '  const [detailRefresh, setDetailRefresh] = useState(0);\n',
  '  const [detailRefresh, setDetailRefresh] = useState(0);\n  const currentLocalDate = todayIsoLocal();\n',
);
replaceOnce(list,
  '            <input aria-label="Tarikh mula" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)}\n              className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-2" />',
  '            <input aria-label="Tarikh mula" type="date" value={dateFrom} max={currentLocalDate} data-record-date="from" onChange={(event) => setDateFrom(boundToToday(event.target.value, currentLocalDate))}\n              className="ng-entry-date mt-1 min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-2" />',
);
replaceOnce(list,
  '            <input aria-label="Tarikh akhir" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)}\n              className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-2" />',
  '            <input aria-label="Tarikh akhir" type="date" value={dateTo} max={currentLocalDate} data-record-date="to" onChange={(event) => setDateTo(boundToToday(event.target.value, currentLocalDate))}\n              className="ng-entry-date mt-1 min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-2" />',
);
replaceOnce(list,
  '              <option value="ALL">Semua</option><option value="MSP">MSP</option><option value="VO">VO</option>',
  '              <option value="ALL">Semua</option><option value="MSP">Skop Kontrak</option><option value="VO">Perubahan Skop (VO)</option>',
);
replaceOnce(list,
  '{diary.sourceType && <span className="rounded-lg bg-zinc-800 px-2 py-1 text-xs font-bold">{diary.sourceType}</span>}',
  '{diary.sourceType && <span className="rounded-lg bg-zinc-800 px-2 py-1 text-xs font-bold">{operationalSourceLabel(diary.sourceType)}</span>}',
);

const detail = 'src/app/site-diary/DiaryDetail.tsx';
replaceOnce(detail,
  "import DiaryHistoryTimeline from './DiaryHistoryTimeline';\n",
  "import DiaryHistoryTimeline from './DiaryHistoryTimeline';\nimport { operationalSourceLabel } from './sourcePresentation';\n",
);
replaceOnce(detail,
  '<header><p className="text-xs text-blue-300">{projection.sourceType ?? FALLBACK} · {display(projection.sourceReference)}</p>',
  '<header><p className="text-xs text-blue-300">{operationalSourceLabel(projection.sourceType)} · {display(projection.sourceReference)}</p>',
);

// ---------------------------------------------------------------------------
// 5. Development-only interactive preview becomes stateful enough for P7/P8.
// ---------------------------------------------------------------------------
const preview = 'src/lib/ngamsoiPreview.ts';
replaceOnce(preview,
  "const PREVIEW_VO_ID = '88888888-8888-4888-8888-888888888888';\n",
  "const PREVIEW_VO_ID = '88888888-8888-4888-8888-888888888888';\nconst HISTORY_REVISION_ID = '66666666-6666-4666-8666-666666666666';\nconst HISTORY_ACTIVITY_ID = '44444444-4444-4444-9444-444444444449';\nconst HISTORY_SITE_DIARY_ID = '55555555-5555-4555-9555-555555555559';\n",
);
replaceOnce(preview,
  "];\n\nexport function isNgamsoiPreviewMode(): boolean {",
  `];\n\ntype PreviewSourceType = 'MSP' | 'VO';\ntype PreviewManpower = { trade_name: string; bumi_count: number; non_bumi_count: number; foreign_count: number };\ntype PreviewPrintContext = {\n  location: string;\n  work_start_time: string | null;\n  work_end_time: string | null;\n  weather_condition: string | null;\n  rain_start_time: string | null;\n  rain_end_time: string | null;\n  contractor_scope: 'CONTRACTOR' | 'NSC';\n};\ntype PreviewDiary = {\n  site_diary_id: string;\n  programme_id: string;\n  revision_id: string;\n  activity_id: string;\n  activity_date: string;\n  weather: string | null;\n  status: 'In Progress' | 'Completed';\n  notes: string;\n  manpower: PreviewManpower[];\n  print_context: PreviewPrintContext;\n  submitted_by: string;\n  submitted_at: string;\n  updated_at: string | null;\n};\n\nfunction previewTodayIso(): string {\n  const now = new Date();\n  const year = now.getFullYear();\n  const month = String(now.getMonth() + 1).padStart(2, '0');\n  const day = String(now.getDate()).padStart(2, '0');\n  return \`${'${year}'}-${'${month}'}-${'${day}'}\`;\n}\n\nlet previewActivityTitle = 'Kerja konkrit rasuk aras bawah · Zon B';\nlet previewSourceType: PreviewSourceType = 'MSP';\nlet previewSourceReference = 'WBS 1.2.4';\nlet previewActivityStatus: 'In Progress' | 'Completed' = 'In Progress';\n\nlet currentDiary: PreviewDiary = {\n  site_diary_id: SITE_DIARY_ID,\n  programme_id: PROGRAMME_ID,\n  revision_id: REVISION_ID,\n  activity_id: ACTIVITY_ID,\n  activity_date: previewTodayIso(),\n  weather: 'Sunny',\n  status: 'In Progress',\n  notes: 'Rekod semasa untuk penerimaan fizikal NGAMSOI.',\n  manpower: [{ trade_name: 'Pembengkok Besi', bumi_count: 0, non_bumi_count: 0, foreign_count: 3 }],\n  print_context: {\n    location: 'Blok Pentadbiran · Grid 4–8',\n    work_start_time: '08:00',\n    work_end_time: '17:00',\n    weather_condition: 'ELOK',\n    rain_start_time: null,\n    rain_end_time: null,\n    contractor_scope: 'CONTRACTOR',\n  },\n  submitted_by: VISUAL_USER_ID,\n  submitted_at: new Date().toISOString(),\n  updated_at: null,\n};\n\nconst historicalDiary: PreviewDiary = {\n  site_diary_id: HISTORY_SITE_DIARY_ID,\n  programme_id: PROGRAMME_ID,\n  revision_id: HISTORY_REVISION_ID,\n  activity_id: HISTORY_ACTIVITY_ID,\n  activity_date: '2026-07-12',\n  weather: 'Sunny',\n  status: 'Completed',\n  notes: 'Rekod sejarah Semakan 02 untuk penerimaan fizikal baca sahaja.',\n  manpower: [{ trade_name: 'Pekerja Cerucuk', bumi_count: 1, non_bumi_count: 0, foreign_count: 4 }],\n  print_context: {\n    location: 'Blok Pentadbiran · Grid 1–4',\n    work_start_time: '08:00',\n    work_end_time: '17:00',\n    weather_condition: 'ELOK',\n    rain_start_time: null,\n    rain_end_time: null,\n    contractor_scope: 'NSC',\n  },\n  submitted_by: VISUAL_USER_ID,\n  submitted_at: '2026-07-12T09:10:00.000Z',\n  updated_at: null,\n};\n\nlet currentHistoryEvents = [\n  { logId: '88888888-8888-4888-8888-888888888880', eventType: 'NEW', loggedAt: currentDiary.submitted_at, actorLabel: 'Pegawai Tapak', snapshotAvailable: true, changes: [] },\n];\nconst historicalHistoryEvents = [\n  { logId: '99999999-8888-4888-8888-888888888880', eventType: 'NEW', loggedAt: historicalDiary.submitted_at, actorLabel: 'Pegawai Tapak', snapshotAvailable: true, changes: [] },\n];\n\nfunction currentProjection() {\n  return {\n    siteDiaryId: currentDiary.site_diary_id,\n    activityId: currentDiary.activity_id,\n    activityDate: currentDiary.activity_date,\n    programmeId: PROGRAMME_ID,\n    revisionId: REVISION_ID,\n    revisionNumber: 3,\n    revisionTitle: 'Semakan 03',\n    revisionStatus: 'Approved',\n    isCurrentRevision: true,\n    isReadOnly: false,\n    activityTitle: previewActivityTitle,\n    activityStatus: previewActivityStatus,\n    sourceType: previewSourceType,\n    sourceReference: previewSourceReference,\n    location: currentDiary.print_context.location,\n    contractorScope: currentDiary.print_context.contractor_scope,\n    diaryStatus: previewActivityStatus,\n    submittedAt: currentDiary.submitted_at,\n    updatedAt: currentDiary.updated_at,\n    lastModifiedAt: currentDiary.updated_at ?? currentDiary.submitted_at,\n    enrichmentComplete: true,\n  };\n}\n\nfunction historicalProjection() {\n  return {\n    siteDiaryId: historicalDiary.site_diary_id,\n    activityId: historicalDiary.activity_id,\n    activityDate: historicalDiary.activity_date,\n    programmeId: PROGRAMME_ID,\n    revisionId: HISTORY_REVISION_ID,\n    revisionNumber: 2,\n    revisionTitle: 'Semakan 02',\n    revisionStatus: 'Superseded',\n    isCurrentRevision: false,\n    isReadOnly: true,\n    activityTitle: 'Kerja cerucuk Blok Pentadbiran',\n    activityStatus: 'Completed',\n    sourceType: 'VO',\n    sourceReference: 'VO-07',\n    location: historicalDiary.print_context.location,\n    contractorScope: historicalDiary.print_context.contractor_scope,\n    diaryStatus: 'Completed',\n    submittedAt: historicalDiary.submitted_at,\n    updatedAt: historicalDiary.updated_at,\n    lastModifiedAt: historicalDiary.updated_at ?? historicalDiary.submitted_at,\n    enrichmentComplete: true,\n  };\n}\n\nfunction previewManpower(value: unknown): PreviewManpower[] {\n  if (!Array.isArray(value)) return [];\n  return value.flatMap((row) => {\n    if (!row || typeof row !== 'object') return [];\n    const record = row as Record<string, unknown>;\n    return [{\n      trade_name: String(record.trade_name ?? 'Pekerja Tapak'),\n      bumi_count: Number(record.bumi_count ?? 0),\n      non_bumi_count: Number(record.non_bumi_count ?? 0),\n      foreign_count: Number(record.foreign_count ?? 0),\n    }];\n  });\n}\n\nfunction previewPrintContext(value: unknown): PreviewPrintContext {\n  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};\n  return {\n    location: String(record.location ?? currentDiary.print_context.location),\n    work_start_time: typeof record.work_start_time === 'string' ? record.work_start_time : null,\n    work_end_time: typeof record.work_end_time === 'string' ? record.work_end_time : null,\n    weather_condition: typeof record.weather_condition === 'string' ? record.weather_condition : null,\n    rain_start_time: typeof record.rain_start_time === 'string' ? record.rain_start_time : null,\n    rain_end_time: typeof record.rain_end_time === 'string' ? record.rain_end_time : null,\n    contractor_scope: record.contractor_scope === 'NSC' ? 'NSC' : 'CONTRACTOR',\n  };\n}\n\nexport function isNgamsoiPreviewMode(): boolean {`,
);
replaceAllExact(preview, "revisionId: '66666666-6666-4666-8666-666666666666'", 'revisionId: HISTORY_REVISION_ID');
replaceOnce(preview,
  "  if (path === '/api/activities') {\n    if (method === 'POST') return jsonResponse({ data: { activityId: ACTIVITY_ID } }, 201);\n    return jsonResponse({ data: [] });\n  }",
  `  if (path === '/api/activities') {\n    if (method === 'POST') {\n      const payload = await requestJson(input, init);\n      previewActivityTitle = String(payload.activityName ?? previewActivityTitle);\n      previewSourceType = payload.sourceType === 'VO' ? 'VO' : 'MSP';\n      if (previewSourceType === 'VO') {\n        const selected = voItems.find((item) => item.vo_item_id === String(payload.voItemId ?? ''));\n        previewSourceReference = selected?.vo_reference ?? 'VO';\n      } else {\n        previewSourceReference = 'WBS 1.2.4';\n      }\n      previewActivityStatus = 'In Progress';\n      return jsonResponse({ data: { activityId: ACTIVITY_ID } }, 201);\n    }\n    return jsonResponse({ data: [] });\n  }`,
);
replaceOnce(preview,
  "  if (path === `/api/activities/${ACTIVITY_ID}/start`) {\n    return jsonResponse({\n      data: { activity_id: ACTIVITY_ID, status: 'In Progress', actual_start_date: '2026-09-01' },\n    });\n  }",
  "  if (path === `/api/activities/${ACTIVITY_ID}/start`) {\n    previewActivityStatus = 'In Progress';\n    return jsonResponse({\n      data: { activity_id: ACTIVITY_ID, status: 'In Progress', actual_start_date: previewTodayIso() },\n    });\n  }",
);
replaceOnce(preview,
  "  if (path === `/api/activities/${ACTIVITY_ID}/complete`) {\n    return jsonResponse({\n      data: { activity_id: ACTIVITY_ID, status: 'Completed', completed_date: '2026-09-01' },\n    });\n  }",
  "  if (path === `/api/activities/${ACTIVITY_ID}/complete`) {\n    previewActivityStatus = 'Completed';\n    return jsonResponse({\n      data: { activity_id: ACTIVITY_ID, status: 'Completed', completed_date: previewTodayIso() },\n    });\n  }",
);
replaceOnce(preview,
  `  if (path === '/api/site-diary') {\n    if (method === 'POST') {\n      return jsonResponse(\n        {\n          data: {\n            site_diary_id: SITE_DIARY_ID,\n            siteDiaryId: SITE_DIARY_ID,\n            lastModifiedAt: '2026-09-01T07:30:00.000Z',\n            submitted_at: '2026-09-01T07:30:00.000Z',\n          },\n        },\n        201,\n      );\n    }\n    return jsonResponse({ data: [] });\n  }`,
  `  if (path === \`/api/site-diary/revision/${'${REVISION_ID}'}\` && method === 'GET') {\n    return jsonResponse({ data: [currentProjection()] });\n  }\n\n  if (path === \`/api/site-diary/revision/${'${HISTORY_REVISION_ID}'}\` && method === 'GET') {\n    return jsonResponse({ data: [historicalProjection()] });\n  }\n\n  if (path === \`/api/site-diary/${'${SITE_DIARY_ID}'}/history\` && method === 'GET') {\n    return jsonResponse({ data: { siteDiaryId: SITE_DIARY_ID, events: currentHistoryEvents } });\n  }\n\n  if (path === \`/api/site-diary/${'${HISTORY_SITE_DIARY_ID}'}/history\` && method === 'GET') {\n    return jsonResponse({ data: { siteDiaryId: HISTORY_SITE_DIARY_ID, events: historicalHistoryEvents } });\n  }\n\n  if (path === \`/api/site-diary/${'${SITE_DIARY_ID}'}\`) {\n    if (method === 'PATCH') {\n      const payload = await requestJson(input, init);\n      const expected = typeof payload.expected_last_modified_at === 'string' ? payload.expected_last_modified_at : null;\n      const actual = currentDiary.updated_at ?? currentDiary.submitted_at;\n      if (!expected || expected !== actual) {\n        return jsonResponse({ error: 'Rekod telah berubah. Muat semula sebelum menyimpan.' }, 409);\n      }\n      const updatedAt = new Date().toISOString();\n      currentDiary = {\n        ...currentDiary,\n        notes: typeof payload.notes === 'string' ? payload.notes : currentDiary.notes,\n        manpower: payload.manpower === undefined ? currentDiary.manpower : previewManpower(payload.manpower),\n        print_context: payload.print_context === undefined ? currentDiary.print_context : previewPrintContext(payload.print_context),\n        updated_at: updatedAt,\n      };\n      currentHistoryEvents = [...currentHistoryEvents, {\n        logId: \`preview-log-${'${currentHistoryEvents.length + 1}'}\`,\n        eventType: 'UPDATE',\n        loggedAt: updatedAt,\n        actorLabel: 'Pegawai Tapak',\n        snapshotAvailable: true,\n        changes: [{ kind: 'FIELD', field: 'notes', description: 'Catatan rekod dikemaskini dalam preview.' }],\n      }];\n      return jsonResponse({ data: { site_diary_id: SITE_DIARY_ID, lastModifiedAt: updatedAt, updated_at: updatedAt } });\n    }\n    if (method === 'GET') return jsonResponse({ data: currentDiary });\n  }\n\n  if (path === \`/api/site-diary/${'${HISTORY_SITE_DIARY_ID}'}\` && method === 'GET') {\n    return jsonResponse({ data: historicalDiary });\n  }\n\n  if (path === '/api/site-diary') {\n    if (method === 'POST') {\n      const payload = await requestJson(input, init);\n      const submittedAt = new Date().toISOString();\n      currentDiary = {\n        ...currentDiary,\n        programme_id: String(payload.programme_id ?? PROGRAMME_ID),\n        revision_id: String(payload.revision_id ?? REVISION_ID),\n        activity_id: String(payload.activity_id ?? ACTIVITY_ID),\n        activity_date: String(payload.activity_date ?? previewTodayIso()),\n        weather: typeof payload.weather === 'string' ? payload.weather : null,\n        status: previewActivityStatus,\n        notes: String(payload.notes ?? ''),\n        manpower: previewManpower(payload.manpower),\n        print_context: previewPrintContext(payload.print_context),\n        submitted_by: VISUAL_USER_ID,\n        submitted_at: submittedAt,\n        updated_at: null,\n      };\n      currentHistoryEvents = [{\n        logId: '88888888-8888-4888-8888-888888888880',\n        eventType: 'NEW',\n        loggedAt: submittedAt,\n        actorLabel: 'Pegawai Tapak',\n        snapshotAvailable: true,\n        changes: [],\n      }];\n      return jsonResponse(\n        { data: { site_diary_id: SITE_DIARY_ID, siteDiaryId: SITE_DIARY_ID, lastModifiedAt: submittedAt, submitted_at: submittedAt } },\n        201,\n      );\n    }\n    if (method === 'GET') return jsonResponse({ data: [currentDiary] });\n  }`,
);

// ---------------------------------------------------------------------------
// 6. Regression evidence strengthened for the new locks.
// ---------------------------------------------------------------------------
const f45Test = 'tests/unit/ui/f45FinalVisualContract.test.ts';
replaceOnce(f45Test,
  "const sourceSelector = source('src/app/site-diary/OperationalSourceSelector.tsx');\n",
  "const sourceSelector = source('src/app/site-diary/OperationalSourceSelector.tsx');\nconst sourcePresentation = source('src/app/site-diary/sourcePresentation.ts');\n",
);
replaceOnce(f45Test,
  "  it('keeps one visible SUMBER hierarchy while preserving MSP and VO/APK source identity', () => {\n    expect(catat).toContain('ng-source-section-heading\">SUMBER');\n    expect(sourceSelector).not.toContain('Sumber Aktiviti');\n    expect(sourceSelector).not.toContain('>Sumber<');\n    expect(sourceSelector).toContain('MSP');\n    expect(sourceSelector).toContain('VO / APK');\n    expect(postPhysical).toContain('ONE OUTER SUMBER HIERARCHY');\n    expect(postPhysical).toContain('h3::after');\n    expect(postPhysical).toContain('content: none !important;');\n  });",
  "  it('keeps one visible SUMBER hierarchy while presenting field-language source labels over unchanged MSP/VO semantics', () => {\n    expect(catat).toContain('ng-source-section-heading\">SUMBER');\n    expect(sourceSelector).not.toContain('Sumber Aktiviti');\n    expect(sourceSelector).not.toContain('>Sumber<');\n    expect(sourcePresentation).toContain(\"MSP: 'Skop Kontrak'\");\n    expect(sourcePresentation).toContain(\"VO: 'Perubahan Skop (VO)'\");\n    expect(sourceSelector).toContain('operationalSourceLabel');\n    expect(sourceSelector).not.toContain('VO / APK');\n    expect(sourceSelector).not.toContain('Jadual MSP');\n    expect(catat).toContain('max={todayIso()}');\n    expect(catat).toContain('data-date-authority=\"HARIAN\"');\n    expect(postPhysical).toContain('ONE OUTER SUMBER HIERARCHY');\n    expect(postPhysical).toContain('h3::after');\n    expect(postPhysical).toContain('content: none !important;');\n  });",
);

const managementTest = 'tests/integration/ui/diaryManagementList.test.ts';
replaceOnce(managementTest,
  "    expect(container.textContent).not.toContain('CONTRACTOR');\n\n    await change('Tapis sumber', 'VO');",
  "    expect(container.textContent).not.toContain('CONTRACTOR');\n    expect(container.textContent).toContain('Skop Kontrak');\n    expect(container.textContent).toContain('Perubahan Skop (VO)');\n    const today = new Date();\n    const todayLocal = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;\n    const dateFromInput = container.querySelector('[aria-label=\"Tarikh mula\"]') as HTMLInputElement;\n    const dateToInput = container.querySelector('[aria-label=\"Tarikh akhir\"]') as HTMLInputElement;\n    expect(dateFromInput.max).toBe(todayLocal);\n    expect(dateToInput.max).toBe(todayLocal);\n    expect(dateFromInput.className).toContain('ng-entry-date');\n    expect(dateToInput.className).toContain('ng-entry-date');\n\n    await change('Tapis sumber', 'VO');",
);

const e2e = 'tests/e2e/n09a-records-current-state.e2e.spec.ts';
replaceOnce(e2e,
  "  await expect(records).not.toContainText('CONTRACTOR');\n  await expect(page.locator('[data-testid=\"current-revision-label\"]')).toContainText('Semakan 3');",
  "  await expect(records).not.toContainText('CONTRACTOR');\n  await expect(page.getByLabel('Tapis sumber').locator('option[value=\"MSP\"]')).toHaveText('Skop Kontrak');\n  await expect(page.getByLabel('Tapis sumber').locator('option[value=\"VO\"]')).toHaveText('Perubahan Skop (VO)');\n  const today = await page.evaluate(() => {\n    const now = new Date();\n    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;\n  });\n  for (const label of ['Tarikh mula', 'Tarikh akhir']) {\n    const input = page.getByLabel(label);\n    await expect(input).toHaveAttribute('max', today);\n    await expect(input).toHaveClass(/ng-entry-date/);\n  }\n  await expect(page.locator('[data-testid=\"current-revision-label\"]')).toContainText('Semakan 3');",
);
replaceOnce(e2e,
  "  await expect(record).toContainText('Kontraktor Utama');\n  const recordStyle",
  "  await expect(record).toContainText('Kontraktor Utama');\n  await expect(record).toContainText('Skop Kontrak');\n  const recordStyle",
);
replaceOnce(e2e,
  "  await expect(detail).toContainText('Sejarah / Baca Sahaja');\n  await expect(detail.getByRole('button', { name: 'Edit Rekod' })).toHaveCount(0);",
  "  await expect(detail).toContainText('Sejarah / Baca Sahaja');\n  await expect(detail).toContainText('Perubahan Skop (VO)');\n  await expect(detail.getByRole('button', { name: 'Edit Rekod' })).toHaveCount(0);",
);
replaceOnce(e2e,
  "  await expect(detail).toContainText('Kontraktor Utama');\n  await expect(detail).not.toContainText('CONTRACTOR');",
  "  await expect(detail).toContainText('Kontraktor Utama');\n  await expect(detail).toContainText('Skop Kontrak');\n  await expect(detail).not.toContainText('CONTRACTOR');",
);

write('tests/unit/ui/ngamsoiPreviewN09AR1.test.ts', `// @vitest-environment jsdom\nimport { beforeEach, describe, expect, it } from 'vitest';\nimport { ngamsoiPreviewFetch } from '@/lib/ngamsoiPreview';\n\nasync function data(path: string, init?: RequestInit) {\n  const response = await ngamsoiPreviewFetch(path, init);\n  expect(response).toBeTruthy();\n  return response!;\n}\n\ndescribe('N09A physical R1 interactive preview state', () => {\n  beforeEach(() => {\n    window.history.replaceState({}, '', '/site-diary?preview=ngamsoi');\n  });\n\n  it('exposes current and historical REKOD, persists preview Save, preserves edit concurrency and audit state', async () => {\n    const currentBefore = await (await data('/api/site-diary/revision/22222222-2222-4222-8222-222222222222?programmeId=11111111-1111-4111-8111-111111111111')).json();\n    expect(currentBefore.data).toHaveLength(1);\n    expect(currentBefore.data[0]).toMatchObject({ isCurrentRevision: true, isReadOnly: false, sourceType: 'MSP' });\n\n    const historyBefore = await (await data('/api/site-diary/revision/66666666-6666-4666-8666-666666666666?programmeId=11111111-1111-4111-8111-111111111111')).json();\n    expect(historyBefore.data).toHaveLength(1);\n    expect(historyBefore.data[0]).toMatchObject({ isCurrentRevision: false, isReadOnly: true, sourceType: 'VO' });\n\n    await data('/api/activities', {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify({ sourceType: 'MSP', activityName: 'Kerja ujian penerimaan fizikal', taskId: '33333333-3333-4333-8333-333333333333' }),\n    });\n\n    const saved = await (await data('/api/site-diary', {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify({\n        programme_id: '11111111-1111-4111-8111-111111111111',\n        revision_id: '22222222-2222-4222-8222-222222222222',\n        activity_id: '44444444-4444-4444-8444-444444444444',\n        activity_date: '2026-09-06',\n        notes: 'Disimpan dari CATAT preview',\n        manpower: [{ trade_name: 'Pembengkok Besi', bumi_count: 1, non_bumi_count: 0, foreign_count: 2 }],\n        print_context: { location: 'Aras 2 · Grid 4–8', work_start_time: '08:00', work_end_time: '17:00', weather_condition: 'ELOK', rain_start_time: null, rain_end_time: null, contractor_scope: 'CONTRACTOR' },\n      }),\n    })).json();\n    expect(saved.data.site_diary_id).toBe('55555555-5555-4555-8555-555555555555');\n\n    const currentAfter = await (await data('/api/site-diary/revision/22222222-2222-4222-8222-222222222222?programmeId=11111111-1111-4111-8111-111111111111')).json();\n    expect(currentAfter.data[0]).toMatchObject({ activityTitle: 'Kerja ujian penerimaan fizikal', location: 'Aras 2 · Grid 4–8', contractorScope: 'CONTRACTOR' });\n\n    const detailResponse = await data('/api/site-diary/55555555-5555-4555-8555-555555555555');\n    const detail = await detailResponse.json();\n    expect(detail.data.notes).toBe('Disimpan dari CATAT preview');\n    expect(detail.data.manpower[0]).toMatchObject({ bumi_count: 1, foreign_count: 2 });\n\n    const token = detail.data.updated_at ?? detail.data.submitted_at;\n    const patched = await data('/api/site-diary/55555555-5555-4555-8555-555555555555', {\n      method: 'PATCH',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify({ expected_last_modified_at: token, notes: 'Edit preview berjaya', manpower: detail.data.manpower, print_context: detail.data.print_context }),\n    });\n    expect(patched.status).toBe(200);\n\n    const history = await (await data('/api/site-diary/55555555-5555-4555-8555-555555555555/history')).json();\n    expect(history.data.events.map((event: { eventType: string }) => event.eventType)).toEqual(['NEW', 'UPDATE']);\n\n    const stale = await data('/api/site-diary/55555555-5555-4555-8555-555555555555', {\n      method: 'PATCH',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify({ expected_last_modified_at: token, notes: 'Stale edit' }),\n    });\n    expect(stale.status).toBe(409);\n  });\n});\n`);

// ---------------------------------------------------------------------------
// 7. Remove one-shot implementation tooling from the resulting product tree.
// ---------------------------------------------------------------------------
for (const disposable of [
  'scripts/apply-n09a-physical-r1-remediation.mjs',
  '.github/workflows/n09a-r1-remediation-apply.yml',
]) {
  if (existsSync(file(disposable))) unlinkSync(file(disposable));
}

console.log('N09A physical R1 bounded remediation applied.');
