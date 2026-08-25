import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

describe('F2.7-C06 Programme patch atomic authority contract', () => {
  let migrationSql1: string;
  let updateRoute: string;

  beforeAll(() => {
    migrationSql1 = readFileSync(
      join(
        __dirname,
        '../../supabase/migrations/20260824140926_f2_7_c06_programme_patch_atomic_authority.sql',
      ),
      'utf8',
    );
    updateRoute = readFileSync(
      join(__dirname, '../../src/app/api/programme/[programmeId]/route.ts'),
      'utf8',
    );
  });

  it('preserves public.programme protection by using a SECURITY DEFINER wrapper', () => {
    const wrapper = migrationSql1.match(/CREATE OR REPLACE FUNCTION "private"\."c06_update_programme_core"[\s\S]*?\$\$;/)?.[0];
    expect(wrapper).toBeDefined();
    expect(wrapper).toMatch(/SECURITY DEFINER/);
    expect(wrapper).toMatch(/SET search_path = ''/);
  });

  it('revokes execution from PUBLIC and anon, granting exactly to authenticated', () => {
    expect(migrationSql1).toMatch(/REVOKE ALL ON FUNCTION "private"\."c06_update_programme_core"\(uuid, jsonb, uuid, uuid\)\s+FROM PUBLIC, anon, authenticated/);
    expect(migrationSql1).toMatch(/REVOKE ALL ON FUNCTION "public"\."c06_update_programme_atomic"\(uuid, jsonb, uuid, uuid\)\s+FROM PUBLIC, anon, authenticated/);
    expect(migrationSql1).toMatch(/GRANT EXECUTE ON FUNCTION "public"\."c06_update_programme_atomic"\(uuid, jsonb, uuid, uuid\)\s+TO authenticated/);
  });

  it('enforces actor integrity with a27_assert_actor', () => {
    expect(migrationSql1).toMatch(/PERFORM "private"\."a27_assert_actor"\(p_actor_id\);/);
  });

  it('enforces programme authority using assert_capability and PROGRAMME_UPDATE', () => {
    expect(migrationSql1).toMatch(/PERFORM "private"\."assert_capability"\(p_actor_id, p_programme_id, 'PROGRAMME_UPDATE'\);/);
    expect(migrationSql1).toMatch(/INSERT INTO "public"\."permission"[\s\S]*'PROGRAMME_UPDATE'/);
  });

  it('propagates the caller token to composition', () => {
    expect(updateRoute).toMatch(/extractVerifiedIdentity/);
    expect(updateRoute).toMatch(/createProgrammeService\(\{ accessToken: identity\.accessToken \}\)/);
    expect(updateRoute).not.toMatch(/service.?role/i);
  });
});
