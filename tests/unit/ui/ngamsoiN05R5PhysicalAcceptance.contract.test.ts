import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('N05R.5 physical acceptance contract', () => {
  it('loads the physical acceptance authority after every earlier NGAMSOI layer', () => {
    const layout = read('src/app/layout.tsx');
    const finalIndex = layout.indexOf('ngamsoi-n05r5-final.css');
    const acceptanceIndex = layout.indexOf('ngamsoi-n05r5-acceptance.css');

    expect(finalIndex).toBeGreaterThan(-1);
    expect(acceptanceIndex).toBeGreaterThan(finalIndex);
  });

  it('restores the branded save ritual while retiring only the standalone tick', () => {
    const completion = read('src/components/brand/NgamsoiCompletionRitual.tsx');
    const acceptance = read('src/app/ngamsoi-n05r5-acceptance.css');

    expect(completion).toContain('ng-completion__particle--1');
    expect(completion).toContain('ng-completion__baseline');
    expect(completion).toContain('ng-completion__signature');
    expect(completion).toContain('<span>Kena boh!</span>');
    expect(completion).toContain('<span>Ngamsoi.</span>');
    expect(completion).not.toContain('ng-completion__check');
    expect(acceptance).toContain('.ng-completion__check');
    expect(acceptance).toContain('display: none !important');
  });

  it('uses one exact dash geometry for source, daily, site, workforce and notes headings', () => {
    const acceptance = read('src/app/ngamsoi-n05r5-acceptance.css');

    expect(acceptance).toContain('form[aria-label="Borang Buku Harian Tapak"] > section > h3');
    expect(acceptance).toContain('.ng-workforce__title');
    expect(acceptance).toContain('.mobile-entry-spike-panel > div:first-child h3');
    expect(acceptance).toContain('width: 1.05rem !important');
    expect(acceptance).toContain('flex: 0 0 1.05rem !important');
    expect(acceptance).toContain('gap: 0.62rem !important');

    expect(acceptance).toContain('.mobile-entry-selected-source::before');
    expect(acceptance).toContain('left: 0 !important');
    expect(acceptance).toContain('.mobile-entry-selected-source::after');
    expect(acceptance).toContain('left: 1.67rem !important');
  });

  it('removes the expanded-source stray internal rail while preserving the active-tab underline', () => {
    const acceptance = read('src/app/ngamsoi-n05r5-acceptance.css');

    expect(acceptance).toContain('section[aria-label="Pemilih Sumber Operasi"]:focus-within');
    expect(acceptance).toContain('.mobile-entry-source-switcher::before');
    expect(acceptance).toContain('.mobile-entry-source-control::after');
    expect(acceptance).toContain('box-shadow: inset 0 -2px 0 var(--ng-current) !important');
  });

  it('animates established mobile sections as a subtle green downstream rail', () => {
    const acceptance = read('src/app/ngamsoi-n05r5-acceptance.css');

    expect(acceptance).toContain('section:has(.mobile-entry-selected-source):not(:focus-within)::after');
    expect(acceptance).toContain('section:has(input[type="date"]):not(:focus-within)::after');
    expect(acceptance).toContain('section:has(input[type="text"][required]:not(:placeholder-shown)):not(:focus-within)::after');
    expect(acceptance).toContain('section:has(textarea[required]:not(:placeholder-shown)):not(:focus-within)::after');
    expect(acceptance).toContain('data-workforce-has-entry="true"');
    expect(acceptance).toContain('@keyframes ng-n05r5-established-flow');
    expect(acceptance).toContain('transform: scaleY(0.24)');
    expect(acceptance).toContain('transform: scaleY(1)');
  });
});
