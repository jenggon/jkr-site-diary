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

  it('keeps the post-physical entrypoint bounded to one consolidated F4.5 baseline and current R3 authority', () => {
    const authority = readFileSync(resolve(process.cwd(), 'src/app/ngamsoi-f45-authority.css'), 'utf8');
    const postPhysical = readFileSync(resolve(process.cwd(), 'src/app/ngamsoi-f45-post-physical.css'), 'utf8');

    expect(authority).toContain('F4.5 UI AUTHORITY — CONSOLIDATED RUNTIME OWNER');
    expect(authority).not.toMatch(/@import[^;]*ngamsoi-f45-/i);
    expect(postPhysical).toContain('@import "./ngamsoi-f45-authority.css";');
    expect(postPhysical.match(/@import[^;]*ngamsoi-f45-/gi)?.length).toBe(1);
    expect(postPhysical).toContain('F4.5 POST-PHYSICAL REMEDIATION OWNER');
    expect(postPhysical).toContain('SPINE-002 / SAVE-003 / SAVE-004 / HDR-003 / DASH-002 /');
    expect(postPhysical).toContain('WX-005 / WX-006 / COPY-002 / EXEC-001 / VIS-001 / SOURCE-001 / DLG-001 /');
    expect(postPhysical).toContain('CI-003 presentation evidence only.');
    expect(postPhysical).toContain('do not add another F4.5 override generation after this entrypoint');
  });
});
