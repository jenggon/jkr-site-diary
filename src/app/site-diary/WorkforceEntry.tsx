'use client';

import React, { useState, useMemo } from 'react';

export interface ManpowerRow {
  trade_name: string;
  bumi_count: number;
  non_bumi_count: number;
  foreign_count: number;
}

export interface WorkforceEntryProps {
  manpower: ManpowerRow[];
  onChange: (manpower: ManpowerRow[]) => void;
  disabled?: boolean;
  className?: string;
}

export const COMMON_TRADES_CATALOG: string[] = [
  'General Worker (Pekerja Am)',
  'Carpenter (Tukang Kayu)',
  'Bar Bender (Pembengkok Besi)',
  'Concretor (Tukang Konkrit)',
  'Bricklayer (Tukang Bata)',
  'Plumber (Tukang Paip)',
  'Electrician (Juruelektrik)',
  'Excavator Operator (Pemandu Jengkaut)',
  'Site Supervisor (Penyelia Tapak)',
  'Painter (Tukang Cat)',
  'Tiler (Tukang Jubin)',
  'Welder (Jurukimpal)',
  'Scaffolder (Pemasang Perancah)',
  'Pipelayer (Pemasang Paip Pembetung)',
  'Roofer (Tukang Bumbung)',
  'Surveyor (Juruukur Bahan/Tapak)',
  'Safety Officer (Pegawai Keselamatan)',
];

export default function WorkforceEntry({
  manpower,
  onChange,
  disabled = false,
  className = '',
}: WorkforceEntryProps) {
  const [selectedCatalogTrade, setSelectedCatalogTrade] = useState<string>('');
  const [customTradeInput, setCustomTradeInput] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Derive per-row and overall totals
  const overallTotal = useMemo(() => {
    return manpower.reduce(
      (acc, cur) =>
        acc +
        (Math.max(0, cur.bumi_count) || 0) +
        (Math.max(0, cur.non_bumi_count) || 0) +
        (Math.max(0, cur.foreign_count) || 0),
      0
    );
  }, [manpower]);

  const handleCountChange = (
    index: number,
    field: 'bumi_count' | 'non_bumi_count' | 'foreign_count',
    rawValue: string | number
  ) => {
    setValidationError(null);
    const parsed = typeof rawValue === 'number' ? rawValue : parseInt(rawValue, 10);
    const sanitized = isNaN(parsed) ? 0 : Math.max(0, parsed);

    const updated = manpower.map((row, idx) => {
      if (idx !== index) return row;
      return {
        ...row,
        [field]: sanitized,
      };
    });

    onChange(updated);
  };

  const handleStepCount = (
    index: number,
    field: 'bumi_count' | 'non_bumi_count' | 'foreign_count',
    delta: number
  ) => {
    if (disabled) return;
    setValidationError(null);
    const currentRow = manpower[index];
    if (!currentRow) return;

    const currentVal = currentRow[field] || 0;
    const nextVal = Math.max(0, currentVal + delta);
    handleCountChange(index, field, nextVal);
  };

  const handleAddTrade = (tradeToAdd: string) => {
    setValidationError(null);
    const trimmed = tradeToAdd.trim();
    if (!trimmed) {
      setValidationError('Sila pilih atau masukkan nama tred.');
      return;
    }

    // Duplicate check (case-insensitive)
    const isDuplicate = manpower.some(
      (m) => m.trade_name.trim().toLowerCase() === trimmed.toLowerCase()
    );

    if (isDuplicate) {
      setValidationError(`Tred "${trimmed}" telah wujud dalam senarai.`);
      return;
    }

    const newRow: ManpowerRow = {
      trade_name: trimmed,
      bumi_count: 0,
      non_bumi_count: 0,
      foreign_count: 0,
    };

    onChange([...manpower, newRow]);
    setSelectedCatalogTrade('');
    setCustomTradeInput('');
  };

  const handleRemoveTrade = (index: number) => {
    if (disabled) return;
    setValidationError(null);
    const updated = manpower.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  // Available catalog trades not yet added
  const availableCatalogTrades = useMemo(() => {
    const existingSet = new Set(manpower.map((m) => m.trade_name.trim().toLowerCase()));
    return COMMON_TRADES_CATALOG.filter(
      (t) => !existingSet.has(t.trim().toLowerCase())
    );
  }, [manpower]);

  return (
    <section
      className={`rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 sm:p-5 shadow-lg ${className}`}
      aria-label="Bahagian Tenaga Kerja Tapak"
    >
      {/* Header with overall total */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-zinc-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            Tenaga Kerja di Tapak (Workforce)
          </h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Daftar pecahan pekerja mengikut tred dan kerakyatan
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-semibold text-zinc-400">Jumlah Tenaga Kerja:</span>
          <span
            data-testid="overall-workforce-total"
            className="text-xs sm:text-sm font-bold text-amber-400 bg-amber-950/80 px-3 py-1 rounded-xl border border-amber-800/50 shadow-inner"
          >
            {`${overallTotal} Orang`}
          </span>
        </div>
      </div>

      {/* Validation alert */}
      {validationError && (
        <div
          role="alert"
          className="mb-3 rounded-xl border border-red-800/70 bg-red-950/50 p-2.5 text-xs text-red-200 flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 text-red-400 shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{validationError}</span>
        </div>
      )}

      {/* Trade Rows List (Mobile-First Stacked Cards) */}
      <div className="space-y-3">
        {manpower.length === 0 ? (
          <div className="text-center py-6 px-4 rounded-xl border border-dashed border-zinc-800 text-zinc-500 text-xs">
            Tiada tred tenaga kerja ditambah. Sila pilih atau tambah tred di bawah.
          </div>
        ) : (
          manpower.map((row, idx) => {
            const rowTotal =
              (Math.max(0, row.bumi_count) || 0) +
              (Math.max(0, row.non_bumi_count) || 0) +
              (Math.max(0, row.foreign_count) || 0);

            return (
              <div
                key={`${row.trade_name}-${idx}`}
                data-testid={`workforce-row-${idx}`}
                className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 sm:p-3.5 transition-all hover:border-zinc-700"
              >
                {/* Row Title & Summary */}
                <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-zinc-100 truncate" title={row.trade_name}>
                      {row.trade_name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      data-testid={`trade-total-${idx}`}
                      className="text-[11px] font-semibold text-zinc-300 bg-zinc-800 px-2.5 py-0.5 rounded-lg border border-zinc-700/60"
                    >
                      Jumlah: <strong className="text-amber-400">{rowTotal}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTrade(idx)}
                      disabled={disabled}
                      aria-label={`Padam tred ${row.trade_name}`}
                      className="p-1 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition-colors disabled:opacity-40"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* 3 Mobile-First Classification Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  {/* Bumiputera */}
                  <div className="rounded-lg bg-zinc-900/90 p-2 border border-zinc-800/80">
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                      Bumiputera
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStepCount(idx, 'bumi_count', -1)}
                        disabled={disabled || row.bumi_count <= 0}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 active:bg-zinc-600 disabled:opacity-30 text-sm font-bold transition-colors"
                        aria-label="Tolak 1 Bumiputera"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={0}
                        aria-label={`Bilangan Bumiputera untuk ${row.trade_name}`}
                        value={row.bumi_count}
                        onChange={(e) => handleCountChange(idx, 'bumi_count', e.target.value)}
                        disabled={disabled}
                        className="w-full text-center rounded-lg border border-zinc-700/80 bg-zinc-950 py-1 text-xs sm:text-sm font-bold text-zinc-100 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleStepCount(idx, 'bumi_count', 1)}
                        disabled={disabled}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 active:bg-zinc-600 disabled:opacity-30 text-sm font-bold transition-colors"
                        aria-label="Tambah 1 Bumiputera"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Bukan Bumiputera */}
                  <div className="rounded-lg bg-zinc-900/90 p-2 border border-zinc-800/80">
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                      Bukan Bumiputera
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStepCount(idx, 'non_bumi_count', -1)}
                        disabled={disabled || row.non_bumi_count <= 0}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 active:bg-zinc-600 disabled:opacity-30 text-sm font-bold transition-colors"
                        aria-label="Tolak 1 Bukan Bumiputera"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={0}
                        aria-label={`Bilangan Bukan Bumiputera untuk ${row.trade_name}`}
                        value={row.non_bumi_count}
                        onChange={(e) => handleCountChange(idx, 'non_bumi_count', e.target.value)}
                        disabled={disabled}
                        className="w-full text-center rounded-lg border border-zinc-700/80 bg-zinc-950 py-1 text-xs sm:text-sm font-bold text-zinc-100 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleStepCount(idx, 'non_bumi_count', 1)}
                        disabled={disabled}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 active:bg-zinc-600 disabled:opacity-30 text-sm font-bold transition-colors"
                        aria-label="Tambah 1 Bukan Bumiputera"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Bukan Warganegara */}
                  <div className="rounded-lg bg-zinc-900/90 p-2 border border-zinc-800/80">
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                      Bukan Warganegara
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStepCount(idx, 'foreign_count', -1)}
                        disabled={disabled || row.foreign_count <= 0}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 active:bg-zinc-600 disabled:opacity-30 text-sm font-bold transition-colors"
                        aria-label="Tolak 1 Bukan Warganegara"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={0}
                        aria-label={`Bilangan Bukan Warganegara untuk ${row.trade_name}`}
                        value={row.foreign_count}
                        onChange={(e) => handleCountChange(idx, 'foreign_count', e.target.value)}
                        disabled={disabled}
                        className="w-full text-center rounded-lg border border-zinc-700/80 bg-zinc-950 py-1 text-xs sm:text-sm font-bold text-zinc-100 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleStepCount(idx, 'foreign_count', 1)}
                        disabled={disabled}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 active:bg-zinc-600 disabled:opacity-30 text-sm font-bold transition-colors"
                        aria-label="Tambah 1 Bukan Warganegara"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Trade Controls */}
      <div className="mt-4 pt-3 border-t border-zinc-800/80 space-y-2.5">
        <div className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
          <span>+ Tambah Tred Pekerja</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Quick Selection from Catalog */}
          <div className="flex gap-2">
            <select
              value={selectedCatalogTrade}
              onChange={(e) => {
                setSelectedCatalogTrade(e.target.value);
                if (e.target.value) {
                  handleAddTrade(e.target.value);
                }
              }}
              disabled={disabled || availableCatalogTrades.length === 0}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 disabled:opacity-50"
            >
              <option value="">-- Pilih dari Katalog Tred Piawai --</option>
              {availableCatalogTrades.map((trade) => (
                <option key={trade} value={trade}>
                  {trade}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Trade Name Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={customTradeInput}
              onChange={(e) => setCustomTradeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTrade(customTradeInput);
                }
              }}
              placeholder="Atau taip nama tred khusus..."
              disabled={disabled}
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={() => handleAddTrade(customTradeInput)}
              disabled={disabled || !customTradeInput.trim()}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-xs font-bold text-zinc-950 transition-colors disabled:opacity-40 shrink-0 shadow-md"
            >
              + Tambah
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
