import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import DailyEntryShell from '@/app/site-diary/DailyEntryShell';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const authState = vi.hoisted(() => ({
  user: null as { email?: string } | null,
  signOut: vi.fn(),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('@/components/brand/NgamsoiBrand', () => ({
  default: () => React.createElement('div', { 'data-testid': 'brand' }, 'NGAMSOI'),
}));

vi.mock('@/app/site-diary/ProjectWeatherPulse', () => ({
  default: () => React.createElement('span', { 'data-testid': 'weather-pulse' }, 'CUACA'),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('F2.1-A DailyEntryShell & Programme Context Authority', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.restoreAllMocks();
    authState.user = null;
    authState.signOut.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  it('renders the mobile-first shell structure and NGAMSOI identity without artificial phone frames', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    await act(async () => root.render(React.createElement(DailyEntryShell)));
    expect(container.textContent).toContain('NGAMSOI');
    const shell = container.querySelector('.ngamsoi-shell');
    expect(shell).not.toBeNull();
    expect(shell?.className).toContain('h-[100dvh]');
    expect(shell?.className).not.toContain('max-w-[390px]');
    act(() => root.unmount());
  });

  it('locks the NGAMSOI identity to one cross-free marker + locked-datum geometry everywhere', () => {
    const brandSource = read('src/components/brand/NgamsoiBrand.tsx');
    const mark = read('public/ngamsoi-mark.svg');
    const layout = read('src/app/layout.tsx');
    expect(brandSource).toContain('src="/ngamsoi-mark.svg"');
    expect(brandSource).not.toContain('datum-mark');
    expect(mark).toContain('M21 13H43L32 28Z');
    expect(mark).toContain('M11 43H27L32 38L37 43H53');
    expect(mark).not.toMatch(/cross|plus/i);
    expect(layout).toContain('NGAMSOI | JKR Site Diary');
  });

  it('locks header hierarchy to project identity plus the five F4.5 operational blocks', () => {
    const shellSource = read('src/app/site-diary/DailyEntryShell.tsx');
    expect(shellSource).toContain('PROGRAM KERJA');
    expect(shellSource).toContain('TINGGAL');
    expect(shellSource).toContain('HARI KE');
    expect(shellSource).toContain('SEMASA');
    expect(shellSource).toContain('<ProjectWeatherPulse />');
    expect(shellSource).not.toContain('Semakan Sah');
    expect(shellSource).not.toContain('Semakan Semasa');
  });

  it('composes CATAT and AKTIVITI through their bounded F4.5 workspace surfaces', () => {
    const pageContent = read('src/app/site-diary/page.tsx');
    const workspaceContent = read('src/app/site-diary/SiteDiaryWorkspace.tsx');
    expect(pageContent).toContain("import DailyEntryShell from './DailyEntryShell'");
    expect(pageContent).toContain("import SiteDiaryWorkspace from './SiteDiaryWorkspace'");
    expect(pageContent).toContain('<DailyEntryShell>');
    expect(pageContent).toContain('<SiteDiaryWorkspace />');
    expect(workspaceContent).toContain("import CatatEntryForm from './CatatEntryForm'");
    expect(workspaceContent).toContain("import AktivitiEntryForm from './AktivitiEntryForm'");
    expect(workspaceContent).toContain("if (tab === 'NEW') return <CatatEntryForm onShowRecords={showRecords} />;");
    expect(workspaceContent).toContain("if (tab === 'OPEN') return <AktivitiEntryForm onShowRecords={showRecords} onAddActivity={startNewObservation} />;");
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
    expect(shellSource).toContain('programmeShortName');
    expect(shellSource).not.toContain('DEFAULT_PROGRAMME_ID');
  });

  it('handles 0, 1, and multiple active programme scenarios according to HQ authority', () => {
    const shellSource = read('src/app/site-diary/DailyEntryShell.tsx');
    expect(shellSource).toContain('options.length === 0');
    expect(shellSource).toContain('options.length === 1');
    expect(shellSource).toContain('availableProgrammes.length > 1');
    expect(shellSource).toContain('Pilih Projek');
    expect(shellSource).toContain('selectProgramme');
  });

  it('REGRESSION: F2.1-A DailyEntryShell does NOT import or rely on DEFAULT_PROGRAMME_ID', () => {
    const shellSource = read('src/app/site-diary/DailyEntryShell.tsx');
    expect(shellSource).not.toContain('DEFAULT_PROGRAMME_ID');
  });
});
