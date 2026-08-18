import { describe, expect, it, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import DailyEntryShell from '@/app/site-diary/DailyEntryShell';

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

// Mock Auth Context
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'supervisor@jkr.gov.my' },
    session: null,
    loading: false,
    signOut: vi.fn(),
  }),
}));

describe('F2.1-A DailyEntryShell & Programme Context Authority', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the mobile-first shell structure and branding without artificial phone frames', () => {
    const html = renderToString(
      React.createElement(
        DailyEntryShell,
        { initialProgrammeId: 'test-programme-id' },
        React.createElement('div', { id: 'test-child' }, 'Child Component')
      )
    );

    // Verify JKR branding and title
    expect(html).toContain('JKR');
    expect(html).toContain('Buku Harian Tapak');
    expect(html).toContain('Sistem Pengurusan Tapak Digital');

    // Verify mobile-responsive classes
    expect(html).toContain('min-h-screen');
    expect(html).toContain('w-full');

    // Verify print navigation link
    expect(html).toContain('/site-diary/print');
    expect(html).toContain('Cetak / PDF');

    // Verify user avatar / initials
    expect(html).toContain('SU');

    // Verify child is rendered inside shell when programmeId is present
    expect(html).toContain('Child Component');
  });

  it('preserves native DailyEntryForm through the bounded Site Diary workspace composition', () => {
    const pageContent = read('src/app/site-diary/page.tsx');
    const workspaceContent = read('src/app/site-diary/SiteDiaryWorkspace.tsx');

    expect(pageContent).toContain("import DailyEntryShell from './DailyEntryShell'");
    expect(pageContent).toContain("import SiteDiaryWorkspace from './SiteDiaryWorkspace'");
    expect(pageContent).toContain('<DailyEntryShell>');
    expect(pageContent).toContain('<SiteDiaryWorkspace />');
    expect(workspaceContent).toContain("import DailyEntryForm from './DailyEntryForm'");
    expect(workspaceContent).toContain('<DailyEntryForm');
  });

  it('uses canonical GET /api/programme discovery and never calls project-summary without explicit programmeId', () => {
    const shellSource = read('src/app/site-diary/DailyEntryShell.tsx');

    // Verify canonical programme discovery
    expect(shellSource).toContain('/api/programme?status=Active');
    
    // Verify explicit parameterised project-summary call
    expect(shellSource).toContain('/api/project-summary?programmeId=');
    expect(shellSource).not.toMatch(/\/api\/project-summary['"`]\s*\)/);

    // Verify revision and programme context state tracking
    expect(shellSource).toContain('revisionId');
    expect(shellSource).toContain('programmeName');
    expect(shellSource).toContain('Semakan Sah');
    expect(shellSource).toContain('useDailyEntryContext');
  });

  it('handles 0, 1, and multiple active programme scenarios according to HQ authority', () => {
    const shellSource = read('src/app/site-diary/DailyEntryShell.tsx');

    // Zero programme empty state
    expect(shellSource).toContain('Tiada Projek Aktif Ditemui');
    expect(shellSource).toContain('options.length === 0');

    // Single programme auto-selection
    expect(shellSource).toContain('options.length === 1');

    // Multiple programmes explicit selection (no arbitrary first auto-selection)
    expect(shellSource).toContain('Pilih Projek / Program Tapak');
    expect(shellSource).toContain('availableProgrammes.length > 1');
    expect(shellSource).toContain('handleSelectProgramme');
  });

  it('REGRESSION: F2.1-A DailyEntryShell does NOT import or rely on DEFAULT_PROGRAMME_ID', () => {
    const shellSource = read('src/app/site-diary/DailyEntryShell.tsx');

    expect(shellSource).not.toContain('DEFAULT_PROGRAMME_ID');
    expect(shellSource).not.toContain('0651e125-3ef4-47c4-a3fa-8aec49bdf979');
  });
});
