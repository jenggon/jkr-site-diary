// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/app/site-diary/DiaryManagementList', () => ({ default: () => React.createElement('div', null, 'PRODUCTION_RECORDS') }));
vi.mock('@/app/site-diary/DailyEntryForm', () => ({
  default: (props: { initialTab: string; hideModeNavigation: boolean }) => React.createElement(
    'div', null, `DAILY_${props.initialTab}_${String(props.hideModeNavigation)}`
  ),
}));

import SiteDiaryWorkspace from '@/app/site-diary/SiteDiaryWorkspace';

describe('Site Diary runtime workspace navigation', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
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
    const tabs = [...container.querySelectorAll('[role="tab"]')];
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Laporan Baharu', 'Aktiviti Terbuka', 'Rekod / Sejarah']);
    expect(tabs[2]?.getAttribute('aria-selected')).toBe('true');

    await act(async () => (tabs[0] as HTMLButtonElement).click());
    expect(container.textContent).toContain('DAILY_NEW_ACTIVITY_true');
    await act(async () => (tabs[1] as HTMLButtonElement).click());
    expect(container.textContent).toContain('DAILY_OPEN_ACTIVITIES_true');
  });
});
