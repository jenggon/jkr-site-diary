'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SiteDiary, SiteDiaryManpower } from '@/types/siteDiary';
import { SiteDiaryManagementProjection, SiteDiaryManagementRevision } from '@/types/siteDiaryManagement';
import DiaryHistoryTimeline from './DiaryHistoryTimeline';
import { operationalSourceLabel } from './sourcePresentation';

const FALLBACK = 'Tidak tersedia';
const SESSION_MESSAGE = 'Sesi telah tamat. Sila log masuk semula.';

function display(value: string | null | undefined): string {
  return value?.trim() || FALLBACK;
}

function displayPelaksana(value: string | null | undefined): string {
  if (value === 'CONTRACTOR') return 'Kontraktor Utama';
  if (value === 'NSC') return 'NSC';
  return display(value);
}

function workforceTotal(row: SiteDiaryManpower): number {
  return row.bumi_count + row.non_bumi_count + row.foreign_count;
}

export interface DiaryDetailProps {
  projection: SiteDiaryManagementProjection;
  programmeId: string;
  onBack: () => void;
  onEdit: (siteDiaryId: string) => void;
}

export default function DiaryDetail({ projection, programmeId, onBack, onEdit }: DiaryDetailProps) {
  const [detail, setDetail] = useState<SiteDiary | null>(null);
  const [revision, setRevision] = useState<SiteDiaryManagementRevision | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingEdit, setCheckingEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const editAbortRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const editGuardRef = useRef(false);

  const validateIdentity = useCallback((canonical: SiteDiary) => {
    if (
      canonical.site_diary_id !== projection.siteDiaryId
      || canonical.programme_id !== programmeId
      || canonical.programme_id !== projection.programmeId
      || canonical.revision_id !== projection.revisionId
      || canonical.activity_id !== projection.activityId
    ) {
      throw new Error('Identiti rekod tidak sepadan. Paparan ditutup untuk keselamatan.');
    }
  }, [programmeId, projection]);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const generation = ++generationRef.current;
    setLoading(true);
    setError(null);
    setDetail(null);
    setRevision(null);
    try {
      const [detailResponse, revisionsResponse] = await Promise.all([
        fetch(`/api/site-diary/${encodeURIComponent(projection.siteDiaryId)}`, { signal: controller.signal }),
        fetch(`/api/programme-revision?programmeId=${encodeURIComponent(programmeId)}`, { signal: controller.signal }),
      ]);
      if (generation !== generationRef.current) return;
      if (detailResponse.status === 401 || revisionsResponse.status === 401) throw new Error(SESSION_MESSAGE);
      if (!detailResponse.ok) {
        const json = await detailResponse.json().catch(() => null);
        throw new Error(json?.error || 'Gagal memuatkan butiran rekod.');
      }
      if (!revisionsResponse.ok) throw new Error('Gagal menyemak kuasa semakan projek.');
      const [detailJson, revisionsJson] = await Promise.all([detailResponse.json(), revisionsResponse.json()]);
      if (generation !== generationRef.current) return;
      const canonical = detailJson.data as SiteDiary | null;
      if (!canonical) throw new Error('Rekod Buku Harian Tapak tidak ditemui.');
      validateIdentity(canonical);
      const revisions: SiteDiaryManagementRevision[] = Array.isArray(revisionsJson.data) ? revisionsJson.data : [];
      const matchingRevision = revisions.find((item) => item.revisionId === canonical.revision_id) ?? null;
      if (!matchingRevision || matchingRevision.programmeId !== canonical.programme_id) {
        throw new Error('Konteks semakan rekod tidak dapat disahkan.');
      }
      setDetail(canonical);
      setRevision(matchingRevision);
    } catch (reason: unknown) {
      if (generation !== generationRef.current || controller.signal.aborted) return;
      setError(reason instanceof Error ? reason.message : 'Gagal memuatkan butiran rekod.');
    } finally {
      if (generation === generationRef.current) setLoading(false);
    }
  }, [programmeId, projection.siteDiaryId, validateIdentity]);

  useEffect(() => {
    void load();
    return () => {
      abortRef.current?.abort();
      editAbortRef.current?.abort();
      ++generationRef.current;
    };
  }, [load]);

  const editable = Boolean(detail && !projection.isReadOnly && revision?.isCurrentRevision && revision.revisionStatus === 'Approved' && !revision.isReadOnly);

  const beginEdit = async () => {
    if (!detail || !editable || editGuardRef.current) return;
    editGuardRef.current = true;
    editAbortRef.current?.abort();
    const controller = new AbortController();
    editAbortRef.current = controller;
    const generation = generationRef.current;
    setCheckingEdit(true);
    setError(null);
    try {
      const response = await fetch(`/api/programme-revision?programmeId=${encodeURIComponent(programmeId)}`, { signal: controller.signal });
      if (generation !== generationRef.current) return;
      if (response.status === 401) throw new Error(SESSION_MESSAGE);
      if (!response.ok) throw new Error('Gagal menyemak kuasa suntingan semasa.');
      const json = await response.json();
      if (generation !== generationRef.current) return;
      const revisions: SiteDiaryManagementRevision[] = Array.isArray(json.data) ? json.data : [];
      const authority = revisions.find((item) => item.revisionId === detail.revision_id);
      if (!authority?.isCurrentRevision || authority.revisionStatus !== 'Approved' || authority.isReadOnly) {
        if (authority) setRevision(authority);
        else setDetail(null);
        throw new Error('Rekod ini kini sejarah dan hanya boleh dibaca.');
      }
      onEdit(detail.site_diary_id);
    } catch (reason: unknown) {
      if (generation !== generationRef.current || controller.signal.aborted) return;
      setError(reason instanceof Error ? reason.message : 'Gagal menyemak kuasa suntingan semasa.');
    } finally {
      if (generation === generationRef.current) {
        editGuardRef.current = false;
        setCheckingEdit(false);
      }
    }
  };

  if (loading) return <div role="status" data-record-detail-state="loading" className="rounded-none bg-zinc-900 p-4">Memuatkan butiran rekod...</div>;
  if (error && !detail) return <div role="alert" data-record-detail-state="error" className="rounded-none border border-red-800 bg-red-950/40 p-4"><p>{error}</p><div className="mt-3 flex gap-3"><button type="button" onClick={load} className="min-h-[44px] font-bold underline">Cuba Semula</button><button type="button" onClick={onBack} className="min-h-[44px] font-bold underline">Kembali</button></div></div>;
  if (!detail || !revision) return null;

  const historical = !editable;
  const printableSiteDiaryId = detail.site_diary_id === projection.siteDiaryId && detail.site_diary_id
    ? detail.site_diary_id
    : null;
  const printContext = detail.print_context;
  const workforce = detail.manpower ?? [];
  const totals = workforce.reduce((sum, row) => ({ bumi: sum.bumi + row.bumi_count, nonBumi: sum.nonBumi + row.non_bumi_count, foreign: sum.foreign + row.foreign_count }), { bumi: 0, nonBumi: 0, foreign: 0 });
  const grandTotal = totals.bumi + totals.nonBumi + totals.foreign;

  return <article aria-label="Butiran Buku Harian Tapak" className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
    <div className="flex items-center justify-between gap-3"><button type="button" onClick={onBack} className="min-h-[44px] font-bold text-blue-400 underline">Kembali ke Senarai</button>{historical && <span className="text-xs font-bold text-amber-300">Sejarah / Baca Sahaja</span>}</div>
    <header><p className="text-xs text-blue-300">{operationalSourceLabel(projection.sourceType)} · {display(projection.sourceReference)}</p><h2 className="mt-1 text-xl font-bold">{display(projection.activityTitle)}</h2><p className="mt-1 text-sm text-zinc-400">Semakan {revision.revisionNumber} — {revision.revisionTitle} · {revision.revisionStatus}</p></header>
    {error && <div role="alert" data-record-detail-state="warning" className="rounded-none border border-amber-700 bg-amber-950/30 p-3 text-sm text-amber-200">{error}</div>}
    <section><h3 className="font-bold">Pelaksanaan</h3><dl className="mt-2 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-zinc-500">Tarikh</dt><dd>{display(detail.activity_date)}</dd></div><div><dt className="text-zinc-500">Lokasi</dt><dd>{display(printContext?.location)}</dd></div><div><dt className="text-zinc-500">Catatan</dt><dd>{display(detail.notes)}</dd></div><div><dt className="text-zinc-500">Cuaca</dt><dd>{display(printContext?.weather_condition ?? detail.weather)}</dd></div><div><dt className="text-zinc-500">Waktu kerja</dt><dd>{printContext?.work_start_time || printContext?.work_end_time ? `${display(printContext?.work_start_time)} – ${display(printContext?.work_end_time)}` : FALLBACK}</dd></div><div><dt className="text-zinc-500">Waktu hujan</dt><dd>{printContext?.rain_start_time || printContext?.rain_end_time ? `${display(printContext?.rain_start_time)} – ${display(printContext?.rain_end_time)}` : FALLBACK}</dd></div><div><dt className="text-zinc-500">Pelaksana</dt><dd>{displayPelaksana(printContext?.contractor_scope)}</dd></div></dl></section>
    <section data-record-section="workforce"><h3 className="font-bold">Tenaga Kerja</h3>{workforce.length === 0 ? <p className="mt-2 text-sm text-zinc-400">Tiada rekod tenaga kerja.</p> : <div data-record-workforce-roster className="mt-2 space-y-2">{workforce.map((row, index) => <div data-record-workforce-row key={`${row.trade_name}-${index}`} className="rounded-xl bg-zinc-950 p-3 text-sm"><strong>{display(row.trade_name)}</strong><dl data-record-workforce-matrix aria-label={`Tenaga kerja ${display(row.trade_name)}`} className="mt-2 grid grid-cols-4 text-xs"><div><dt>B</dt><dd>{row.bumi_count}</dd></div><div><dt>BB</dt><dd>{row.non_bumi_count}</dd></div><div><dt>A</dt><dd>{row.foreign_count}</dd></div><div><dt>JUMLAH</dt><dd>{workforceTotal(row)}</dd></div></dl></div>)}<p data-record-workforce-total className="text-sm font-bold">JUMLAH {grandTotal} · B {totals.bumi} · BB {totals.nonBumi} · A {totals.foreign}</p></div>}</section>
    <section><h3 className="font-bold">Metadata</h3><dl className="mt-2 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-zinc-500">Dihantar</dt><dd>{display(detail.submitted_at)}</dd></div><div><dt className="text-zinc-500">Dikemaskini</dt><dd>{display(detail.updated_at ?? detail.submitted_at)}</dd></div></dl></section>
    <DiaryHistoryTimeline siteDiaryId={detail.site_diary_id} />
    <div className="grid gap-2 sm:grid-cols-2">
      {printableSiteDiaryId && <Link href={`/site-diary/print?id=${encodeURIComponent(printableSiteDiaryId)}`} className="flex min-h-[44px] items-center justify-center rounded-none border border-zinc-700 bg-zinc-800 px-4 font-bold text-white">Cetak Buku Harian Tapak</Link>}
      {editable && <button type="button" onClick={beginEdit} disabled={checkingEdit} className="min-h-[44px] rounded-none bg-blue-600 px-4 font-bold text-white disabled:opacity-50">{checkingEdit ? 'Menyemak Kuasa...' : 'Edit Rekod'}</button>}
    </div>
  </article>;
}
