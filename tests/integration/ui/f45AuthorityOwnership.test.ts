import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('F4.5 visual authority ownership', () => {
  it('loads exactly one F4.5 stylesheet entrypoint from the application layout', () => {
    const layout = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8');
    const imports = Array.from(
      layout.matchAll(/import\s+["']\.\/(ngamsoi-f45-[^"']+\.css)["'];/g),
      (match) => match[1],
    );

    expect(imports).toEqual(['ngamsoi-f45-post-physical.css']);
  });

  it('keeps the post-physical entrypoint bounded to one consolidated F4.5 baseline', () => {
    const authority = readFileSync(resolve(process.cwd(), 'src/app/ngamsoi-f45-authority.css'), 'utf8');
    const postPhysical = readFileSync(resolve(process.cwd(), 'src/app/ngamsoi-f45-post-physical.css'), 'utf8');

    expect(authority).toContain('F4.5 UI AUTHORITY — CONSOLIDATED RUNTIME OWNER');
    expect(authority).not.toMatch(/@import[^;]*ngamsoi-f45-/i);
    expect(postPhysical).toContain('@import "./ngamsoi-f45-authority.css";');
    expect(postPhysical.match(/@import[^;]*ngamsoi-f45-/gi)?.length).toBe(1);
    expect(postPhysical).toContain('F4.5 POST-PHYSICAL REMEDIATION OWNER');
    expect(postPhysical).toContain('SAVE-002 / SPINE-002 / DASH-001 / WX-004 only');
  });
});
