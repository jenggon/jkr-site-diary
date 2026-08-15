import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const activeRoutes = ['ahi', 'workpackages', 'project-summary', 'reports'];
const deletedRoutes = ['resources', 'trades', 'buildings', 'previous-activities'];

describe('A26 route architecture', () => {
  it.each(activeRoutes)('%s delegates without direct Supabase access', (route) => {
    const source = readFileSync(resolve(root, 'src/app/api', route, 'route.ts'), 'utf8');
    expect(source).not.toMatch(/supabase|\.from\s*\(/i);
    expect(source).toContain('a26QueryService');
  });

  it.each(deletedRoutes)('%s orphan route no longer exists', (route) => {
    expect(existsSync(resolve(root, 'src/app/api', route, 'route.ts'))).toBe(false);
  });
});
