'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useDailyEntryContext } from './DailyEntryShell';
import { Task } from '@/types/task';

export type OperationalSourceType = 'MSP' | 'VO';

export interface VoItemRecord {
  readonly vo_item_id: string;
  readonly programme_id: string;
  readonly revision_id: string;
  readonly vo_reference: string;
  readonly line_item: string;
  readonly description?: string | null;
  readonly is_omission: boolean;
  readonly created_at: string;
}

export interface SelectedOperationalSource {
  readonly sourceType: OperationalSourceType;
  readonly id: string; // taskId or voItemId
  readonly title: string; // Task Name or VO Reference + Line Item
  readonly subtitle?: string | undefined;
  readonly code?: string | undefined;
  readonly isOmission?: boolean | undefined;
  readonly rawTask?: Task | undefined;
  readonly rawVoItem?: VoItemRecord | undefined;
}

export interface OperationalSourceSelectorProps {
  readonly onSelectSource?: (source: SelectedOperationalSource | null) => void;
  readonly selectedSource?: SelectedOperationalSource | null;
  readonly disabled?: boolean;
  readonly className?: string;
}

export default function OperationalSourceSelector({
  onSelectSource,
  selectedSource: controlledSource,
  disabled = false,
  className = '',
}: OperationalSourceSelectorProps) {
  const { programmeId, revisionId } = useDailyEntryContext();

  const [activeTab, setActiveTab] = useState<OperationalSourceType>('MSP');
  const [internalSource, setInternalSource] = useState<SelectedOperationalSource | null>(null);

  // Derive active selected source (controlled vs internal)
  const currentSelection = controlledSource !== undefined ? controlledSource : internalSource;

  // Data states
  const [mspTasks, setMspTasks] = useState<Task[]>([]);
  const [voItems, setVoItems] = useState<VoItemRecord[]>([]);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(false);
  const [loadingVo, setLoadingVo] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean>(!currentSelection);

  // New VO Modal State
  const [showVoModal, setShowVoModal] = useState<boolean>(false);
  const [newVoRef, setNewVoRef] = useState<string>('');
  const [newLineItem, setNewLineItem] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newIsOmission, setNewIsOmission] = useState<boolean>(false);
  const [creatingVo, setCreatingVo] = useState<boolean>(false);
  const [voModalError, setVoModalError] = useState<string | null>(null);

  // 1. Fetch MSP Tasks for the current authorised revision
  const fetchTasks = useCallback(async (targetRevisionId: string) => {
    setLoadingTasks(true);
    setError(null);
    try {
      const res = await fetch(`/api/task/revision/${encodeURIComponent(targetRevisionId)}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || 'Gagal memuatkan tugasan jadual (MSP)');
      }
      const json = await res.json();
      const list: Task[] = Array.isArray(json.data) ? json.data : [];
      setMspTasks(list);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ralat memuatkan kerja jadual (MSP)';
      setError(msg);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  // 2. Fetch VO Items for current programme & revision
  const fetchVoItems = useCallback(async (progId: string, revId: string) => {
    setLoadingVo(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/vo-items?programmeId=${encodeURIComponent(progId)}&revisionId=${encodeURIComponent(revId)}`,
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || 'Gagal memuatkan rekod VO / APK');
      }
      const json = await res.json();
      const list: VoItemRecord[] = Array.isArray(json.data) ? json.data : [];
      setVoItems(list);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ralat memuatkan item VO / APK';
      setError(msg);
    } finally {
      setLoadingVo(false);
    }
  }, []);

  // Reaction to Programme / Revision context changes: clear stale selection and reload
  useEffect(() => {
    // Clear selection when context changes
    setInternalSource(null);
    if (onSelectSource) onSelectSource(null);
    setSearchQuery('');

    if (revisionId) {
      fetchTasks(revisionId);
    } else {
      setMspTasks([]);
    }

    if (programmeId && revisionId) {
      fetchVoItems(programmeId, revisionId);
    } else {
      setVoItems([]);
    }
  }, [programmeId, revisionId, fetchTasks, fetchVoItems, onSelectSource]);

  // Handle Tab Switch (XOR visual switch)
  const handleTabChange = (tab: OperationalSourceType) => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  // Handle Selecting an MSP Task (Strict XOR: Clears any VO item)
  const handleSelectMspTask = (task: Task) => {
    const source: SelectedOperationalSource = {
      sourceType: 'MSP',
      id: task.task_id,
      title: task.task_name,
      subtitle: task.wbs ? `WBS: ${task.wbs}` : undefined,
      code: task.task_uid ? `UID: ${task.task_uid}` : undefined,
      rawTask: task,
    };
    setInternalSource(source);
    if (onSelectSource) onSelectSource(source);
    setIsExpanded(false);
  };

  // Handle Selecting a VO Item (Strict XOR: Clears any MSP task)
  const handleSelectVoItem = (vo: VoItemRecord) => {
    const source: SelectedOperationalSource = {
      sourceType: 'VO',
      id: vo.vo_item_id,
      title: `${vo.vo_reference}: ${vo.line_item}`,
      subtitle: vo.description || undefined,
      code: vo.vo_reference,
      isOmission: vo.is_omission,
      rawVoItem: vo,
    };
    setInternalSource(source);
    if (onSelectSource) onSelectSource(source);
    setIsExpanded(false);
  };

  // Handle Clearing/Changing Selection
  const handleClearSelection = () => {
    setInternalSource(null);
    if (onSelectSource) onSelectSource(null);
    setIsExpanded(true);
  };

  // Handle Registering a New VO Item
  const handleCreateVoItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programmeId || !revisionId) return;
    if (!newVoRef.trim() || !newLineItem.trim()) {
      setVoModalError('Sila isi Rujukan VO dan Item Baris');
      return;
    }

    setCreatingVo(true);
    setVoModalError(null);
    try {
      const res = await fetch('/api/vo-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programmeId,
          revisionId,
          voReference: newVoRef.trim(),
          lineItem: newLineItem.trim(),
          description: newDescription.trim() || undefined,
          isOmission: newIsOmission,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || 'Gagal mendaftar item VO');
      }

      // Refresh VO list and select the newly created item
      await fetchVoItems(programmeId, revisionId);
      setShowVoModal(false);
      setNewVoRef('');
      setNewLineItem('');
      setNewDescription('');
      setNewIsOmission(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ralat semasa mendaftar VO';
      setVoModalError(msg);
    } finally {
      setCreatingVo(false);
    }
  };

  // Filtered MSP Tasks
  const filteredMspTasks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return mspTasks;
    return mspTasks.filter((t) => {
      const nameMatch = t.task_name?.toLowerCase().includes(q);
      const wbsMatch = t.wbs?.toLowerCase().includes(q);
      const uidMatch = t.task_uid ? String(t.task_uid).includes(q) : false;
      return nameMatch || wbsMatch || uidMatch;
    });
  }, [mspTasks, searchQuery]);

  // Filtered VO Items
  const filteredVoItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return voItems;
    return voItems.filter((v) => {
      const refMatch = v.vo_reference.toLowerCase().includes(q);
      const itemMatch = v.line_item.toLowerCase().includes(q);
      const descMatch = v.description ? v.description.toLowerCase().includes(q) : false;
      return refMatch || itemMatch || descMatch;
    });
  }, [voItems, searchQuery]);

  if (!programmeId || !revisionId) {
    return null;
  }

  return (
    <section className={`w-full ${className}`} aria-label="Pemilih Sumber Operasi">
      {/* Selected Source Summary Banner (when an item is selected and list is collapsed) */}
      {currentSelection && !isExpanded && (
        <div className="mobile-entry-selected-source rounded-2xl border border-zinc-700/80 bg-zinc-900/90 p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                currentSelection.sourceType === 'MSP'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-600/40'
                  : 'bg-amber-600/20 text-amber-400 border border-amber-600/40'
              }`}
            >
              {currentSelection.sourceType === 'MSP' ? 'MSP' : 'VO'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                    currentSelection.sourceType === 'MSP'
                      ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                      : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                  }`}
                >
                  {currentSelection.sourceType === 'MSP'
                    ? 'MSP'
                    : 'VO'}
                </span>
                {currentSelection.code && (
                  <span className="text-[10px] font-mono text-zinc-400">
                    {currentSelection.code}
                  </span>
                )}
                {currentSelection.isOmission && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                    Gugur
                  </span>
                )}
              </div>
              <h3
                className="text-sm sm:text-base font-semibold text-zinc-100 mt-1 truncate"
                title={currentSelection.title}
              >
                {currentSelection.title}
              </h3>
              {currentSelection.subtitle && (
                <p className="text-xs text-zinc-400 mt-0.5 truncate">{currentSelection.subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              disabled={disabled}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 transition-colors"
            >
              Tukar
            </button>
            <button
              type="button"
              onClick={handleClearSelection}
              disabled={disabled}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800/60 transition-colors"
              title="Padam pilihan"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Expanded Source Selector Surface */}
      {(!currentSelection || isExpanded) && (
        <div className="mobile-entry-spike-panel rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-400 md:hidden">
                Sumber
              </p>
              <h3 className="text-sm sm:text-base font-bold text-zinc-100">
                Sumber
              </h3>
            </div>
            {currentSelection && (
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="text-xs text-zinc-400 hover:text-zinc-200 underline"
              >
                Batal
              </button>
            )}
          </div>

          {/* Operational Source XOR Switcher Tabs */}
          <div
            role="tablist"
            aria-label="Jenis sumber aktiviti harian"
            className="mobile-entry-source-switcher grid grid-cols-2 gap-2 p-1 rounded-xl bg-zinc-950 border border-zinc-800 mb-4"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'MSP'}
              data-active={activeTab === 'MSP'}
              onClick={() => handleTabChange('MSP')}
              disabled={disabled}
              className={`mobile-entry-source-control min-h-[44px] py-2.5 px-3 rounded-lg font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${
                activeTab === 'MSP'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>MSP</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'VO'}
              data-active={activeTab === 'VO'}
              onClick={() => handleTabChange('VO')}
              disabled={disabled}
              className={`mobile-entry-source-control min-h-[44px] py-2.5 px-3 rounded-lg font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${
                activeTab === 'VO'
                  ? 'bg-blue-600 text-white shadow-md md:bg-amber-600'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>VO</span>
            </button>
          </div>

          {/* Search bar & actions */}
          <div className="flex items-center gap-2 mb-3">
            <div className="mobile-entry-search-shell relative flex-1">
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label={activeTab === 'MSP' ? 'Cari tugasan MSP' : 'Cari kerja VO atau APK'}
                placeholder={
                  activeTab === 'MSP'
                    ? 'Cari'
                    : 'Cari'
                }
                className="mobile-entry-search-input w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2 text-xs sm:text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {activeTab === 'VO' && (
              <button
                type="button"
                onClick={() => setShowVoModal(true)}
                className="px-3 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-600/50 text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-colors"
              >
                <span>Tambah</span>
              </button>
            )}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="rounded-xl border border-red-800/60 bg-red-950/40 p-3 text-red-200 text-xs mb-3 flex items-center justify-between gap-2">
              <span>{error}</span>
              <button
                type="button"
                onClick={() =>
                  activeTab === 'MSP'
                    ? fetchTasks(revisionId)
                    : fetchVoItems(programmeId, revisionId)
                }
                className="px-2 py-0.5 rounded bg-red-900 hover:bg-red-800 text-white font-semibold"
              >
                Ulang
              </button>
            </div>
          )}

          {/* Tab 1: MSP Task List */}
          {activeTab === 'MSP' && (
            <div>
              {loadingTasks ? (
                <div className="py-8 text-center text-xs text-zinc-500 animate-pulse">
                  Muat…
                </div>
              ) : filteredMspTasks.length === 0 ? (
                <div className="py-8 text-center rounded-xl border border-zinc-800/60 bg-zinc-950/40 p-4">
                  <p className="text-xs sm:text-sm font-semibold text-zinc-300">
                    {searchQuery
                      ? 'Tiada'
                      : 'Tiada'}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-1">

                  </p>
                </div>
              ) : (
                <div className="mobile-entry-task-list max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {filteredMspTasks.map((task) => (
                    <button
                      key={task.task_id}
                      type="button"
                      onClick={() => handleSelectMspTask(task)}
                      className="mobile-entry-task-row w-full text-left p-3 rounded-xl border border-zinc-800 bg-zinc-950/80 hover:bg-zinc-800/80 hover:border-blue-600/50 transition-all group flex flex-col gap-1 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={disabled}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {task.wbs && (
                            <span className="text-[11px] md:text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                              WBS {task.wbs}
                            </span>
                          )}
                          {task.task_uid && (
                            <span className="text-[11px] md:text-[10px] font-mono text-zinc-500">
                              #{task.task_uid}
                            </span>
                          )}
                          {task.trade_name && (
                            <span className="text-[11px] md:text-[10px] text-blue-400 font-medium">
                              {task.trade_name}
                            </span>
                          )}
                        </div>
                        <span
                          className="mobile-entry-row-action text-[11px] text-zinc-500 group-hover:text-blue-400 transition-colors font-semibold"
                          aria-hidden="true"
                        >
                          <span className="md:hidden">&rarr;</span>
                          <span className="hidden md:inline">Pilih &rarr;</span>
                        </span>
                      </div>

                      <div className="text-[13px] sm:text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors leading-snug">
                        {task.task_name}
                      </div>

                      {(task.planned_start ||
                        task.planned_finish ||
                        task.planned_duration_days) && (
                        <div className="flex items-center gap-3 text-[11px] md:text-[10px] text-zinc-500 mt-0.5">
                          {task.planned_start && <span>Mula: {task.planned_start}</span>}
                          {task.planned_finish && <span>Tamat: {task.planned_finish}</span>}
                          {task.planned_duration_days !== null && (
                            <span>{task.planned_duration_days} hari</span>
                          )}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: VO / APK List */}
          {activeTab === 'VO' && (
            <div>
              {loadingVo ? (
                <div className="py-8 text-center text-xs text-zinc-500 animate-pulse">
                  Muat…
                </div>
              ) : filteredVoItems.length === 0 ? (
                <div className="py-8 text-center rounded-xl border border-zinc-800/60 bg-zinc-950/40 p-4">
                  <p className="text-xs sm:text-sm font-semibold text-zinc-300">
                    {searchQuery
                      ? 'Tiada'
                      : 'Tiada'}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-1">

                  </p>
                  <button
                    type="button"
                    onClick={() => setShowVoModal(true)}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors inline-block"
                  >
                    Tambah
                  </button>
                </div>
              ) : (
                <div className="mobile-entry-task-list max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {filteredVoItems.map((vo) => (
                    <button
                      key={vo.vo_item_id}
                      type="button"
                      onClick={() => handleSelectVoItem(vo)}
                      className="mobile-entry-task-row w-full text-left p-3 rounded-xl border border-zinc-800 bg-zinc-950/80 hover:bg-zinc-800/80 hover:border-amber-600/50 transition-all group flex flex-col gap-1 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={disabled}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] md:text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                            {vo.vo_reference}
                          </span>
                          {vo.is_omission ? (
                            <span className="text-[11px] md:text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                              Gugur
                            </span>
                          ) : (
                            <span className="text-[11px] md:text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                              Tambah
                            </span>
                          )}
                        </div>
                        <span
                          className="mobile-entry-row-action text-[11px] text-zinc-500 group-hover:text-amber-400 transition-colors font-semibold"
                          aria-hidden="true"
                        >
                          <span className="md:hidden">&rarr;</span>
                          <span className="hidden md:inline">Pilih &rarr;</span>
                        </span>
                      </div>

                      <div className="text-[13px] sm:text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors leading-snug">
                        {vo.line_item}
                      </div>

                      {vo.description && (
                        <p className="text-xs md:text-[11px] text-zinc-400 line-clamp-2 mt-0.5">
                          {vo.description}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal: Register New VO Item */}
      {showVoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h4 className="text-sm sm:text-base font-bold text-zinc-100">
                VO Baharu
              </h4>
              <button
                type="button"
                onClick={() => setShowVoModal(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm"
              >
                ✕
              </button>
            </div>

            {voModalError && (
              <div className="mb-3 rounded-lg border border-red-800/60 bg-red-950/40 p-2.5 text-xs text-red-200">
                {voModalError}
              </div>
            )}

            <form onSubmit={handleCreateVoItem} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Rujukan *
                </label>
                <input
                  type="text"
                  required
                  value={newVoRef}
                  onChange={(e) => setNewVoRef(e.target.value)}
                  placeholder="VO / APK"
                  className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Kerja *
                </label>
                <input
                  type="text"
                  required
                  value={newLineItem}
                  onChange={(e) => setNewLineItem(e.target.value)}
                  placeholder="Tajuk kerja"
                  className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Huraian
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Huraian"
                  className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isOmissionCheckbox"
                  checked={newIsOmission}
                  onChange={(e) => setNewIsOmission(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-950 text-amber-600 focus:ring-amber-500"
                />
                <label
                  htmlFor="isOmissionCheckbox"
                  className="text-xs text-zinc-300 cursor-pointer"
                >
                  Kerja Gugur
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowVoModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creatingVo}
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white transition-colors disabled:opacity-50"
                >
                  {creatingVo ? 'Simpan…' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
