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

  return (
    <section className="space-y-3" aria-label="Cadangan dan tenaga kerja tapak">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">CADANG</div>
            <div className="mt-1 text-xs text-zinc-400">
              {selectedSource
                ? (loading ? 'Mencari tred…' : (resolutionSource ? `TRE · ${resolutionSource}` : 'Pilih tred yang hadir di tapak'))
                : 'Pilih kerja dahulu untuk cadangan TRE'}
            </div>
          </div>
        </div>

        {recommended.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2" data-testid="tre-trade-suggestions">
            {recommended.filter((trade) => !existing.has(trade.toLowerCase())).map((trade) => (
              <button
                key={trade}
                type="button"
                onClick={() => addTrade(trade)}
                disabled={disabled}
                className="min-h-[36px] rounded-lg border border-blue-800/70 bg-blue-950/40 px-3 text-xs font-semibold text-blue-200 hover:border-blue-600 hover:bg-blue-950/70 disabled:opacity-50"
              >
                + {trade}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              const first = candidates[0];
              addTrade(first ?? query);
            }}
            disabled={disabled}
            placeholder="Cari tred…"
            aria-label="Cari tred"
            className="min-h-[44px] flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-blue-500"
          />
          {query.trim() && (
            <button
              type="button"
              onClick={() => addTrade(candidates[0] ?? query)}
              disabled={disabled}
              className="min-h-[44px] rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-xs font-bold text-zinc-100 hover:bg-zinc-700 disabled:opacity-50"
            >
              Tambah
            </button>
          )}
        </div>

        {query.trim() && candidates.length > 0 && (
          <div className="mt-2 grid gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-1" data-testid="trade-search-results">
            {candidates.map((trade) => (
              <button
                key={trade}
                type="button"
                onClick={() => addTrade(trade)}
                disabled={disabled}
                className="rounded-md px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white"
              >
                {trade}
              </button>
            ))}
          </div>
        )}
      </div>

      <WorkforceEntry manpower={manpower} onChange={onChange} disabled={disabled} className="ng-workforce--smart" />
      <style jsx global>{`
        .ng-workforce--smart .ng-workforce__add { display: none !important; }
      `}</style>
    </section>
  );
}
