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

describe('F2.1-A DailyEntryShell & Context Resolution', () => {
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

    // Verify child is rendered inside shell
    expect(html).toContain('Child Component');
  });

  it('preserves child rendering for F1GoldenPathBridge and LegacySiteDiaryPage in site-diary/page.tsx', () => {
    const pageContent = read('src/app/site-diary/page.tsx');

    expect(pageContent).toContain("import DailyEntryShell from './DailyEntryShell'");
    expect(pageContent).toContain("import F1GoldenPathBridge from './F1GoldenPathBridge'");
    expect(pageContent).toContain("import LegacySiteDiaryPage from './LegacySiteDiaryPage'");
    expect(pageContent).toContain('<DailyEntryShell>');
    expect(pageContent).toContain('<F1GoldenPathBridge>');
    expect(pageContent).toContain('<LegacySiteDiaryPage />');
  });

  it('contains dynamic context resolution targeting canonical project-summary and programme APIs', () => {
    const shellSource = read('src/app/site-diary/DailyEntryShell.tsx');

    // Verify canonical endpoint calls
    expect(shellSource).toContain('/api/project-summary');
    expect(shellSource).toContain('/api/programme/');

    // Verify revision and programme context state tracking
    expect(shellSource).toContain('revisionId');
    expect(shellSource).toContain('programmeName');
    expect(shellSource).toContain('Semakan Sah');
    expect(shellSource).toContain('useDailyEntryContext');

    // Verify error and loading handling
    expect(shellSource).toContain('Cuba Semula');
    expect(shellSource).toContain('Memuatkan maklumat program...');
  });

  it('provides accessible error state with retry mechanism in the component structure', () => {
    const shellSource = read('src/app/site-diary/DailyEntryShell.tsx');

    expect(shellSource).toContain('error');
    expect(shellSource).toContain('refreshContext');
    expect(shellSource).toContain('border-red-800');
  });
});
