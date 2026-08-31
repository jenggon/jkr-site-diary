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
    expect(selector).toContain('handleSelectMspTask');
    expect(selector).toContain('handleSelectVoItem');
    expect(selector).toContain('handleClearSelection');
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

  it('makes the project/revision shell authority ruled and established-state explicit', () => {
    const css = read('src/app/ngamsoi.css');
    const shell = read('src/app/site-diary/DailyEntryShell.tsx');

    expect(shell).toContain('datum-project-strip');
    expect(shell).toContain('datum-project-code');
    expect(shell).toContain('datum-revision-stamp');
    expect(shell).toContain('Semakan Sah');
    expect(shell).toContain('Semakan Semasa');
    expect(css).toContain('.datum-project-strip');
    expect(css).toContain('.datum-project-code');
    expect(css).toContain('.datum-revision-stamp > span:first-child');
    expect(css).toContain('background: var(--ng-established) !important');
  });
});
