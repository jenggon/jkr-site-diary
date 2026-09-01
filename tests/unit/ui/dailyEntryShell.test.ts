import { describe, expect, it, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import DailyEntryShell from '@/app/site-diary/DailyEntryShell';

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

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

  it('renders the mobile-first shell structure and NGAMSOI identity without artificial phone frames', () => {
    const html = renderToString(
      React.createElement(
        DailyEntryShell,
        { initialProgrammeId: 'test-programme-id' },
        React.createElement('div', { id: 'test-child' }, 'Child Component')
      )
    );

    expect(html).toContain('NGAMSOI');
    expect(html).toContain('Kena boh!');
    expect(html).toContain('Ngamsoi.');
    expect(html).toContain('ngamsoi-shell');
    expect(html).toContain('ngamsoi-brand-lockup');
    expect(html).toContain('ngamsoi-mark-svg');
    expect(html).toContain('datum-shell');
    expect(html).not.toContain('Digital Fieldbook · Project Ground Truth');
    expect(html).not.toContain('>DATUM<');
    expect(html).not.toContain('Sistem Pengurusan Tapak Digital');

    expect(html).toContain('h-[100dvh]');
    expect(html).toContain('w-full');

    expect(html).not.toContain('href="/site-diary/print"');
    expect(html).not.toContain('Cetak / PDF');

    expect(html).toContain('SU');
    expect(html).toContain('ng-profile-trigger');
    expect(html).toContain('ng-profile-panel');
    expect(html).toContain('Child Component');
  });

  it('locks the NGAMSOI identity to one cross-free marker + locked-datum geometry everywhere', () => {
    const brandSource = read('src/components/brand/NgamsoiBrand.tsx');
    const identityCss = read('src/app/ngamsoi.css');
    const headerCss = read('src/app/ngamsoi-n05r2-header.css');
    const layoutSource = read('src/app/layout.tsx');
    const appIcon = read('public/ngamsoi-mark.svg');

    expect(brandSource).toContain('viewBox="0 0 64 64"');
    expect(brandSource).toContain('M21 13H43L32 28Z');
    expect(brandSource).toContain('M11 43H27L32 38L37 43H53');
    expect(brandSource).toContain('ngamsoi-mark-baseline');
    expect(brandSource).not.toContain('ngamsoi-mark-stem');
    expect(brandSource).not.toContain('M32 28V51');

    expect(identityCss).toContain('--ng-graphite-950');
    expect(identityCss).toContain('--ng-current: #ff7a1a');
    expect(identityCss).toContain('--ng-established: #55b879');
    expect(identityCss).toContain('--ng-font-work');
    expect(identityCss).toContain('--ng-font-reference');
    expect(identityCss).toContain('--ng-font-brand');
    expect(headerCss).toContain('.ngamsoi-brand-lockup .ngamsoi-mark-datum');

    expect(layoutSource).toContain('NGAMSOI | JKR Site Diary');
    expect(layoutSource).toContain('/ngamsoi-mark.svg');
    expect(layoutSource).toContain('ngamsoi-n05r2-header.css');
    expect(appIcon).toContain('viewBox="0 0 64 64"');
    expect(appIcon).toContain('M21 13H43L32 28Z');
    expect(appIcon).toContain('M11 43H27L32 38L37 43H53');
    expect(appIcon).not.toContain('M32 28V51');
    expect(appIcon.match(/#ff7a1a/g)?.length).toBe(1);
    expect(appIcon).toContain('aria-label="NGAMSOI mark"');
  });

  it('locks header hierarchy to nickname, official project name, current revision, and avatar only', () => {
    const shellSource = read('src/app/site-diary/DailyEntryShell.tsx');

    expect(shellSource).toContain('programmeShortName');
    expect(shellSource).toContain('ng-project-short-name');
    expect(shellSource).toContain('ng-project-title');
    expect(shellSource).toContain('ng-project-revision');
    expect(shellSource).toContain('revisionNumber');
    expect(shellSource).toContain('padStart(2,');
    expect(shellSource).toContain('ng-profile-trigger');
    expect(shellSource).not.toContain('Semakan Sah');
    expect(shellSource).not.toContain('Semakan Semasa');
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

  it('uses canonical programme and revision discovery without a default programme shortcut', () => {
    const shellSource = read('src/app/site-diary/DailyEntryShell.tsx');

    expect(shellSource).toContain('/api/programme?status=Active');
    expect(shellSource).toContain('/api/project-summary?programmeId=');
    expect(shellSource).toContain('/api/programme-revision?programmeId=');
    expect(shellSource).not.toMatch(/\/api\/project-summary['"`]\s*\)/);

    expect(shellSource).toContain('revisionId');
    expect(shellSource).toContain('revisionNumber');
    expect(shellSource).toContain('programmeName');
    expect(shellSource).toContain('useDailyEntryContext');
  });

  it('handles 0, 1, and multiple active programme scenarios according to HQ authority', () => {
    const shellSource = read('src/app/site-diary/DailyEntryShell.tsx');

    expect(shellSource).toContain('Tiada Projek Aktif Ditemui');
    expect(shellSource).toContain('options.length === 0');
    expect(shellSource).toContain('options.length === 1');
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
