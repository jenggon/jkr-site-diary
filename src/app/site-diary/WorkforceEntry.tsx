'use client';

import React, { Fragment, useMemo, useState } from 'react';

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

type ActiveCountCell = {
  rowIndex: number;
  field: CountField;
} | null;

const CLASSIFICATIONS: Array<{ field: CountField; short: string; label: string; ariaLabel: string }> = [
  { field: 'bumi_count', short: 'B', label: 'Bumiputera', ariaLabel: 'Bumiputera' },
  { field: 'non_bumi_count', short: 'BB', label: 'Bukan Bumiputera', ariaLabel: 'Bukan Bumiputera' },
  { field: 'foreign_count', short: 'A', label: 'Asing', ariaLabel: 'Bukan Warganegara' },
];

function rosterTradeLabel(tradeName: string): string {
  const trimmed = tradeName.trim();
  const localLabel = trimmed.match(/\(([^()]+)\)\s*$/)?.[1]?.trim();
  return localLabel || trimmed;
}

function WorkforceHardhatIcon() {
  return (
    <svg
      className="ng-workforce__overall-icon"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 13v-1a7 7 0 0 1 14 0v1" />
      <path d="M8.2 12V8.7M15.8 12V8.7" />
      <path d="M3.5 13h17" />
      <path d="M6.5 16h11" />
    </svg>
  );
}

export default function WorkforceEntry({
  manpower,
  onChange,
  disabled = false,
  className = '',
}: WorkforceEntryProps) {
  const [selectedCatalogTrade, setSelectedCatalogTrade] = useState('');
  const [customTradeInput, setCustomTradeInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activeCell, setActiveCell] = useState<ActiveCountCell>(null);

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

  const activeRow = activeCell ? manpower[activeCell.rowIndex] ?? null : null;
  const activeClassification = activeCell
    ? CLASSIFICATIONS.find(({ field }) => field === activeCell.field) ?? null
    : null;
  const activeValue = activeCell && activeRow ? Math.max(0, activeRow[activeCell.field] || 0) : null;

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

  const handleActiveStep = (delta: number) => {
    if (!activeCell || !activeRow || disabled) return;
    handleStepCount(activeCell.rowIndex, activeCell.field, delta);
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
    setActiveCell(null);
    onChange(manpower.filter((_, idx) => idx !== index));
  };

  return (
    <section
      className={`ng-workforce ${className}`}
      aria-label="Bahagian Tenaga Kerja Tapak"
      data-workforce-has-entry={overallTotal > 0 ? 'true' : 'false'}
      data-workforce-editing={activeCell ? 'true' : 'false'}
    >
      <header className="ng-workforce__header">
        <div className="min-w-0">
          <div className="ng-workforce__kicker">PEKERJA</div>
          <h3 className="ng-workforce__title" aria-label="Tenaga Kerja Tapak">
            Pekerja
          </h3>
          <p className="ng-workforce__hint">Tap angka</p>
        </div>
        <div className="ng-workforce__overall" aria-label={`${overallTotal} pekerja`}>
          <WorkforceHardhatIcon />
          <strong data-testid="overall-workforce-total">{overallTotal}</strong>
        </div>
      </header>

      {validationError && (
        <div role="alert" className="ng-workforce__alert">{validationError}</div>
      )}

      <div className="ng-workforce__matrix-head" aria-hidden="true">
        <span>TRED</span>
        <span title="Bumiputera">B</span>
        <span title="Bukan Bumiputera">BB</span>
        <span title="Asing">A</span>
        <span>JUMLAH</span>
      </div>

      <div className="ng-workforce__rows">
        {manpower.length === 0 ? (
          <div className="ng-workforce__empty">Tiada</div>
        ) : (
          manpower.map((row, idx) => {
            const rowTotal =
              Math.max(0, row.bumi_count || 0) +
              Math.max(0, row.non_bumi_count || 0) +
              Math.max(0, row.foreign_count || 0);
            const compactTradeName = rosterTradeLabel(row.trade_name);
            const rowIsActive = activeCell?.rowIndex === idx;

            return (
              <Fragment key={`${row.trade_name}-${idx}`}>
                <div
                  data-testid={`workforce-row-${idx}`}
                  className={`ng-workforce__row${rowIsActive ? ' is-active' : ''}`}
                >
                  <div className="ng-workforce__trade">
                    <span title={row.trade_name}>{compactTradeName}</span>
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
                    {CLASSIFICATIONS.map(({ field, short, ariaLabel }) => {
                      const isActive = activeCell?.rowIndex === idx && activeCell.field === field;
                      const value = Math.max(0, row[field] || 0);

                      return (
                        <div key={field} className="ng-workforce__count-cell">
                          <input
                            className="ng-workforce__compat-input sr-only"
                            type="number"
                            value={value}
                            readOnly
                            tabIndex={-1}
                            aria-hidden="true"
                            aria-label={`Bilangan ${ariaLabel} untuk ${row.trade_name}`}
                          />
                          <button
                            type="button"
                            className={`ng-workforce__figure${isActive ? ' is-active' : ''}`}
                            onClick={() => {
                              if (disabled) return;
                              setActiveCell((current) =>
                                current?.rowIndex === idx && current.field === field
                                  ? null
                                  : { rowIndex: idx, field },
                              );
                            }}
                            disabled={disabled}
                            aria-pressed={isActive}
                            aria-label={`${ariaLabel}, ${row.trade_name}: ${value} orang. Tekan untuk laras.`}
                            title={`${ariaLabel}: ${value}`}
                            data-testid={`workforce-cell-${idx}-${field}`}
                          >
                            {value}
                            <span className="sr-only"> {short}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="ng-workforce__row-total" data-testid={`trade-total-${idx}`}>
                    <span className="sr-only">Jumlah</span>
                    <strong>{rowTotal}</strong>
                  </div>
                </div>

                {rowIsActive && activeRow && activeClassification && (
                  <div
                    className="ng-workforce__controller is-active"
                    data-testid="workforce-active-controller"
                    aria-label={`Laras ${activeClassification.ariaLabel} untuk ${row.trade_name}`}
                  >
                    <div className="ng-workforce__controller-meta">
                      <span>{activeClassification.label}</span>
                      <strong>{compactTradeName}</strong>
                    </div>
                    <div className="ng-workforce__controller-stepper">
                      <button
                        type="button"
                        onClick={() => handleActiveStep(-1)}
                        disabled={disabled || (activeValue ?? 0) <= 0}
                        aria-label={`Tolak 1 ${activeClassification.ariaLabel}`}
                      >
                        −
                      </button>
                      <output aria-live="polite" data-testid="workforce-active-value">
                        {activeValue ?? 0}
                      </output>
                      <button
                        type="button"
                        onClick={() => handleActiveStep(1)}
                        disabled={disabled}
                        aria-label={`Tambah 1 ${activeClassification.ariaLabel}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </Fragment>
            );
          })
        )}
      </div>

      <div className="ng-workforce__add">
        <div className="ng-workforce__add-title">TRED</div>
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
          <option value="">Pilih tred</option>
          {availableCatalogTrades.map((trade) => (
            <option key={trade} value={trade}>{rosterTradeLabel(trade)}</option>
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
            placeholder="Tred baharu"
            disabled={disabled}
            aria-label="Nama tred khusus"
          />
          <button
            type="button"
            onClick={() => handleAddTrade(customTradeInput)}
            disabled={disabled || !customTradeInput.trim()}
          >
            Tambah
          </button>
        </div>
      </div>
    </section>
  );
}
