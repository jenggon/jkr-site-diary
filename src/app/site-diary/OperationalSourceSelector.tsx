'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  readonly id: string;
  readonly title: string;
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

function selectedFromTask(task: Task): SelectedOperationalSource {
  return {
    sourceType: 'MSP',
    id: task.task_id,
    title: task.task_name,
    subtitle: task.wbs ? `WBS: ${task.wbs}` : undefined,
    code: task.task_uid ? `UID: ${task.task_uid}` : undefined,
    rawTask: task,
  };
}

function selectedFromVo(vo: VoItemRecord): SelectedOperationalSource {
  return {
    sourceType: 'VO',
    id: vo.vo_item_id,
    title: `${vo.vo_reference}: ${vo.line_item}`,
    subtitle: vo.description || undefined,
    code: vo.vo_reference,
    isOmission: vo.is_omission,
    rawVoItem: vo,
  };
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
  const currentSelection = controlledSource !== undefined ? controlledSource : internalSource;

  const [mspTasks, setMspTasks] = useState<Task[]>([]);
  const [voItems, setVoItems] = useState<VoItemRecord[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingVo, setLoadingVo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(!currentSelection);

  const [showVoModal, setShowVoModal] = useState(false);
  const [newVoRef, setNewVoRef] = useState('');
  const [newLineItem, setNewLineItem] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newIsOmission, setNewIsOmission] = useState(false);
  const [creatingVo, setCreatingVo] = useState(false);
  const [voModalError, setVoModalError] = useState<string | null>(null);

  const commitSelection = useCallback((source: SelectedOperationalSource | null) => {
    setInternalSource(source);
    onSelectSource?.(source);
    setIsExpanded(!source);
  }, [onSelectSource]);

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
      setMspTasks(Array.isArray(json.data) ? json.data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ralat memuatkan kerja jadual (MSP)');
    } finally {
      setLoadingTasks(false);
    }
  }, []);

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
      setVoItems(Array.isArray(json.data) ? json.data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ralat memuatkan item VO / APK');
    } finally {
      setLoadingVo(false);
    }
  }, []);

  useEffect(() => {
    setInternalSource(null);
    onSelectSource?.(null);
    setSearchQuery('');

    if (revisionId) void fetchTasks(revisionId);
    else setMspTasks([]);

    if (programmeId && revisionId) void fetchVoItems(programmeId, revisionId);
    else setVoItems([]);
  }, [programmeId, revisionId, fetchTasks, fetchVoItems, onSelectSource]);

  useEffect(() => {
    if (!showVoModal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !creatingVo) setShowVoModal(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showVoModal, creatingVo]);

  const handleTabChange = (tab: OperationalSourceType) => {
    setActiveTab(tab);
    setSearchQuery('');
    setError(null);
  };

  const handleCreateVoItem = async () => {
    if (!programmeId || !revisionId || creatingVo) return;
    if (!newVoRef.trim() || !newLineItem.trim()) {
      setVoModalError('Sila isi Rujukan VO dan Kerja.');
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

      const json = await res.json().catch(() => null);
      const created = json?.data as VoItemRecord | undefined;

      await fetchVoItems(programmeId, revisionId);
      setShowVoModal(false);
      setNewVoRef('');
      setNewLineItem('');
      setNewDescription('');
      setNewIsOmission(false);

      if (created?.vo_item_id) {
        commitSelection(selectedFromVo(created));
      }
    } catch (err: unknown) {
      setVoModalError(err instanceof Error ? err.message : 'Ralat semasa mendaftar VO');
    } finally {
      setCreatingVo(false);
    }
  };

  const filteredMspTasks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return mspTasks;
    return mspTasks.filter((task) =>
      task.task_name?.toLowerCase().includes(q)
      || task.wbs?.toLowerCase().includes(q)
      || (task.task_uid ? String(task.task_uid).includes(q) : false),
    );
  }, [mspTasks, searchQuery]);

  const filteredVoItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return voItems;
    return voItems.filter((vo) =>
      vo.vo_reference.toLowerCase().includes(q)
      || vo.line_item.toLowerCase().includes(q)
      || Boolean(vo.description?.toLowerCase().includes(q)),
    );
  }, [voItems, searchQuery]);

  if (!programmeId || !revisionId) return null;

  return (
    <section className={`w-full ${className}`} aria-label="Pemilih Sumber Operasi">
      {currentSelection && !isExpanded && (
        <div className="mobile-entry-selected-source flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center text-xs font-bold">
              {currentSelection.sourceType}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase font-bold">
                  {currentSelection.sourceType === 'MSP' ? 'Jadual MSP' : 'VO / APK'}
                </span>
                {currentSelection.code && (
                  <span className="text-[10px] font-mono text-zinc-400">{currentSelection.code}</span>
                )}
                {currentSelection.isOmission && (
                  <span className="text-[10px] font-bold text-red-300">Gugur</span>
                )}
              </div>

              <h3 className="text-sm font-semibold text-zinc-100" title={currentSelection.title}>
                {currentSelection.title}
              </h3>
              {currentSelection.subtitle && (
                <p className="text-xs text-zinc-400">{currentSelection.subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              disabled={disabled}
              aria-label="Tukar sumber aktiviti"
            >
              ↻ Tukar
            </button>
            <button
              type="button"
              onClick={() => commitSelection(null)}
              disabled={disabled}
              aria-label="Kosongkan sumber aktiviti"
              title="Kosongkan pilihan"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {(!currentSelection || isExpanded) && (
        <div className="mobile-entry-spike-panel">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-orange-400 md:hidden">
                Sumber
              </p>
              <h3 className="text-sm font-bold text-zinc-100">Sumber Aktiviti</h3>
            </div>
            {currentSelection && (
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="min-h-[36px] px-2 text-xs text-zinc-400"
              >
                Batal
              </button>
            )}
          </div>

          <div
            role="tablist"
            aria-label="Jenis sumber aktiviti harian"
            className="mobile-entry-source-switcher mb-4 grid grid-cols-2"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'MSP'}
              data-active={activeTab === 'MSP'}
              onClick={() => handleTabChange('MSP')}
              disabled={disabled}
              className="mobile-entry-source-control min-h-[44px] px-3 text-xs font-semibold"
            >
              MSP
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'VO'}
              data-active={activeTab === 'VO'}
              onClick={() => handleTabChange('VO')}
              disabled={disabled}
              className="mobile-entry-source-control min-h-[44px] px-3 text-xs font-semibold"
            >
              VO / APK
            </button>
          </div>

          <div className="mb-3 flex items-center gap-2">
            <div className="mobile-entry-search-shell relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                aria-label={activeTab === 'MSP' ? 'Cari tugasan MSP' : 'Cari kerja VO atau APK'}
                placeholder="Cari"
                className="mobile-entry-search-input w-full px-3 py-2 text-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500"
                  aria-label="Kosongkan carian"
                >
                  ×
                </button>
              )}
            </div>

            {activeTab === 'VO' && (
              <button
                type="button"
                onClick={() => {
                  setVoModalError(null);
                  setShowVoModal(true);
                }}
                disabled={disabled}
                className="min-h-[42px] shrink-0 border border-amber-700 px-3 text-xs font-semibold text-amber-300"
              >
                Daftar VO
              </button>
            )}
          </div>

          {error && (
            <div role="alert" className="mb-3 flex items-center justify-between gap-2 border-y border-red-800/60 bg-red-950/40 p-3 text-xs text-red-200">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => activeTab === 'MSP'
                  ? void fetchTasks(revisionId)
                  : void fetchVoItems(programmeId, revisionId)}
                className="min-h-[36px] px-2 font-semibold"
              >
                Ulang
              </button>
            </div>
          )}

          {activeTab === 'MSP' && (
            <div>
              {loadingTasks ? (
                <div className="py-8 text-center text-xs text-zinc-500">Muat…</div>
              ) : filteredMspTasks.length === 0 ? (
                <div className="border-y border-zinc-800 py-8 text-center text-xs text-zinc-400">
                  Tiada tugasan MSP ditemui.
                </div>
              ) : (
                <div className="mobile-entry-task-list max-h-72 overflow-y-auto">
                  {filteredMspTasks.map((task) => (
                    <button
                      key={task.task_id}
                      type="button"
                      onClick={() => commitSelection(selectedFromTask(task))}
                      disabled={disabled}
                      className="mobile-entry-task-row group flex w-full flex-col gap-1 p-3 text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {task.wbs && <span className="text-[10px] font-mono text-zinc-400">WBS {task.wbs}</span>}
                          {task.task_uid && <span className="text-[10px] font-mono text-zinc-500">UID {task.task_uid}</span>}
                        </div>
                        <span className="mobile-entry-row-action text-[11px] font-semibold" aria-hidden="true">Pilih →</span>
                      </div>
                      <div className="text-[13px] font-semibold leading-snug text-zinc-200">{task.task_name}</div>
                      {(task.planned_start || task.planned_finish || task.planned_duration_days) && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-500">
                          {task.planned_start && <span>Mula {task.planned_start}</span>}
                          {task.planned_finish && <span>Tamat {task.planned_finish}</span>}
                          {task.planned_duration_days != null && <span>{task.planned_duration_days} hari</span>}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'VO' && (
            <div>
              {loadingVo ? (
                <div className="py-8 text-center text-xs text-zinc-500">Muat…</div>
              ) : filteredVoItems.length === 0 ? (
                <div className="border-y border-zinc-800 py-8 text-center text-xs text-zinc-400">
                  Tiada VO / APK ditemui. Daftar hanya jika kerja itu memang di luar jadual MSP semasa.
                </div>
              ) : (
                <div className="mobile-entry-task-list max-h-72 overflow-y-auto">
                  {filteredVoItems.map((vo) => (
                    <button
                      key={vo.vo_item_id}
                      type="button"
                      onClick={() => commitSelection(selectedFromVo(vo))}
                      disabled={disabled}
                      className="mobile-entry-task-row group flex w-full flex-col gap-1 p-3 text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono text-amber-300">{vo.vo_reference}</span>
                          {vo.is_omission && <span className="text-[10px] font-bold text-red-300">Gugur</span>}
                        </div>
                        <span className="mobile-entry-row-action text-[11px] font-semibold" aria-hidden="true">Pilih →</span>
                      </div>
                      <div className="text-[13px] font-semibold leading-snug text-zinc-200">{vo.line_item}</div>
                      {vo.description && <p className="line-clamp-2 text-xs text-zinc-400">{vo.description}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showVoModal && (
        <div
          className="ng-vo-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !creatingVo) setShowVoModal(false);
          }}
        >
          <div
            className="ng-vo-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ng-vo-dialog-title"
          >
            <div className="ng-vo-dialog__header">
              <div>
                <span className="ng-vo-dialog__eyebrow">Sumber luar MSP</span>
                <h4 id="ng-vo-dialog-title" className="ng-vo-dialog__title">VO / APK Baharu</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowVoModal(false)}
                disabled={creatingVo}
                className="ng-vo-dialog__close"
                aria-label="Tutup pendaftaran VO"
              >
                ×
              </button>
            </div>

            {voModalError && (
              <div role="alert" className="mt-3 border-y border-red-800/60 bg-red-950/40 p-2.5 text-xs text-red-200">
                {voModalError}
              </div>
            )}

            <div className="ng-vo-dialog__fields">
              <div className="ng-vo-dialog__field">
                <label htmlFor="new-vo-reference">Rujukan *</label>
                <input
                  id="new-vo-reference"
                  type="text"
                  required
                  value={newVoRef}
                  onChange={(event) => setNewVoRef(event.target.value)}
                  placeholder="Contoh: VO-03 / APK-01"
                  disabled={creatingVo}
                />
              </div>

              <div className="ng-vo-dialog__field">
                <label htmlFor="new-vo-work">Kerja *</label>
                <input
                  id="new-vo-work"
                  type="text"
                  required
                  value={newLineItem}
                  onChange={(event) => setNewLineItem(event.target.value)}
                  placeholder="Tajuk kerja"
                  disabled={creatingVo}
                />
              </div>

              <div className="ng-vo-dialog__field">
                <label htmlFor="new-vo-description">Huraian</label>
                <textarea
                  id="new-vo-description"
                  rows={3}
                  value={newDescription}
                  onChange={(event) => setNewDescription(event.target.value)}
                  placeholder="Skop ringkas / lokasi / arahan berkaitan"
                  disabled={creatingVo}
                />
              </div>

              <label className="ng-vo-dialog__omission" htmlFor="new-vo-omission">
                <input
                  id="new-vo-omission"
                  type="checkbox"
                  checked={newIsOmission}
                  onChange={(event) => setNewIsOmission(event.target.checked)}
                  disabled={creatingVo}
                />
                <span>Kerja Gugur / Omission</span>
              </label>
            </div>

            <div className="ng-vo-dialog__actions">
              <button
                type="button"
                onClick={() => setShowVoModal(false)}
                disabled={creatingVo}
                className="ng-vo-dialog__cancel"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void handleCreateVoItem()}
                disabled={creatingVo}
                className="ng-vo-dialog__save"
              >
                {creatingVo ? 'Menyimpan…' : 'Daftar & Pilih'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
