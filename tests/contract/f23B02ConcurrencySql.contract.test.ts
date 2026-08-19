import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = readFileSync(resolve(
  'supabase/migrations/20260818093000_f2_3_site_diary_optimistic_concurrency.sql'
), 'utf8').replace(/\r\n/g, '\n');

function index(fragment: string): number {
  const found = sql.indexOf(fragment);
  expect(found, `missing SQL contract fragment: ${fragment}`).toBeGreaterThan(-1);
  return found;
}

describe('F2.3-B02 SQL transaction ordering contract (source/contract proof, not live concurrency)', () => {
  it('removes the old authenticated RPC bypass and requires a timestamptz token', () => {
    expect(sql).toContain('DROP FUNCTION IF EXISTS "public"."a27_update_site_diary_atomic"(uuid,jsonb,uuid,uuid,uuid)');
    expect(sql).toContain('DROP FUNCTION IF EXISTS "public"."f1_update_site_diary_with_workforce_atomic"(uuid,jsonb,uuid,uuid,uuid)');
    expect(sql).toContain('DROP FUNCTION IF EXISTS "public"."f1_update_site_diary_full_atomic"(uuid,jsonb,uuid,uuid,uuid)');
    expect(sql).toContain('p_expected_last_modified_at timestamptz');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION "public"."f1_update_site_diary_full_atomic"(uuid,jsonb,uuid,uuid,uuid,timestamptz) TO authenticated');
  });

  it('locks, checks existence/revision, derives COALESCE token, then compares semantic timestamps', () => {
    const lock = index('FOR UPDATE;');
    const notFound = index("IF NOT FOUND THEN\n    RAISE EXCEPTION 'A27_SITE_DIARY_NOT_FOUND'");
    const revision = index('PERFORM "private"."a27_assert_revision_operational"');
    const derive = index('v_locked_last_modified_at := coalesce(v_diary_row.updated_at, v_diary_row.submitted_at)');
    const compare = index('v_locked_last_modified_at IS DISTINCT FROM p_expected_last_modified_at');
    expect(lock).toBeLessThan(notFound);
    expect(notFound).toBeLessThan(revision);
    expect(revision).toBeLessThan(derive);
    expect(derive).toBeLessThan(compare);
    expect(sql).not.toContain('::text');
  });

  it('rejects stale state before diary/log/audit, workforce, and print-context mutations', () => {
    const stale = index("RAISE EXCEPTION 'F23_SITE_DIARY_STALE_EDIT' USING ERRCODE = 'PT409'");
    const diaryCore = index('v_diary := "private"."a27_mutate_site_diary_core"');
    const workforce = index('FOR v_existing IN');
    const print = index('UPDATE "public"."site_diary" SET print_context = v_context');
    expect(stale).toBeLessThan(diaryCore);
    expect(diaryCore).toBeLessThan(workforce);
    expect(stale).toBeLessThan(print);
  });
});
