import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, beforeAll, it, expect } from 'vitest';

describe('F2.4-B03 Approval Queue Authority SQL contract', () => {
  let sql: string;

  beforeAll(() => {
    sql = readFileSync(
      join(__dirname, '../../supabase/migrations/20260819160000_f2_4_b03_approval_queue.sql'),
      'utf8'
    );
  });

  it('defines get_site_diary_approval_queue as SECURITY DEFINER to enable safe projection', () => {
    expect(sql).toMatch(
      /CREATE OR REPLACE FUNCTION "private"."get_site_diary_approval_queue"[\s\S]*?SECURITY DEFINER/
    );
  });

  it('enforces SITE_DIARY_APPROVAL_QUEUE_VIEW capability for the requested programme', () => {
    expect(sql).toMatch(
      /PERFORM "private"."assert_capability"\(\s*p_actor_id,\s*p_programme_id,\s*'SITE_DIARY_APPROVAL_QUEUE_VIEW'/
    );
  });

  it('strictly excludes generic null-Site-Diary approvals', () => {
    expect(sql).toContain('a.site_diary_id IS NOT NULL');
  });

  it('scopes queue to the specified programme_id', () => {
    expect(sql).toContain('a.programme_id = p_programme_id');
  });

  it('returns a strongly typed structure preserving exact identity', () => {
    expect(sql).toContain('approval_id uuid');
    expect(sql).toContain('site_diary_id uuid');
    expect(sql).toContain('programme_id uuid');
  });

  it('is exposed through a SECURITY INVOKER wrapper in the public schema', () => {
    expect(sql).toMatch(
      /CREATE OR REPLACE FUNCTION "public"."f24_get_site_diary_approval_queue"[\s\S]*?SECURITY INVOKER/
    );
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION "public"."f24_get_site_diary_approval_queue"(uuid) TO authenticated');
  });
});
