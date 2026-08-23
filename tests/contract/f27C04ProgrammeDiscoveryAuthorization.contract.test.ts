import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

describe('F2.7-C04 Programme discovery authorization contract', () => {
  let migrationSql: string;
  let discoveryComposition: string;
  let discoveryRoute: string;

  beforeAll(() => {
    migrationSql = readFileSync(
      join(
        __dirname,
        '../../supabase/migrations/20260823100000_f2_7_c04_programme_discovery_authorization.sql',
      ),
      'utf8',
    );
    discoveryComposition = readFileSync(
      join(__dirname, '../../src/composition/programmeComposition.ts'),
      'utf8',
    );
    discoveryRoute = readFileSync(join(__dirname, '../../src/app/api/programme/route.ts'), 'utf8');
  });

  it('enables RLS on programme and grants authenticated SELECT only', () => {
    expect(migrationSql).toMatch(/ALTER TABLE "public"\."programme" ENABLE ROW LEVEL SECURITY/);
    expect(migrationSql).toMatch(
      /REVOKE ALL ON TABLE "public"\."programme" FROM anon, authenticated/,
    );
    expect(migrationSql).toMatch(/GRANT SELECT ON TABLE "public"\."programme" TO authenticated/);
    expect(migrationSql).not.toMatch(
      /GRANT\s+(?:INSERT|UPDATE|DELETE|ALL)[\s\S]*?"public"\."programme"[\s\S]*?TO authenticated/i,
    );
  });

  it('does not grant anonymous Programme discovery', () => {
    expect(migrationSql).not.toMatch(
      /GRANT\s+(?:SELECT|ALL)[\s\S]*?"public"\."programme"[\s\S]*?TO anon/i,
    );
    expect(migrationSql).toMatch(
      /CREATE POLICY "c04_active_programme_membership_select"[\s\S]*?TO authenticated/,
    );
  });

  it('uses a hardened membership helper derived only from auth.uid()', () => {
    const helper = migrationSql.match(
      /CREATE OR REPLACE FUNCTION "private"\."is_programme_member"[\s\S]*?\$\$;/,
    )?.[0];

    expect(helper).toBeDefined();
    expect(helper).toMatch(/SECURITY DEFINER/);
    expect(helper).toMatch(/SET search_path = ''/);
    expect(helper).toContain('"auth"."uid"()');
    expect(helper).toMatch(/pm\."programme_id" = p_programme_id/);
    expect(helper).toMatch(/pm\."user_id" = "auth"\."uid"\(\)/);
    expect(helper).toMatch(/pm\."is_active" = true/);
    expect(helper).not.toMatch(/actor_id|p_actor/i);
  });

  it('binds the SELECT policy to the membership helper', () => {
    expect(migrationSql).toMatch(
      /FOR SELECT\s+TO authenticated\s+USING \(\s*"private"\."is_programme_member"\("programme_id"\)\s*\)/,
    );
  });

  it('keeps programme_membership sealed from direct authenticated reads', () => {
    expect(migrationSql).not.toMatch(
      /GRANT\s+(?:SELECT|ALL)[\s\S]*?"public"\."programme_membership"/i,
    );
  });

  it('uses the caller token without introducing service-role Programme discovery', () => {
    expect(discoveryComposition).toContain('getSupabaseAuthenticatedClient');
    expect(discoveryComposition).toContain(
      'new ProgrammeRepository(new SupabaseDatabaseAdapter(authenticatedClient))',
    );
    expect(`${discoveryComposition}\n${discoveryRoute}`).not.toMatch(/service.?role/i);
  });
});
