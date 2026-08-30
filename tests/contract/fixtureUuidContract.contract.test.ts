import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { isValidUuid } from '@/lib/uuid';

describe('Synthetic Fixture UUID Contract (F4.5-B01A.1)', () => {
  it('strictly validates every UUID in supabase/seed.sql as RFC-compliant', () => {
    const seedPath = path.join(process.cwd(), 'supabase/seed.sql');
    const content = readFileSync(seedPath, 'utf8');
    const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
    const matches = Array.from(new Set(content.match(uuidRegex) ?? []));

    expect(matches.length).toBeGreaterThan(0);

    const invalidUuids = matches.filter((id) => !isValidUuid(id));
    expect(
      invalidUuids,
      `All seed.sql fixture UUIDs must pass isValidUuid(). Found invalid: ${invalidUuids.join(', ')}`
    ).toEqual([]);
  });

  it('strictly validates every UUID in supabase/verify-db.sql as RFC-compliant', () => {
    const verifyDbPath = path.join(process.cwd(), 'supabase/verify-db.sql');
    const content = readFileSync(verifyDbPath, 'utf8');
    const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
    const matches = Array.from(new Set(content.match(uuidRegex) ?? []));

    expect(matches.length).toBeGreaterThan(0);

    const invalidUuids = matches.filter((id) => !isValidUuid(id));
    expect(
      invalidUuids,
      `All verify-db.sql UUIDs must pass isValidUuid(). Found invalid: ${invalidUuids.join(', ')}`
    ).toEqual([]);
  });

  it('verifies standard fixture personas and programmes conform to the UUID contract', () => {
    const fixtures = [
      { name: 'P1 Submitter', id: '99999999-9999-4999-8999-999999999991' },
      { name: 'P2 Reviewer', id: '99999999-9999-4999-8999-999999999992' },
      { name: 'P3 Unauthorized', id: '99999999-9999-4999-8999-999999999993' },
      { name: 'P4 Project Manager', id: '99999999-9999-4999-8999-999999999994' },
      { name: 'Programme A', id: '11111111-1111-4111-8111-111111111111' },
      { name: 'Programme B', id: '22222222-2222-4222-8222-222222222222' },
      { name: 'Prog A Current Revision', id: '33333333-3333-4333-8333-333333333333' },
      { name: 'Prog A Historical Revision', id: '77777777-7777-4777-8777-777777777777' },
      { name: 'Prog A Historical Activity', id: 'ffffffff-ffff-4fff-8fff-ffffffffffff' },
      { name: 'Prog A Current Activity', id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' },
    ];

    for (const fixture of fixtures) {
      expect(
        isValidUuid(fixture.id),
        `${fixture.name} (${fixture.id}) must be a valid RFC UUID`
      ).toBe(true);
    }
  });
});
