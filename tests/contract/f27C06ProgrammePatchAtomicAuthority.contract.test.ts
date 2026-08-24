import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

describe('F2.7-C06 Programme patch atomic authority contract', () => {
  let migrationSql: string;
  let updateRoute: string;

  beforeAll(() => {
    migrationSql = readFileSync(
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
    const wrapper = migrationSql.match(/CREATE OR REPLACE FUNCTION "private"\."c06_update_programme_core"[\s\S]*?\$\$;/)?.[0];
    expect(wrapper).toBeDefined();
    expect(wrapper).toMatch(/SECURITY DEFINER/);
    expect(wrapper).toMatch(/SET search_path = ''/);
  });

  it('revokes execution from PUBLIC and anon, granting exactly to authenticated', () => {
    expect(migrationSql).toMatch(/REVOKE ALL ON FUNCTION "private"\."c06_update_programme_core"\(uuid, jsonb, uuid, uuid\)\s+FROM PUBLIC, anon, authenticated/);
    expect(migrationSql).toMatch(/REVOKE ALL ON FUNCTION "public"\."c06_update_programme_atomic"\(uuid, jsonb, uuid, uuid\)\s+FROM PUBLIC, anon, authenticated/);
    expect(migrationSql).toMatch(/GRANT EXECUTE ON FUNCTION "public"\."c06_update_programme_atomic"\(uuid, jsonb, uuid, uuid\)\s+TO authenticated/);
  });

  it('enforces actor integrity with a27_assert_actor', () => {
    expect(migrationSql).toMatch(/PERFORM "private"\."a27_assert_actor"\(p_actor_id\);/);
  });

  it('enforces programme authority using is_programme_member', () => {
    expect(migrationSql).toMatch(/IF NOT "private"\."is_programme_member"\(p_programme_id\) THEN/);
    expect(migrationSql).toMatch(/RAISE EXCEPTION 'C06_PROGRAMME_UPDATE_UNAUTHORIZED' USING ERRCODE = 'PT403';/);
  });

  it('propagates the caller token to composition', () => {
    expect(updateRoute).toMatch(/extractVerifiedIdentity/);
    expect(updateRoute).toMatch(/createProgrammeService\(\{ accessToken: identity\.accessToken \}\)/);
    expect(updateRoute).not.toMatch(/service.?role/i);
  });
});
