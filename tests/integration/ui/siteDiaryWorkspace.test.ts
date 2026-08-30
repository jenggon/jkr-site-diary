// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const workspaceContext = vi.hoisted(() => ({ programmeId: 'programme-A' }));

vi.mock('@/app/site-diary/DailyEntryShell', () => ({
  useDailyEntryContext: () => ({ programmeId: workspaceContext.programmeId }),
}));
vi.mock('@/app/site-diary/DiaryManagementList', () => ({
  default: () => {
    const [selected, setSelected] = React.useState(false);
    return React.createElement(
      'div',
      null,
      `PRODUCTION_RECORDS_${workspaceContext.programmeId}`,
      React.createElement(
        'button',
        { onClick: () => setSelected(true) },
        'SELECT_HISTORICAL_DIARY',
      ),
      selected && React.createElement('div', null, 'HISTORICAL_A_PRINT_EDIT_TARGET'),
    );
  },
}));
vi.mock('@/app/site-diary/DailyEntryForm', () => ({
  default: (props: { initialTab: string; hideModeNavigation: boolean }) => {
    const [selected, setSelected] = React.useState(false);
    return React.createElement(
      'div',
      null,
      `DAILY_${props.initialTab}_${String(props.hideModeNavigation)}_${workspaceContext.programmeId}`,
      React.createElement(
        'button',
        { onClick: () => setSelected(true) },
        'SELECT_ACTIVITY_OR_EDIT',
      ),
      selected && React.createElement('div', null, 'ACTIVITY_A_EDIT_TARGET'),
    );
  },
}));
vi.mock('@/app/site-diary/ApprovalQueue', () => ({
  default: (props: { onSelectReview: (siteDiaryId: string, approvalId: string) => void }) =>
    React.createElement(
      'div',
      null,
      `APPROVAL_QUEUE_${workspaceContext.programmeId}`,
      React.createElement(
        'button',
        { onClick: () => props.onSelectReview('diary-A', 'approval-A') },
        'OPEN_REVIEW',
      ),
    ),
}));
vi.mock('@/app/site-diary/ApprovalReview', () => ({
  default: (props: { siteDiaryId: string; approvalId: string }) =>
    React.createElement('div', null, `DECISION_CONTROLS_${props.approvalId}_${props.siteDiaryId}`),
}));

import SiteDiaryWorkspace from '@/app/site-diary/SiteDiaryWorkspace';

describe('Site Diary runtime workspace navigation', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    workspaceContext.programmeId = 'programme-A';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('defaults current-first to records and exposes all coherent product destinations', async () => {
    await act(async () => root.render(React.createElement(SiteDiaryWorkspace)));
    expect(container.textContent).toContain('PRODUCTION_RECORDS');
    const tabs = [...container.querySelectorAll('[role="tab"]')].slice(0, 4);
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Laporan Baharu',
      'Aktiviti Terbuka',
      'Rekod / Sejarah',
      'Kelulusan',
    ]);
    expect(tabs[2]?.getAttribute('aria-selected')).toBe('true');

    await act(async () => (tabs[0] as HTMLButtonElement).click());
    expect(container.textContent).toContain('DAILY_NEW_ACTIVITY_true');
    await act(async () => (tabs[1] as HTMLButtonElement).click());
    expect(container.textContent).toContain('DAILY_OPEN_ACTIVITIES_true');
  });

  it('preserves the tab category but remounts Programme-owned record and entry state', async () => {
    await act(async () => root.render(React.createElement(SiteDiaryWorkspace)));
    const selectHistory = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'SELECT_HISTORICAL_DIARY',
    ) as HTMLButtonElement;
    await act(async () => selectHistory.click());
    expect(container.textContent).toContain('HISTORICAL_A_PRINT_EDIT_TARGET');

    workspaceContext.programmeId = 'programme-B';
    await act(async () => root.render(React.createElement(SiteDiaryWorkspace)));

    expect(container.textContent).toContain('PRODUCTION_RECORDS_programme-B');
    expect(container.textContent).not.toContain('HISTORICAL_A_PRINT_EDIT_TARGET');
    const tabs = [...container.querySelectorAll('[role="tab"]')];
    expect(tabs[2]?.getAttribute('aria-selected')).toBe('true');

    await act(async () => (tabs[1] as HTMLButtonElement).click());
    const selectActivity = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'SELECT_ACTIVITY_OR_EDIT',
    ) as HTMLButtonElement;
    await act(async () => selectActivity.click());
    expect(container.textContent).toContain('ACTIVITY_A_EDIT_TARGET');

    workspaceContext.programmeId = 'programme-C';
    await act(async () => root.render(React.createElement(SiteDiaryWorkspace)));
    expect(container.textContent).toContain('DAILY_OPEN_ACTIVITIES_true_programme-C');
    expect(container.textContent).not.toContain('ACTIVITY_A_EDIT_TARGET');
    expect([...container.querySelectorAll('[role="tab"]')][1]?.getAttribute('aria-selected')).toBe(
      'true',
    );
  });

  it('closes an exact Approval review immediately when Programme ownership changes', async () => {
    await act(async () => root.render(React.createElement(SiteDiaryWorkspace)));
    const tabs = [...container.querySelectorAll('[role="tab"]')];
    await act(async () => (tabs[3] as HTMLButtonElement).click());
    expect(container.textContent).toContain('APPROVAL_QUEUE_programme-A');

    const openReview = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'OPEN_REVIEW',
    ) as HTMLButtonElement;
    await act(async () => openReview.click());
    expect(container.textContent).toContain('DECISION_CONTROLS_approval-A_diary-A');

    workspaceContext.programmeId = 'programme-B';
    await act(async () => root.render(React.createElement(SiteDiaryWorkspace)));

    expect(container.textContent).not.toContain('DECISION_CONTROLS');
    expect(container.textContent).toContain('APPROVAL_QUEUE_programme-B');
    expect([...container.querySelectorAll('[role="tab"]')][3]?.getAttribute('aria-selected')).toBe(
      'true',
    );
  });

  it('keeps all contextual destinations reachable and active state identifiable on mobile and desktop', async () => {
    // Renders the wrapper with responsive navigation strategy
    await act(async () => root.render(React.createElement(SiteDiaryWorkspace)));
    const navigation = container.querySelector('nav[aria-label="Navigasi Buku Harian Tapak"]');
    expect(navigation?.className).toContain('hidden md:flex flex-col');

    // Bottom nav for mobile
    const bottomNav = container.querySelectorAll('nav')[1];
    expect(bottomNav?.className).toContain('md:hidden absolute bottom-0');

    const allTabs = [...container.querySelectorAll('[role="tab"]')] as HTMLButtonElement[];
    expect(allTabs).toHaveLength(8);

    // Test clicking the desktop tabs (first 4)
    const desktopTabs = allTabs.slice(0, 4);
    for (const [index, tab] of desktopTabs.entries()) {
      await act(async () => tab.click());
      const currentTabs = [...container.querySelectorAll('[role="tab"]')];
      expect(
        currentTabs.filter((item) => item.getAttribute('aria-selected') === 'true'),
      ).toHaveLength(2); // One desktop, one mobile
      expect(currentTabs[index]?.className).toContain('text-blue-400');
    }
    expect(container.textContent).not.toContain('Cetak / PDF');
  });
});
