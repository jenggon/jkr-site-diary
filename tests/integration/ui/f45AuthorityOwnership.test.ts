import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('F4.5 visual authority ownership', () => {
  it('loads exactly one F4.5 stylesheet from the application layout', () => {
    const layout = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8');
    const imports = Array.from(
      layout.matchAll(/import\s+["']\.\/(ngamsoi-f45-[^"']+\.css)["'];/g),
      (match) => match[1],
    );

    expect(imports).toEqual(['ngamsoi-f45-authority.css']);
  });

  it('keeps the final authority self-contained instead of chaining another F4.5 stylesheet', () => {
    const authority = readFileSync(resolve(process.cwd(), 'src/app/ngamsoi-f45-authority.css'), 'utf8');

    expect(authority).toContain('F4.5 UI AUTHORITY — CONSOLIDATED RUNTIME OWNER');
    expect(authority).not.toMatch(/@import[^;]*ngamsoi-f45-/i);
  });
});
