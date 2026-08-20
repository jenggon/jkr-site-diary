'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SiteDiaryPrintDto } from '@/types/siteDiaryPrint';

type Manpower = {
  trade_name: string;
  bumi_count?: number;
  non_bumi_count?: number;
  foreign_count?: number;
};

type DailyReport = {
  id: string;
  site_diary_id: string;
  activity_id: string;
  source_type: 'MSP' | 'VO';
  wbs: string;
  task_name: string;
  is_critical: boolean;
  work_status: string;
  activity_date: string;
  location: string;
  work_start_time: string | null;
  work_end_time: string | null;
  weather_condition: string | null;
  rain_start_time: string | null;
  rain_end_time: string | null;
  contractor_scope: 'CONTRACTOR' | 'NSC';
  manpower: Manpower[];
  notes: string;
};

type WorkforceRow = {
  trade: string;
  bumi: number;
  nonBumi: number;
  foreign: number;
};

const PAGE1_ACTIVITY_CAPACITY = 14;
const PAGE1_CONTRACTOR_CAPACITY = 9;
const PAGE1_NSC_CAPACITY = 6;
const CONTINUATION_ACTIVITY_CAPACITY = 24;
const CONTINUATION_CONTRACTOR_CAPACITY = 6;
const CONTINUATION_NSC_CAPACITY = 4;

const statusRank: Record<string, number> = {
  'Sedang Laksana': 1,
  Mula: 2,
  Siap: 3,
};

function priorityRank(row: DailyReport): number {
  if (row.is_critical) return 0;
  return statusRank[row.work_status] ?? 4;
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function timeText(value: string | null): string {
  return value ? value.slice(0, 5) : '';
}

function aggregateWorkforce(reports: DailyReport[], scope: 'CONTRACTOR' | 'NSC'): WorkforceRow[] {
  const map = new Map<string, WorkforceRow>();
  for (const report of reports) {
    if (report.contractor_scope !== scope) continue;
    for (const item of report.manpower ?? []) {
      const trade = item.trade_name?.trim();
      if (!trade) continue;
      const current = map.get(trade) ?? { trade, bumi: 0, nonBumi: 0, foreign: 0 };
      current.bumi += Number(item.bumi_count ?? 0);
      current.nonBumi += Number(item.non_bumi_count ?? 0);
      current.foreign += Number(item.foreign_count ?? 0);
      map.set(trade, current);
    }
  }
  return [...map.values()].sort((a, b) => a.trade.localeCompare(b.trade));
}

function chunk<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [];
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

function WeatherClock({ rainStart, rainEnd }: { rainStart: string | null; rainEnd: string | null }) {
  const cx = 54;
  const cy = 54;
  const radius = 42;
  const selected = new Set<number>();
  const parseHour = (value: string | null) => value ? Number(value.slice(0, 2)) % 12 : null;
  const start = parseHour(rainStart);
  const end = parseHour(rainEnd);
  if (start !== null && end !== null) {
    let hour = start;
    selected.add(hour === 0 ? 12 : hour);
    for (let guard = 0; guard < 12 && hour !== end; guard += 1) {
      hour = (hour + 1) % 12;
      selected.add(hour === 0 ? 12 : hour);
    }
  }

  const point = (angle: number, r = radius) => ({
    x: cx + Math.cos((angle - 90) * Math.PI / 180) * r,
    y: cy + Math.sin((angle - 90) * Math.PI / 180) * r,
  });

  return (
    <svg viewBox="0 0 108 108" className="weather-clock" aria-label="Weather clock">
      {Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => {
        if (!selected.has(hour)) return null;
        const startAngle = (hour - 1) * 30;
        const endAngle = hour * 30;
        const p1 = point(startAngle);
        const p2 = point(endAngle);
        return <path key={`fill-${hour}`} d={`M ${cx} ${cy} L ${p1.x} ${p1.y} A ${radius} ${radius} 0 0 1 ${p2.x} ${p2.y} Z`} fill="#bdbdbd" />;
      })}
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#000" strokeWidth="1.4" />
      {Array.from({ length: 12 }, (_, index) => index * 30).map((angle) => {
        const p = point(angle);
        return <line key={angle} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#000" strokeWidth="0.8" />;
      })}
      {Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => {
        const p = point(hour * 30, radius + 9);
        return <text key={`n-${hour}`} x={p.x} y={p.y + 3} fontSize="7" textAnchor="middle">{hour}</text>;
      })}
    </svg>
  );
}

function StatusCells({ status }: { status: string }) {
  return <>
    <td className="center">{status === 'Mula' ? '\u2713' : ''}</td>
    <td className="center">{status === 'Sedang Laksana' ? '\u2713' : ''}</td>
    <td className="center">{status === 'Siap' ? '\u2713' : ''}</td>
  </>;
}

function ActivityTable({ rows, capacity, continuation = false }: { rows: DailyReport[]; capacity: number; continuation?: boolean }) {
  const blanks = Math.max(0, capacity - rows.length);
  return (
    <section className="section-block activity-section">
      <div className="section-title">1. &nbsp; KERJA YANG DIBINA HARI INI:{continuation ? ' (SAMBUNGAN)' : ''}</div>
      <table className="activity-table">
        <thead>
          <tr><th rowSpan={2}>Bil.</th><th rowSpan={2}>Kod WBS</th><th rowSpan={2}>Aktiviti/Kerja</th><th colSpan={3}>Status Kemajuan</th><th rowSpan={2}>Lokasi Aktiviti/Kerja</th><th rowSpan={2}>Waktu Mula</th><th rowSpan={2}>Waktu Tamat</th></tr>
          <tr><th>Mula</th><th>Sedang Laksana</th><th>Siap</th></tr>
        </thead>
        <tbody>
          {rows.map((row, index) => <tr key={row.site_diary_id}>
            <td className="center">{index + 1}</td><td>{row.wbs}</td><td>{row.task_name}</td><StatusCells status={row.work_status} /><td>{row.location}</td><td className="center">{timeText(row.work_start_time)}</td><td className="center">{timeText(row.work_end_time)}</td>
          </tr>)}
          {Array.from({ length: blanks }, (_, index) => <tr key={`blank-${index}`}><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>)}
        </tbody>
      </table>
    </section>
  );
}

function WorkforceBlock({ contractor, nsc, contractorCapacity, nscCapacity }: { contractor: WorkforceRow[]; nsc: WorkforceRow[]; contractorCapacity: number; nscCapacity: number }) {
  const renderRows = (rows: WorkforceRow[], capacity: number) => <>
    {rows.slice(0, capacity).map((row, index) => <tr key={row.trade}><td className="center">{index + 1}</td><td>{row.trade}</td><td className="center">{row.bumi || ''}</td><td className="center">{row.nonBumi || ''}</td><td className="center">{row.foreign || ''}</td></tr>)}
    {Array.from({ length: Math.max(0, capacity - rows.length) }, (_, index) => <tr key={`wf-blank-${index}`}><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>)}
  </>;
  const totals = (rows: WorkforceRow[]) => rows.reduce((sum, row) => ({ bumi: sum.bumi + row.bumi, nonBumi: sum.nonBumi + row.nonBumi, foreign: sum.foreign + row.foreign }), { bumi: 0, nonBumi: 0, foreign: 0 });
  const cTotal = totals(contractor.slice(0, contractorCapacity));
  const nTotal = totals(nsc.slice(0, nscCapacity));

  return <section className="section-block workforce-section">
    <div className="section-title">2. &nbsp; BILANGAN PEKERJA DI TAPAK BINA</div>
    <table className="workforce-table">
      <thead><tr><th rowSpan={2}>Bil.</th><th rowSpan={2}>Jenis Kerja</th><th colSpan={2}>Warganegara</th><th rowSpan={2}>Warga Asing</th></tr><tr><th>Bumiputera</th><th>Bukan Bumi</th></tr></thead>
      <tbody>
        <tr className="group-row"><td colSpan={5}>Kontraktor</td></tr>
        {renderRows(contractor, contractorCapacity)}
        <tr><td colSpan={2} className="total-label">Jumlah</td><td className="center">{cTotal.bumi || ''}</td><td className="center">{cTotal.nonBumi || ''}</td><td className="center">{cTotal.foreign || ''}</td></tr>
        <tr className="group-row"><td colSpan={5}>Subkontraktor Dinamakan (NSC)</td></tr>
        {renderRows(nsc, nscCapacity)}
        <tr><td colSpan={2} className="total-label">Jumlah</td><td className="center">{nTotal.bumi || ''}</td><td className="center">{nTotal.nonBumi || ''}</td><td className="center">{nTotal.foreign || ''}</td></tr>
      </tbody>
    </table>
  </section>;
}

// R1-4: Bounded user-facing error messages — never expose arbitrary backend text
function boundedErrorMessage(status: number, _raw: string | null): string {
  if (status === 401) return 'Sesi tamat tempoh. Sila log masuk semula.';
  if (status === 403) return 'Akses ditolak. Anda tidak mempunyai kebenaran untuk melihat rekod ini.';
  if (status === 404) return 'Rekod tidak dijumpai.';
  if (status === 400) return 'Permintaan tidak sah. ID rekod tidak boleh diproses.';
  // 5xx and anything else
  return 'Gagal memuatkan laporan. Sila cuba lagi.';
}

// R1-3: Validate the minimum envelope required — prevents silent crash on malformed success
function validatePrintDto(data: unknown, requestedId: string): data is SiteDiaryPrintDto {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (typeof d['siteDiaryId'] !== 'string' || d['siteDiaryId'] === '') return false;
  // R1-1: Response identity MUST match requested id
  if (d['siteDiaryId'] !== requestedId) return false;
  // printContext must be an object (would crash renderer immediately if absent)
  if (!d['printContext'] || typeof d['printContext'] !== 'object') return false;
  // manpower must be an array
  if (!Array.isArray(d['manpower'])) return false;
  return true;
}

export default function PrintSiteDiaryClient() {
  const searchParams = useSearchParams();
  const id = searchParams?.get('id') ?? null;

  const [diary, setDiary] = useState<SiteDiaryPrintDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // R1-2: Track current owned request ID so stale resolutions cannot update state
  const currentIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!id) {
      currentIdRef.current = null;
      setDiary(null);
      setError('ID rekod tidak ditemui');
      setLoading(false);
      return;
    }

    // R1-2: Immediately claim ownership — clear stale diary and error before fetching
    currentIdRef.current = id;
    setDiary(null);
    setLoading(true);
    setError('');

    let active = true;

    fetch(`/api/site-diary/${encodeURIComponent(id)}/print`)
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          const raw = body && typeof body === 'object' ? (body as Record<string, unknown>)['error'] as string | null : null;
          // R1-4: Never expose raw backend error text
          throw new Error(boundedErrorMessage(response.status, raw));
        }
        return response.json();
      })
      .then((body) => {
        if (!active) return;
        // R1-2: Verify this resolution still belongs to the current request
        if (currentIdRef.current !== id) return;
        // R1-1 + R1-3: Validate identity bonding and minimum envelope
        const data = body && typeof body === 'object' ? (body as Record<string, unknown>)['data'] : undefined;
        if (!validatePrintDto(data, id)) {
          setDiary(null);
          setError('Gagal memuatkan laporan. Sila cuba lagi.');
          return;
        }
        setDiary(data as SiteDiaryPrintDto);
      })
      .catch((err) => {
        if (!active) return;
        // R1-2: Only update error if this is still the current request
        if (currentIdRef.current !== id) return;
        setError(err instanceof Error ? err.message : 'Gagal memuatkan laporan. Sila cuba lagi.');
      })
      .finally(() => {
        if (!active) return;
        // R1-2: Only clear loading if this is still the current request
        if (currentIdRef.current !== id) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const reports: DailyReport[] = useMemo(() => {
    if (!diary) return [];

    // R1-5: Map ONLY explicit canonical values — null means no status selected
    let workStatus = '';
    if (diary.activityStatus === 'New') workStatus = 'Mula';
    else if (diary.activityStatus === 'In Progress') workStatus = 'Sedang Laksana';
    else if (diary.activityStatus === 'Completed') workStatus = 'Siap';
    // null / unknown => workStatus stays '' => StatusCells renders no checkmark

    return [{
      id: diary.siteDiaryId,
      site_diary_id: diary.siteDiaryId,
      activity_id: diary.activityId,
      source_type: diary.sourceType,
      wbs: diary.wbs,
      task_name: diary.taskName,
      is_critical: diary.isCritical,
      work_status: workStatus,
      activity_date: diary.activityDate,
      location: diary.printContext.location,
      work_start_time: diary.printContext.workStartTime,
      work_end_time: diary.printContext.workEndTime,
      weather_condition: diary.printContext.weatherCondition ?? null,
      rain_start_time: diary.printContext.rainStartTime,
      rain_end_time: diary.printContext.rainEndTime,
      contractor_scope: diary.printContext.contractorScope,
      manpower: diary.manpower.map(m => ({
        trade_name: m.tradeName,
        bumi_count: m.bumiCount,
        non_bumi_count: m.nonBumiCount,
        foreign_count: m.foreignCount,
      })),
      notes: diary.notes,
    }];
  }, [diary]);

  const sorted = useMemo(() => [...reports].sort((a, b) => priorityRank(a) - priorityRank(b)), [reports]);
  const contractor = useMemo(() => aggregateWorkforce(reports, 'CONTRACTOR'), [reports]);
  const nsc = useMemo(() => aggregateWorkforce(reports, 'NSC'), [reports]);
  const page1Activities = sorted.slice(0, PAGE1_ACTIVITY_CAPACITY);
  const remainingActivities = sorted.slice(PAGE1_ACTIVITY_CAPACITY);
  const remainingContractor = contractor.slice(PAGE1_CONTRACTOR_CAPACITY);
  const remainingNsc = nsc.slice(PAGE1_NSC_CAPACITY);

  const activityChunks = chunk(remainingActivities, CONTINUATION_ACTIVITY_CAPACITY);
  const contractorChunks = chunk(remainingContractor, CONTINUATION_CONTRACTOR_CAPACITY);
  const nscChunks = chunk(remainingNsc, CONTINUATION_NSC_CAPACITY);
  const continuationCount = Math.max(activityChunks.length, contractorChunks.length, nscChunks.length);
  const totalPages = 1 + continuationCount;

  const date = diary?.activityDate ?? '';
  const weather = diary?.printContext?.weatherCondition ?? '';
  const rainStart = diary?.printContext?.rainStartTime ?? null;
  const rainEnd = diary?.printContext?.rainEndTime ?? null;
  const notes = diary?.notes ?? '';

  return <main className="print-shell">
    <style jsx global>{`
      *{box-sizing:border-box} body{margin:0;background:#d4d4d4;color:#000;font-family:Arial,Helvetica,sans-serif}.print-shell{padding:20px}.toolbar{position:sticky;top:0;z-index:10;margin:0 auto 16px;max-width:210mm;display:flex;gap:10px;align-items:center;background:#18181b;color:white;padding:10px 14px;border-radius:10px}.toolbar button,.toolbar input{font:inherit;padding:7px 10px}.page{width:210mm;min-height:297mm;margin:0 auto 18px;background:white;padding:14mm 16mm 11mm;page-break-after:always;position:relative}.page:last-child{page-break-after:auto}.jkr-header{display:grid;grid-template-columns:27% 48% 25%;height:25mm;border:1.4px solid #000}.jkr-header>div{border-right:1.4px solid #000}.jkr-header>div:last-child{border-right:0}.logo-cell{display:flex;align-items:center;justify-content:center}.logo-cell img{width:30mm;height:20mm;object-fit:contain}.agency-cell{display:flex;align-items:center;justify-content:center;text-align:center;font-size:15pt;line-height:1.15}.date-cell{padding:5px;font-size:11pt}.weather-row{display:grid;grid-template-columns:45mm 1fr;gap:7mm;align-items:center;padding:4mm 4mm 2mm}.weather-clock{width:34mm;height:34mm}.weather-fields{font-size:10pt;line-height:1.8}.field-line{display:inline-block;min-width:42mm;border-bottom:1px solid #000;padding:0 2mm}.field-line.short{min-width:28mm}.section-block{border:1.4px solid #000;border-bottom:0}.section-title{font-size:9.5pt;font-weight:700;padding:2mm;border-bottom:1.4px solid #000}.section-block table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:7.5pt}.section-block th,.section-block td{border-right:1px solid #000;border-bottom:1px solid #000;padding:1mm 1.2mm;vertical-align:middle;height:6mm}.section-block th:last-child,.section-block td:last-child{border-right:0}.activity-table th:nth-child(1){width:6%}.activity-table th:nth-child(2){width:10%}.activity-table th:nth-child(3){width:22%}.activity-table th:nth-child(7){width:18%}.activity-table th:nth-child(8),.activity-table th:nth-child(9){width:11%}.center{text-align:center}.workforce-table th:nth-child(1){width:6%}.workforce-table th:nth-child(2){width:55%}.group-row td{font-weight:700;text-align:left}.total-label{text-align:right;font-weight:700}.footer-note{font-size:7.5pt;margin-top:2mm;line-height:1.35}.page-number{text-align:center;font-size:9pt;margin-top:3mm}.continuation-page{padding-top:12mm}.continuation-label{text-align:right;font-size:9pt;font-weight:700;margin-bottom:2mm}.empty-state{padding:18mm;text-align:center}.status{margin-left:auto;font-size:9pt;color:#d4d4d8}
      @media print{body{background:white}.print-shell{padding:0}.toolbar{display:none}.page{margin:0;width:210mm;min-height:297mm;box-shadow:none}@page{size:A4 portrait;margin:0}}
    `}</style>

    <div className="toolbar">
      <strong>JKR Site Diary</strong>
      <button type="button" onClick={() => window.print()} disabled={loading || !diary}>Cetak / Simpan PDF</button>
      <span className="status">{loading ? 'Memuat...' : (diary ? '1 aktiviti' : '')}</span>
    </div>

    {error ? <div className="page empty-state" data-testid="error-state">{error}</div> : (!diary ? null : <>
      <article className="page">
        <header className="jkr-header"><div className="logo-cell"><img src="/jkr-logo.svg" alt="JKR" /></div><div className="agency-cell">JABATAN KERJA RAYA<br/>MALAYSIA</div><div className="date-cell">TARIKH:<br/><strong>{formatDate(date)}</strong></div></header>
        <section className="weather-row"><WeatherClock rainStart={rainStart} rainEnd={rainEnd}/><div className="weather-fields"><div>CUACA: <span className="field-line">{weather}</span> (Nyatakan CUACA ELOK atau HUJAN)</div><div>WAKTU MULA HUJAN: <span className="field-line short">{timeText(rainStart)}</span> &nbsp; WAKTU TAMAT HUJAN: <span className="field-line short">{timeText(rainEnd)}</span></div><div>CATATAN: <span className="field-line">{notes}</span></div></div></section>
        <ActivityTable rows={page1Activities} capacity={PAGE1_ACTIVITY_CAPACITY}/>
        <WorkforceBlock contractor={contractor} nsc={nsc} contractorCapacity={PAGE1_CONTRACTOR_CAPACITY} nscCapacity={PAGE1_NSC_CAPACITY}/>
        <div className="footer-note"><strong>Nota:</strong> Rekod dan Buku Harian Tapak perlu diisi dan ditandatangani setiap hari oleh PTB JKR<br/>Maklumat Kontraktor dan Subkontraktor Dinamakan hendaklah diisi</div>
        <div className="page-number">1/{totalPages}</div>
      </article>

      {Array.from({ length: continuationCount }, (_, index) => <article className="page continuation-page" key={`continuation-${index}`}>
        <div className="continuation-label">SAMBUNGAN — {formatDate(date)}</div>
        <ActivityTable rows={activityChunks[index] ?? []} capacity={CONTINUATION_ACTIVITY_CAPACITY} continuation/>
        <WorkforceBlock contractor={contractorChunks[index] ?? []} nsc={nscChunks[index] ?? []} contractorCapacity={CONTINUATION_CONTRACTOR_CAPACITY} nscCapacity={CONTINUATION_NSC_CAPACITY}/>
        <div className="page-number">{index + 2}/{totalPages}</div>
      </article>)}
    </>)}
  </main>;
}
