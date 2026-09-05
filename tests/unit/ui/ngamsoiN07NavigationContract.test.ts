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
    for (const label of ['Catat', 'Aktiviti', 'Rekod', 'Semak']) {
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
    expect(workspaceSource.match(/aria-selected=\{isSelected\}/g)?.length).toBe(2);
    expect(workspaceSource.match(/aria-controls=\"site-diary-workspace-panel\"/g)?.length).toBe(2);
    expect(workspaceSource).toContain('id="site-diary-workspace-panel"');
    expect(workspaceSource).toContain('role="tabpanel"');
  });

  it('keeps desktop and mobile selected-state indicators orientation-safe', () => {
    expect(navigationCss).toMatch(/\.ng-workspace-nav--desktop \.ng-workspace-nav__item::before\s*\{\s*content: none;/);
    expect(navigationCss).toMatch(/\.ng-workspace-nav--mobile \.ng-workspace-nav__item\[data-selected="true"\]\s*\{[\s\S]*?box-shadow: none !important;/);
    expect(navigationCss).toMatch(/\.ng-workspace-nav--mobile \.ng-workspace-nav__item\[data-selected="true"\]::before\s*\{[\s\S]*?background: var\(--ng-current\);/);
  });

  it('keeps adaptive disclosure accessible without changing workspace state', () => {
    expect(workspaceSource).toContain('aria-expanded={navigationExpanded}');
    expect(workspaceSource).toContain('aria-controls="site-diary-desktop-navigation-items"');
    expect(workspaceSource).toContain("navigationExpanded ? 'Kecilkan navigasi' : 'Kembangkan navigasi'");
    expect(workspaceSource).toContain('if (compactViewport)');
    expect(workspaceSource).toContain('setCompactOverlayOpen((current) => !current)');
    expect(workspaceSource).toContain('data-tooltip={navigationExpanded ? undefined : item.meaning}');
  });

  it('loads N07 after accepted historical layers but before the single F4.5 post-physical entrypoint', () => {
    const n05r5Desktop = layoutSource.indexOf('ngamsoi-n05r5-desktop-acceptance.css');
    const n07 = layoutSource.indexOf('ngamsoi-n07-navigation.css');
    const f45 = layoutSource.indexOf('ngamsoi-f45-post-physical.css');
    expect(n05r5Desktop).toBeGreaterThanOrEqual(0);
    expect(n07).toBeGreaterThan(n05r5Desktop);
    expect(f45).toBeGreaterThan(n07);
    expect(layoutSource).not.toContain('import "./ngamsoi-f45-harmony.css"');
    expect(layoutSource).not.toContain('import "./ngamsoi-f45-seal.css"');
    expect(layoutSource).not.toContain('import "./ngamsoi-f45-authority.css"');
  });

  it('keeps N07 as the adaptive navigation/homecoming behavior contract only', () => {
    expect(navigationCss).toContain('.ng-workspace-nav');
    expect(navigationCss).toContain('.ng-workspace-nav__item[data-selected="true"]');
    expect(navigationCss).toContain('.ng-workspace-nav--desktop.is-overlay-open');
    expect(navigationCss).toContain('@media (min-width: 768px) and (max-width: 1199px)');
    expect(navigationCss).toContain('.ng-workspace-content');
    expect(navigationCss).not.toMatch(/ngamsoi-mark|ng-completion|ng-workforce|mobile-entry-selected-source/);
    expect(navigationCss).not.toMatch(/form\[aria-label=/);
  });
});