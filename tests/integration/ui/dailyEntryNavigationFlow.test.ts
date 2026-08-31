import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import DailyEntryForm from '@/app/site-diary/DailyEntryForm';
import OperationalSourceSelector, { SelectedOperationalSource } from '@/app/site-diary/OperationalSourceSelector';
import DailyEntryFeedback from '@/app/site-diary/DailyEntryFeedback';

// Mock AuthContext
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'usr-123', email: 'pengelia@jkr.gov.my' },
    signOut: vi.fn(),
  }),
}));

// Mock DailyEntryShell Context
vi.mock('@/app/site-diary/DailyEntryShell', () => ({
  useDailyEntryContext: () => ({
    programmeId: 'prog-uuid-1111-2222-3333',
    revisionId: 'rev-uuid-aaaa-bbbb-cccc',
    programmeName: 'Cadangan Membina Hospital Pakar',
    programmeCode: 'JKR/HQ/2026/01',
    loading: false,
    error: null,
    availableProgrammes: [
      { id: 'prog-uuid-1111-2222-3333', code: 'JKR/HQ/2026/01', name: 'Cadangan Membina Hospital Pakar' },
    ],
    setProgrammeId: vi.fn(),
    refreshContext: vi.fn(),
  }),
}));

describe('F2.1-F Daily Entry Navigation & Flow Behavioural Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Operational Source selector renders cleanly without redundant pickers
  it('1. MSP/VO source selector renders distinct tabs for MSP and VO without redundant pickers', () => {
    const mockSource: SelectedOperationalSource = {
      sourceType: 'MSP',
      id: 'task-101',
      title: 'Kerja Asas Bangunan (Footing)',
      code: 'WBS 1.1',
    };

    const html = renderToString(
      React.createElement(OperationalSourceSelector, {
        selectedSource: mockSource,
      })
    );

    // Should render selected source summary
    expect(html).toContain('MSP');
    expect(html).toContain('Kerja Asas Bangunan (Footing)');
    expect(html).toContain('WBS 1.1');
    expect(html).toContain('Tukar');
  });

  // 2. Selected source summary remains visible before submission
  it('2. Selected source summary remains clearly visible before form submission', () => {
    const selectedVoSource: SelectedOperationalSource = {
      sourceType: 'VO',
      id: 'vo-202',
      title: 'VO 01 / Item 3: Tambahan Tangki Air',
      code: 'VO-01-03',
      isOmission: false,
    };

    const html = renderToString(
      React.createElement(OperationalSourceSelector, {
        selectedSource: selectedVoSource,
      })
    );

    expect(html).toContain('VO-01-03');
    expect(html).toContain('VO 01 / Item 3: Tambahan Tangki Air');
    expect(html).toContain('VO');
  });

  // 3. Save success exposes only authorised F2.1 next actions
  it('3. Save success surfaces only authorised F2.1 next actions (Print Preview & Laporan Baharu)', () => {
    const html = renderToString(
      React.createElement(DailyEntryFeedback, {
        error: null,
        success: 'Buku Harian Tapak berjaya disimpan.',
        savedSiteDiaryId: 'sd-saved-8888',
        isEditMode: false,
        onResetForNewEntry: () => {},
      })
    );

    expect(html).toContain('Simpanan Berjaya');
    expect(html).toContain('Buku Harian Tapak berjaya disimpan.');
    expect(html).toContain('/site-diary/print?id=sd-saved-8888');
    expect(html).toContain('Baharu');

    // Asserts no unauthorised scope links (F2.2 Open Activities, F2.3 History, F2.4 Approval)
    expect(html).not.toContain('/open-activities');
    expect(html).not.toContain('/approval');
    expect(html).not.toContain('/history');
  });

  // 4. Edit success exposes coherent next action without Baharu confusion
  it('4. Edit success exposes print link without showing misleading "Laporan Baharu" button', () => {
    const html = renderToString(
      React.createElement(DailyEntryFeedback, {
        error: null,
        success: 'Buku Harian Tapak berjaya dikemaskini.',
        savedSiteDiaryId: 'sd-edit-9999',
        isEditMode: true,
      })
    );

    expect(html).toContain('Kemaskini Berjaya');
    expect(html).toContain('Buku Harian Tapak berjaya dikemaskini.');
    expect(html).toContain('/site-diary/print?id=sd-edit-9999');
    expect(html).not.toContain('Baharu');
  });

  // 5. Print link points to existing /site-diary/print route with saved ID
  it('5. Print link carries encoded saved ID parameter to existing print route', () => {
    const html = renderToString(
      React.createElement(DailyEntryFeedback, {
        error: null,
        success: 'Buku Harian Tapak berjaya disimpan.',
        savedSiteDiaryId: 'sd-uuid-777',
      })
    );

    expect(html).toContain('href="/site-diary/print?id=sd-uuid-777"');
    expect(html).toContain('Lihat Format JKR (Print)');
  });

  // 6. Page works cleanly without artificial phone frame
  it('6. Form layout uses clean fluid responsive structure without fixed phone frames', () => {
    const html = renderToString(React.createElement(DailyEntryForm, { initialTab: 'NEW_ACTIVITY' }));

    expect(html).not.toContain('mockup-phone');
    expect(html).not.toContain('iphone-frame');
    expect(html).toContain('Harian');
  });

  // 7. Navigation links contain no hardcoded Programme UUIDs
  it('7. Print preview links do not hardcode default Programme UUIDs', () => {
    const html = renderToString(
      React.createElement(DailyEntryFeedback, {
        error: null,
        success: 'Buku Harian Tapak berjaya disimpan.',
        savedSiteDiaryId: 'sd-saved-8888',
      })
    );

    // Must not contain hardcoded default UUID
    expect(html).not.toContain('0651e125-3ef4-47c4-a3fa-8aec49bdf979');
  });
});
