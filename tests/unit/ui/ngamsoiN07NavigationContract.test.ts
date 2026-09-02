import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const workspaceSource = source('src/app/site-diary/SiteDiaryWorkspace.tsx');
const layoutSource = source('src/app/layout.tsx');
const navigationCss = source('src/app/ngamsoi-n07-navigation.css');

describe('N07 NGAMSOI homecoming/navigation contract', () => {
  it('keeps one canonical four-tab workspace vocabulary across desktop and mobile', () => {
    expect(workspaceSource).toContain("type WorkspaceTab = 'NEW' | 'OPEN' | 'RECORDS' | 'APPROVALS'");
    for (const label of ['Baharu', 'Aktiviti', 'Rekod', 'Semak']) {
      expect(workspaceSource).toContain(`label: '${label}'`);
    }
    expect(workspaceSource.match(/aria-label=\"Navigasi Buku Harian Tapak\"/g)?.length).toBe(2);
    expect(workspaceSource).toContain('ng-workspace-nav--desktop');
    expect(workspaceSource).toContain('ng-workspace-nav--mobile');
  });

  it('centralises tab homecoming and clears nested review context before a workspace switch', () => {
    expect(workspaceSource).toMatch(/const navigateToTab = useCallback\([\s\S]*setReviewContext\(null\);[\s\S]*setTab\(nextTab\);/);
    expect(workspaceSource).toContain('onClick={() => navigateToTab(item.id)}');
    expect(workspaceSource).toContain("const effectiveTab: WorkspaceTab = isReviewingApproval ? 'APPROVALS' : tab;");
  });

  it('keeps global navigation mounted while an Approval review is open', () => {
    expect(workspaceSource).not.toMatch(/if \(reviewContext\?\.programmeId === programmeId\) \{[\s\S]*return \(/);
    expect(workspaceSource).toContain('data-workspace-detail="approval-review"');
    expect(workspaceSource).toContain('<ApprovalReview');
    expect(workspaceSource).toContain('data-workspace-review={isReviewingApproval ? \'true\' : \'false\'}');
  });

  it('binds both navigation surfaces to the same explicit selected state and content panel', () => {
    expect(workspaceSource.match(/data-selected=\{isSelected \? 'true' : 'false'\}/g)?.length).toBe(2);
    expect(workspaceSource.match(/aria-controls=\"site-diary-workspace-panel\"/g)?.length).toBe(2);
    expect(workspaceSource).toContain('id="site-diary-workspace-panel"');
    expect(workspaceSource).toContain('role="tabpanel"');
  });

  it('loads N07 navigation authority after all accepted N05R.5 visual layers', () => {
    const n05r5Desktop = layoutSource.indexOf('ngamsoi-n05r5-desktop-acceptance.css');
    const n07 = layoutSource.indexOf('ngamsoi-n07-navigation.css');
    expect(n05r5Desktop).toBeGreaterThanOrEqual(0);
    expect(n07).toBeGreaterThan(n05r5Desktop);
  });

  it('limits the N07 visual authority to workspace navigation/homecoming surfaces', () => {
    expect(navigationCss).toContain('.ng-workspace-nav');
    expect(navigationCss).toContain('.ng-workspace-content');
    expect(navigationCss).not.toMatch(/ngamsoi-mark|ng-completion|ng-workforce|mobile-entry-selected-source/);
    expect(navigationCss).not.toMatch(/form\[aria-label=/);
  });
});
