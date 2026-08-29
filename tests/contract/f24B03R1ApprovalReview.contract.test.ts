import { readFileSync } from 'fs';
import { join } from 'path';
import { beforeAll, describe, expect, it } from 'vitest';

describe('F2.4-B03-R1 exact approval review SQL contract', () => {
  let sql: string;

  beforeAll(() => {
    sql = readFileSync(
      join(__dirname, '../../supabase/migrations/20260819170000_f2_4_b03_r1_exact_approval_review.sql'),
      'utf8'
    );
  });

  it('keeps the privileged function private, hardened, and actor asserted', () => {
    expect(sql).toMatch(/"private"\."get_site_diary_approval_review"[\s\S]*SECURITY DEFINER/);
    expect(sql).toContain("SET search_path = ''");
    expect(sql).toContain('PERFORM "private"."a27_assert_actor"(p_actor_id)');
    expect(sql).toContain('REVOKE ALL ON FUNCTION "private"."get_site_diary_approval_review"(uuid, uuid)');
  });

  it('looks up the exact ID, excludes generic approvals, and derives programme authority from the row', () => {
    expect(sql).toContain('a.approval_id = p_approval_id');
    expect(sql).toContain('v_approval.site_diary_id IS NULL');
    expect(sql).toMatch(/assert_capability"\(\s*p_actor_id,\s*v_approval\.programme_id,\s*'SITE_DIARY_APPROVAL_QUEUE_VIEW'/);
    expect(sql).not.toContain('p_programme_id');
  });

  it('exposes only an authenticated wrapper whose actor comes from auth.uid()', () => {
    expect(sql).toMatch(/"public"\."f24_get_site_diary_approval_review"[\s\S]*SECURITY INVOKER/);
    expect(sql).toContain('(SELECT "auth"."uid"())');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION "public"."f24_get_site_diary_approval_review"(uuid)');
  });
});
