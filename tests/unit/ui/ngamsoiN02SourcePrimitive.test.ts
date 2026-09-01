import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('NGAMSOI N02 mobile shell + selected source primitive', () => {
  it('preserves existing source-selection authority and XOR semantics', () => {
    const selector = read('src/app/site-diary/OperationalSourceSelector.tsx');

    expect(selector).toContain("export type OperationalSourceType = 'MSP' | 'VO'");
    expect(selector).toContain('currentSelection');
    expect(selector).toContain('selectedFromTask');
    expect(selector).toContain('selectedFromVo');
    expect(selector).toContain('commitSelection');
    expect(selector).toContain('mobile-entry-selected-source');
    expect(selector).toContain('mobile-entry-source-switcher');
  });

  it('turns selected source into the signature RECORD LOADED state without card/pill geometry', () => {
    const css = read('src/app/ngamsoi.css');

    expect(css).toContain('content: "RECORD LOADED"');
    expect(css).toContain('.mobile-entry-selected-source');
    expect(css).toContain('border-radius: 0 !important');
    expect(css).toContain('inset 3px 0 0 var(--ng-current)');
    expect(css).toContain('.mobile-entry-selected-source::after');
    expect(css).toContain('.mobile-entry-source-control[data-active="true"]');
    expect(css).toContain('inset 0 -2px 0 var(--ng-current)');
  });

  it('keeps project authority current-first and historical revision chrome quiet', () => {
    const baseCss = read('src/app/ngamsoi.css');
    const headerCss = read('src/app/ngamsoi-n05r2-header.css');
    const shell = read('src/app/site-diary/DailyEntryShell.tsx');

    expect(shell).toContain('datum-project-strip');
    expect(shell).toContain('ng-project-short-name');
    expect(shell).toContain('ng-project-revision');
    expect(shell).toContain('programmeShortName');
    expect(shell).toContain('revisionNumber');
    expect(shell).not.toContain('datum-project-code');
    expect(shell).not.toContain('datum-revision-stamp');
    expect(shell).not.toContain('Semakan Sah');
    expect(shell).not.toContain('Semakan Semasa');

    expect(baseCss).toContain('.datum-project-strip');
    expect(headerCss).toContain('.ng-project-context');
    expect(headerCss).toContain('.ng-project-short-name');
    expect(headerCss).toContain('.ng-project-revision');
    expect(headerCss).toContain('color: var(--ng-established)');
  });
});
