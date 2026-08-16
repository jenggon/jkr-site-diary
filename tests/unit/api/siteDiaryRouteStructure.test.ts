import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Site Diary route structure', () => {
  it('uses one canonical dynamic parameter name at the same route level', () => {
    const routeRoot = join(process.cwd(), 'src', 'app', 'api', 'site-diary');
    const dynamicDirectories = readdirSync(routeRoot).filter((entry) =>
      entry.startsWith('[') && entry.endsWith(']') &&
      existsSync(join(routeRoot, entry, 'route.ts'))
    );

    expect(dynamicDirectories).toEqual(['[siteDiaryId]']);
    expect(statSync(join(routeRoot, '[siteDiaryId]', 'route.ts')).isFile()).toBe(true);
    expect(statSync(join(routeRoot, '[siteDiaryId]', 'activities', 'route.ts')).isFile()).toBe(true);
    expect(existsSync(join(routeRoot, '[diaryId]', 'activities', 'route.ts'))).toBe(false);
  });
});
