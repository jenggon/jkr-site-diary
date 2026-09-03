'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useDailyEntryContext } from './DailyEntryShell';
import WorkforceEntry, { COMMON_TRADES_CATALOG, ManpowerRow } from './WorkforceEntry';
import type { SelectedOperationalSource } from './OperationalSourceSelector';

interface IntelligencePayload {
  readonly tradeResolution?: {
    readonly tradeName?: string;
    readonly alternatives?: string[];
    readonly resolutionSource?: string;
  } | null;
}

export interface SmartWorkforceEntryProps {
  readonly selectedSource: SelectedOperationalSource | null;
  readonly manpower: ManpowerRow[];
  readonly onChange: (rows: ManpowerRow[]) => void;
  readonly disabled?: boolean;
}

function cleanTrade(value: string): string {
  return value.trim();
}

export default function SmartWorkforceEntry({
  selectedSource,
  manpower,
  onChange,
  disabled = false,
}: SmartWorkforceEntryProps) {
  const { programmeId, revisionId } = useDailyEntryContext();
  const [recommended, setRecommended] = useState<string[]>([]);
  const [resolutionSource, setResolutionSource] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setRecommended([]);
    setResolutionSource(null);
    if (!selectedSource || !programmeId) return () => { active = false; };

    const params = new URLSearchParams({
      programmeId,
      activityName: selectedSource.title,
    });
    if (revisionId) params.set('revisionId', revisionId);
    if (selectedSource.sourceType === 'MSP') params.set('taskId', selectedSource.id);

    setLoading(true);
    fetch(`/api/intelligence?${params.toString()}`)
      .then(async (response) => response.ok ? response.json() as Promise<IntelligencePayload> : null)
      .then((payload) => {
        if (!active || !payload?.tradeResolution) return;
        const values = [
          payload.tradeResolution.tradeName,
          ...(payload.tradeResolution.alternatives ?? []),
        ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
        setRecommended([...new Set(values.map(cleanTrade))].slice(0, 4));
        setResolutionSource(payload.tradeResolution.resolutionSource ?? null);
      })
      .catch(() => undefined)
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [programmeId, revisionId, selectedSource]);

  const existing = useMemo(
    () => new Set(manpower.map((row) => row.trade_name.trim().toLowerCase())),
    [manpower],
  );

  const overallTotal = useMemo(
    () => manpower.reduce((sum, row) => sum + row.bumi_count + row.non_bumi_count + row.foreign_count, 0),
    [manpower],
  );

  const candidates = useMemo(() => {
    const pool = [...recommended, ...COMMON_TRADES_CATALOG];
    const deduped = [...new Map(pool.map((trade) => [trade.toLowerCase(), trade])).values()];
    const needle = query.trim().toLowerCase();
    return deduped
      .filter((trade) => !existing.has(trade.toLowerCase()))
      .filter((trade) => !needle || trade.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [existing, query, recommended]);

  const addTrade = (trade: string) => {
    const value = cleanTrade(trade);
    if (!value || existing.has(value.toLowerCase()) || disabled) return;
    onChange([...manpower, { trade_name: value, bumi_count: 0, non_bumi_count: 0, foreign_count: 0 }]);
    setQuery('');
  };

  const helper = selectedSource
    ? (loading ? 'Cari tred…' : (resolutionSource ? `TRE · ${resolutionSource}` : 'Pilih tred'))
    : 'Pilih kerja';

  return (
    <section className="ng-entry-panel ng-workforce-smart" aria-label="Pekerja tapak" data-testid="smart-workforce-entry">
      <div className="ng-entry-row ng-workforce-smart__head">
        <div>
          <div className="ng-entry-heading">PEKERJA</div>
          <div className="ng-entry-meta">{helper}</div>
        </div>
        <div className="ng-workforce-smart__total" aria-label={`${overallTotal} pekerja`}>
          <span aria-hidden="true">◒</span>
          <strong>{overallTotal}</strong>
        </div>
      </div>

      {recommended.length > 0 && (
        <div className="ng-trade-suggestions" data-testid="tre-trade-suggestions">
          {recommended.filter((trade) => !existing.has(trade.toLowerCase())).map((trade) => (
            <button key={trade} type="button" onClick={() => addTrade(trade)} disabled={disabled}>
              + {trade}
            </button>
          ))}
        </div>
      )}

      <div className="ng-trade-search">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            addTrade(candidates[0] ?? query);
          }}
          disabled={disabled}
          placeholder="Cari tred"
          aria-label="Cari tred"
        />
        {query.trim() && (
          <button type="button" onClick={() => addTrade(candidates[0] ?? query)} disabled={disabled}>
            Tambah
          </button>
        )}
      </div>

      {query.trim() && candidates.length > 0 && (
        <div className="ng-trade-results" data-testid="trade-search-results">
          {candidates.map((trade) => (
            <button key={trade} type="button" onClick={() => addTrade(trade)} disabled={disabled}>
              {trade}
            </button>
          ))}
        </div>
      )}

      <WorkforceEntry manpower={manpower} onChange={onChange} disabled={disabled} className="ng-workforce--smart" />
      <style jsx global>{`
        .ng-workforce--smart .ng-workforce__add { display: none !important; }
      `}</style>
    </section>
  );
}
