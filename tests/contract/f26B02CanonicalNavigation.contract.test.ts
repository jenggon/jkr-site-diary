import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirectMock = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

import Home from '@/app/page';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const rootSource = source('src/app/page.tsx');
const loginSource = source('src/app/login/page.tsx');
const siteDiaryPageSource = source('src/app/site-diary/page.tsx');
const shellSource = source('src/app/site-diary/DailyEntryShell.tsx');
const workspaceSource = source('src/app/site-diary/SiteDiaryWorkspace.tsx');
const detailSource = source('src/app/site-diary/DiaryDetail.tsx');
const feedbackSource = source('src/app/site-diary/DailyEntryFeedback.tsx');

describe('F2.6-B02 canonical landing and navigation contract', () => {
  beforeEach(() => {
    redirectMock.mockClear();
  });

  it('redirects the root route to the canonical Site Diary workspace at runtime', () => {
    Home();

    expect(redirectMock).toHaveBeenCalledOnce();
    expect(redirectMock).toHaveBeenCalledWith('/site-diary');
  });

  it('removes the legacy Activity dashboard from the root route', () => {
    expect(rootSource).not.toMatch(/OpenActivitiesDashboard|Open Activities|Legacy Site Diary/);
    expect(rootSource).not.toMatch(/showCreateModal|handleStartActivity|handleCompleteActivity/);
  });

  it('does not fetch open Activities from the root route', () => {
    expect(rootSource).not.toContain('/api/activities/open');
    expect(rootSource).not.toMatch(/\bfetch\s*\(/);
  });

  it('does not create or mutate Activity state from the root route', () => {
    expect(rootSource).not.toContain('/api/activity');
    expect(rootSource).not.toMatch(/method\s*:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/);
    expect(rootSource).not.toMatch(/\/(?:start|complete|suspend|cancel)['"`]/);
  });

  it('contains no hardcoded Programme identity in the canonical root', () => {
    expect(rootSource).not.toContain('prog-1');
    expect(rootSource).not.toMatch(/programmeId\s*=/);
  });

  it('keeps /site-diary backed by the canonical Programme-aware workspace', () => {
    expect(siteDiaryPageSource).toContain("import DailyEntryShell from './DailyEntryShell'");
    expect(siteDiaryPageSource).toContain("import SiteDiaryWorkspace from './SiteDiaryWorkspace'");
    expect(siteDiaryPageSource).toMatch(/<DailyEntryShell>[\s\S]*<SiteDiaryWorkspace\s*\/>[\s\S]*<\/DailyEntryShell>/);
    expect(shellSource).toContain("fetchApp('/api/programme?status=Active')");
    expect(shellSource).toContain('project-summary?programmeId=');
  });

  it('keeps Approval contextual inside SiteDiaryWorkspace', () => {
    expect(workspaceSource).toContain("type WorkspaceTab = 'NEW' | 'OPEN' | 'RECORDS' | 'APPROVALS'");
    expect(workspaceSource).toContain('<ApprovalQueue');
    expect(workspaceSource).toContain('<ApprovalReview');
    expect(rootSource).not.toMatch(/ApprovalQueue|ApprovalReview|APPROVALS/);
    expect(shellSource).not.toMatch(/ApprovalQueue|ApprovalReview|APPROVALS/);
  });

  it('removes the context-free Print navigation entry', () => {
    expect(shellSource).not.toMatch(/href\s*=\s*['"]\/site-diary\/print['"]/);
    expect(shellSource).not.toContain('Cetak / PDF');
  });

  it('preserves exact encoded Print handoffs from approved record surfaces', () => {
    expect(detailSource).toContain('/site-diary/print?id=${encodeURIComponent(printableSiteDiaryId)}');
    expect(feedbackSource).toContain('/site-diary/print?id=${encodeURIComponent(savedSiteDiaryId)}');
    expect(detailSource).not.toMatch(/href\s*=\s*['"]\/site-diary\/print['"]/);
    expect(feedbackSource).not.toMatch(/href\s*=\s*['"]\/site-diary\/print['"]/);
  });

  it('keeps the existing login landing strategy through the canonical root redirect', () => {
    expect(loginSource).toContain("router.push('/')");
    expect(rootSource).toContain("redirect('/site-diary')");
  });

  it('introduces no mutation in canonical landing or shell navigation', () => {
    for (const navigationSource of [rootSource, shellSource]) {
      expect(navigationSource).not.toMatch(/method\s*:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/);
    }
  });

  it('does not introduce global navigation or client capability inference', () => {
    expect(rootSource).not.toMatch(/programme_membership|capabilit|role/i);
    expect(shellSource).not.toMatch(/programme_membership|SITE_DIARY_APPROVAL_QUEUE_VIEW/);
    expect(rootSource).not.toMatch(/sidebar|global navigation/i);
  });
});
