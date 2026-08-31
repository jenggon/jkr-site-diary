'use client';

import React, { useMemo, useState } from 'react';

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

type CountField = 'bumi_count' | 'non_bumi_count' | 'foreign_count';

const CLASSIFICATIONS: Array<{ field: CountField; short: string; label: string }> = [
  { field: 'bumi_count', short: 'BUMI', label: 'Bumiputera' },
  { field: 'non_bumi_count', short: 'NON-B', label: 'Bukan Bumiputera' },
  { field: 'foreign_count', short: 'FOREIGN', label: 'Bukan Warganegara' },
];

export default function WorkforceEntry({
  manpower,
  onChange,
  disabled = false,
  className = '',
}: WorkforceEntryProps) {
  const [selectedCatalogTrade, setSelectedCatalogTrade] = useState('');
  const [customTradeInput, setCustomTradeInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const overallTotal = useMemo(
    () =>
      manpower.reduce(
        (total, row) =>
          total +
          Math.max(0, row.bumi_count || 0) +
          Math.max(0, row.non_bumi_count || 0) +
          Math.max(0, row.foreign_count || 0),
        0,
      ),
    [manpower],
  );

  const availableCatalogTrades = useMemo(() => {
    const existing = new Set(manpower.map((row) => row.trade_name.trim().toLowerCase()));
    return COMMON_TRADES_CATALOG.filter((trade) => !existing.has(trade.toLowerCase()));
  }, [manpower]);

  const handleCountChange = (index: number, field: CountField, rawValue: string | number) => {
    setValidationError(null);
    const parsed = typeof rawValue === 'number' ? rawValue : Number.parseInt(rawValue, 10);
    const value = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
    onChange(manpower.map((row, idx) => (idx === index ? { ...row, [field]: value } : row)));
  };

  const handleStepCount = (index: number, field: CountField, delta: number) => {
    if (disabled) return;
    const row = manpower[index];
    if (!row) return;
    handleCountChange(index, field, Math.max(0, (row[field] || 0) + delta));
  };

  const handleAddTrade = (tradeToAdd: string) => {
    setValidationError(null);
    const trimmed = tradeToAdd.trim();
    if (!trimmed) {
      setValidationError('Sila pilih atau masukkan nama tred.');
      return;
    }
    if (manpower.some((row) => row.trade_name.trim().toLowerCase() === trimmed.toLowerCase())) {
      setValidationError(`Tred "${trimmed}" telah wujud dalam senarai.`);
      return;
    }

    onChange([
      ...manpower,
      { trade_name: trimmed, bumi_count: 0, non_bumi_count: 0, foreign_count: 0 },
    ]);
    setSelectedCatalogTrade('');
    setCustomTradeInput('');
  };

  const handleRemoveTrade = (index: number) => {
    if (disabled) return;
    setValidationError(null);
    onChange(manpower.filter((_, idx) => idx !== index));
  };

  return (
    <section className={`ng-workforce ${className}`} aria-label="Bahagian Tenaga Kerja Tapak">
      <header className="ng-workforce__header">
        <div className="min-w-0">
          <div className="ng-workforce__kicker">WORKFORCE / SITE ROSTER</div>
          <h3 className="ng-workforce__title">Tenaga Kerja di Tapak (Workforce)</h3>
          <p className="ng-workforce__hint">Pecahan pekerja mengikut tred dan kerakyatan</p>
        </div>
        <div className="ng-workforce__overall" aria-label={`${overallTotal} Orang`}>
          <span>JUMLAH</span>
          <strong data-testid="overall-workforce-total">{overallTotal}</strong>
          <small>ORANG</small>
        </div>
      </header>

      {validationError && (
        <div role="alert" className="ng-workforce__alert">{validationError}</div>
      )}

      <div className="ng-workforce__matrix-head" aria-hidden="true">
        <span>TRED</span>
        <span>BUMI</span>
        <span>NON-B</span>
        <span>FOREIGN</span>
        <span>Σ</span>
      </div>

      <div className="ng-workforce__rows">
        {manpower.length === 0 ? (
          <div className="ng-workforce__empty">Tiada tred tenaga kerja ditambah.</div>
        ) : (
          manpower.map((row, idx) => {
            const rowTotal =
              Math.max(0, row.bumi_count || 0) +
              Math.max(0, row.non_bumi_count || 0) +
              Math.max(0, row.foreign_count || 0);

            return (
              <div key={`${row.trade_name}-${idx}`} data-testid={`workforce-row-${idx}`} className="ng-workforce__row">
                <div className="ng-workforce__trade">
                  <span title={row.trade_name}>{row.trade_name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTrade(idx)}
                    disabled={disabled}
                    aria-label={`Padam tred ${row.trade_name}`}
                    className="ng-workforce__remove"
                  >
                    ×
                  </button>
                </div>

                <div className="ng-workforce__counts">
                  {CLASSIFICATIONS.map(({ field, short, label }) => (
                    <div key={field} className="ng-workforce__count-cell">
                      <label htmlFor={`workforce-${idx}-${field}`}>{short}</label>
                      <div className="ng-workforce__stepper">
                        <button
                          type="button"
                          onClick={() => handleStepCount(idx, field, -1)}
                          disabled={disabled || row[field] <= 0}
                          aria-label={`Tolak 1 ${label}`}
                        >
                          −
                        </button>
                        <input
                          id={`workforce-${idx}-${field}`}
                          type="number"
                          min={0}
                          inputMode="numeric"
                          aria-label={`Bilangan ${label} untuk ${row.trade_name}`}
                          value={row[field]}
                          onChange={(event) => handleCountChange(idx, field, event.target.value)}
                          disabled={disabled}
                        />
                        <button
                          type="button"
                          onClick={() => handleStepCount(idx, field, 1)}
                          disabled={disabled}
                          aria-label={`Tambah 1 ${label}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="ng-workforce__row-total" data-testid={`trade-total-${idx}`}>
                  <span>Σ</span>
                  <strong>{rowTotal}</strong>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="ng-workforce__add">
        <div className="ng-workforce__add-title">ADD TRADE</div>
        <select
          value={selectedCatalogTrade}
          onChange={(event) => {
            const value = event.target.value;
            setSelectedCatalogTrade(value);
            if (value) handleAddTrade(value);
          }}
          disabled={disabled || availableCatalogTrades.length === 0}
          aria-label="Pilih dari katalog tred piawai"
        >
          <option value="">Pilih dari katalog tred piawai</option>
          {availableCatalogTrades.map((trade) => (
            <option key={trade} value={trade}>{trade}</option>
          ))}
        </select>

        <div className="ng-workforce__custom-add">
          <input
            type="text"
            value={customTradeInput}
            onChange={(event) => setCustomTradeInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleAddTrade(customTradeInput);
              }
            }}
            placeholder="Atau taip nama tred khusus..."
            disabled={disabled}
            aria-label="Nama tred khusus"
          />
          <button
            type="button"
            onClick={() => handleAddTrade(customTradeInput)}
            disabled={disabled || !customTradeInput.trim()}
          >
            + TAMBAH
          </button>
        </div>
      </div>
    </section>
  );
}
