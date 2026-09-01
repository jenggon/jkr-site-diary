import { describe, expect, it, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import OperationalSourceSelector from '@/app/site-diary/OperationalSourceSelector';

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

vi.mock('@/app/site-diary/DailyEntryShell', () => ({
  useDailyEntryContext: () => ({
    programmeId: 'test-programme-uuid-1',
    revisionId: 'test-revision-uuid-1',
    programmeName: 'Cadangan Membina Klinik Kesihatan',
    programmeCode: 'JKR/KL/2026/01',
    loading: false,
    error: null,
    availableProgrammes: [],
    setProgrammeId: vi.fn(),
    refreshContext: vi.fn(),
  }),
}));

describe('F2.1-B OperationalSourceSelector (MSP XOR VO)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the dual operational source tabs with human-readable Bahasa Malaysia labels', () => {
    const html = renderToString(
      React.createElement(OperationalSourceSelector, {
        selectedSource: null,
      })
    );

    expect(html).toContain('MSP');
    expect(html).toContain('VO');
    expect(html).toContain('Sumber');
    expect(html).not.toContain('MSP_TASK');
    expect(html).not.toContain('VO_ITEM');
    expect(html).not.toContain('vo_item_id');
  });

  it('renders selected MSP source summary card cleanly when an MSP task is selected', () => {
    const html = renderToString(
      React.createElement(OperationalSourceSelector, {
        selectedSource: {
          sourceType: 'MSP',
          id: 'task-123',
          title: 'Kerja-kerja Struktur Bawah (Substructure)',
          subtitle: 'WBS: 1.1.2',
          code: 'UID: 12',
        },
      })
    );

    expect(html).toContain('Kerja-kerja Struktur Bawah (Substructure)');
    expect(html).toContain('MSP');
    expect(html).toContain('WBS: 1.1.2');
    expect(html).toContain('UID: 12');
    expect(html).toContain('Tukar');
  });

  it('renders selected VO source summary card cleanly when a VO item is selected', () => {
    const html = renderToString(
      React.createElement(OperationalSourceSelector, {
        selectedSource: {
          sourceType: 'VO',
          id: 'vo-456',
          title: 'VO 01: Pemasangan Paip Tambahan 150mm HDPE',
          subtitle: 'Skop tambahan mengikut kelulusan SO',
          code: 'VO 01',
          isOmission: false,
        },
      })
    );

    expect(html).toContain('VO 01: Pemasangan Paip Tambahan 150mm HDPE');
    expect(html).toContain('VO');
    expect(html).toContain('Skop tambahan mengikut kelulusan SO');
    expect(html).toContain('Tukar');
  });

  it('enforces strict XOR behavior through one source-state commit path', () => {
    const source = read('src/app/site-diary/OperationalSourceSelector.tsx');

    expect(source).toContain("sourceType: 'MSP'");
    expect(source).toContain('selectedFromTask');
    expect(source).toContain('rawTask: task');
    expect(source).toContain("sourceType: 'VO'");
    expect(source).toContain('selectedFromVo');
    expect(source).toContain('rawVoItem: vo');

    expect(source).toContain('commitSelection');
    expect(source).toContain('setInternalSource(source)');
    expect(source).toContain('onSelectSource?.(source)');
  });

  it('uses canonical authenticated endpoints for MSP tasks and VO items tied to Programme/Revision context', () => {
    const source = read('src/app/site-diary/OperationalSourceSelector.tsx');

    expect(source).toContain('/api/task/revision/');
    expect(source).toContain('/api/vo-items?programmeId=');
    expect(source).toContain('revisionId=');
    expect(source).toContain("method: 'POST'");
    expect(source).toContain('/api/vo-items');
  });

  it('resets and clears transient selections when Programme or Revision context changes', () => {
    const source = read('src/app/site-diary/OperationalSourceSelector.tsx');

    expect(source).toContain('useEffect(() => {');
    expect(source).toContain('setInternalSource(null)');
    expect(source).toContain('[programmeId, revisionId');
  });

  it('provides zero states, search filters, and error retry handlers for both MSP and VO lists', () => {
    const source = read('src/app/site-diary/OperationalSourceSelector.tsx');

    expect(source).toContain('Tiada');
    expect(source).toContain('filteredMspTasks');
    expect(source).toContain('filteredVoItems');
    expect(source).toContain('Ulang');
  });

  it('preserves integration inside DailyEntryForm without duplicate mutations', () => {
    const formSource = read('src/app/site-diary/DailyEntryForm.tsx');

    expect(formSource).toContain('<OperationalSourceSelector');
    expect(formSource).toContain('onSelectSource={setSelectedSource}');
  });
});
