import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, beforeAll, it, expect } from 'vitest';

// F2.7-C01: This suite validates the security wrapper corrective migration.
// The original migrations defined the public wrappers as SECURITY INVOKER which
// caused "permission denied for schema private" for all authenticated callers.
// The corrective migration (C01) replaces them with SECURITY DEFINER.
// These tests must FAIL if someone restores SECURITY INVOKER on the public wrappers.

describe('F2.7-C01 Security Wrapper Remediation — public wrapper contract', () => {
  let originalQueueSql: string;
  let c01Sql: string;

  beforeAll(() => {
    originalQueueSql = readFileSync(
      join(__dirname, '../../supabase/migrations/20260819160000_f2_4_b03_approval_queue.sql'),
      'utf8'
    );
    c01Sql = readFileSync(
      join(__dirname, '../../supabase/migrations/20260822090000_f2_7_c01_security_wrapper_remediation.sql'),
      'utf8'
    );
  });

  // ============================================================
  // C01 Forward Migration — General
  // ============================================================

  it('C01 migration file exists and is non-empty', () => {
    expect(c01Sql.length).toBeGreaterThan(500);
  });

  it('C01 migration does NOT touch the three original migration files', () => {
    // This test is a static canary — if someone modifies the original
    // files and these tests start reading from a patched original, the
    // SECURITY INVOKER assertion below will fail, alerting reviewers.
    expect(originalQueueSql).toMatch(/SECURITY INVOKER/);
  });

  it('C01 migration does NOT grant USAGE ON SCHEMA private to authenticated', () => {
    expect(c01Sql).not.toMatch(/GRANT\s+USAGE\s+ON\s+SCHEMA\s+["']?private["']?\s+TO\s+authenticated/i);
    expect(c01Sql).not.toMatch(/GRANT\s+USAGE\s+ON\s+SCHEMA\s+["']?private["']?\s+TO\s+PUBLIC/i);
  });

  it('C01 migration does NOT grant EXECUTE on private functions to authenticated', () => {
    expect(c01Sql).not.toMatch(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+"private"/i);
  });

  it('C01 closes the private queue activity_name text-to-varchar mismatch explicitly', () => {
    const privateQueueSection = c01Sql.match(
      /CREATE OR REPLACE FUNCTION "private"\."get_site_diary_approval_queue"[\s\S]*?(?=CREATE OR REPLACE FUNCTION "public"\."f24_get_site_diary_approval_queue"|$)/
    )?.[0] ?? '';

    expect(privateQueueSection).toMatch(/activity_name character varying/);
    expect(privateQueueSection).toMatch(
      /act\.subtask_display_name::character varying AS activity_name/
    );
    expect(privateQueueSection).toMatch(/SECURITY DEFINER/);
    expect(privateQueueSection).toMatch(/SET search_path\s*=\s*''/);
    expect(privateQueueSection).toContain('"private"."a27_assert_actor"(p_actor_id)');
    expect(privateQueueSection).toContain("'SITE_DIARY_APPROVAL_QUEUE_VIEW'");
    expect(privateQueueSection).toMatch(/a\.programme_id = p_programme_id/);
    expect(privateQueueSection).toMatch(/a\.site_diary_id IS NOT NULL/);
    expect(privateQueueSection).toMatch(/ORDER BY a\.requested_at DESC/);
  });

  // ============================================================
  // f24_get_site_diary_approval_queue — PUBLIC WRAPPER
  // ============================================================

  it('C01 replaces f24_get_site_diary_approval_queue as SECURITY DEFINER (not INVOKER)', () => {
    // The corrective migration must define the public wrapper as SECURITY DEFINER
    expect(c01Sql).toMatch(
      /CREATE OR REPLACE FUNCTION "public"\."f24_get_site_diary_approval_queue"[\s\S]*?SECURITY DEFINER/
    );
    // Must NOT use SECURITY INVOKER for the public wrapper in C01
    const queueSection = c01Sql.match(
      /CREATE OR REPLACE FUNCTION "public"\."f24_get_site_diary_approval_queue"[\s\S]*?(?=CREATE OR REPLACE FUNCTION|REVOKE|GRANT|$)/
    )?.[0] ?? '';
    expect(queueSection).not.toMatch(/SECURITY INVOKER/);
  });

  it('C01 f24_get_site_diary_approval_queue uses explicit empty search_path', () => {
    const queueSection = c01Sql.match(
      /CREATE OR REPLACE FUNCTION "public"\."f24_get_site_diary_approval_queue"[\s\S]*?(?=CREATE OR REPLACE FUNCTION "public"\."f24_get_site_diary_approval_review"|$)/
    )?.[0] ?? '';
    expect(queueSection).toMatch(/SET search_path\s*=\s*''/);
  });

  it('C01 f24_get_site_diary_approval_queue derives actor from auth.uid() — not a client parameter', () => {
    const queueSection = c01Sql.match(
      /CREATE OR REPLACE FUNCTION "public"\."f24_get_site_diary_approval_queue"[\s\S]*?(?=CREATE OR REPLACE FUNCTION "public"\."f24_get_site_diary_approval_review"|$)/
    )?.[0] ?? '';
    // Must call auth.uid() inside the body
    expect(queueSection).toMatch(/"auth"\."uid"\(\)/);
    // Public wrapper must NOT expose an actor_id parameter
    const signatureLine = queueSection.match(/FUNCTION "public"\."f24_get_site_diary_approval_queue"\(([\s\S]*?)\)/)?.[1] ?? '';
    expect(signatureLine).not.toMatch(/actor_id|p_actor/i);
  });

  it('C01 f24_get_site_diary_approval_queue delegates to private.get_site_diary_approval_queue', () => {
    expect(c01Sql).toMatch(/"private"\."get_site_diary_approval_queue"\(/);
  });

  it('C01 f24_get_site_diary_approval_queue grants EXECUTE to authenticated only', () => {
    expect(c01Sql).toMatch(
      /REVOKE ALL ON FUNCTION "public"\."f24_get_site_diary_approval_queue"\(uuid\) FROM PUBLIC, anon, authenticated/
    );
    expect(c01Sql).toMatch(
      /GRANT EXECUTE ON FUNCTION "public"\."f24_get_site_diary_approval_queue"\(uuid\) TO authenticated/
    );
  });

  // ============================================================
  // f24_get_site_diary_approval_review — PUBLIC WRAPPER
  // ============================================================

  it('C01 replaces f24_get_site_diary_approval_review as SECURITY DEFINER (not INVOKER)', () => {
    expect(c01Sql).toMatch(
      /CREATE OR REPLACE FUNCTION "public"\."f24_get_site_diary_approval_review"[\s\S]*?SECURITY DEFINER/
    );
    const reviewSection = c01Sql.match(
      /CREATE OR REPLACE FUNCTION "public"\."f24_get_site_diary_approval_review"[\s\S]*?(?=CREATE OR REPLACE FUNCTION "public"\."f25_|REVOKE ALL ON FUNCTION "public"\."f24_get_site_diary_approval_review"|$)/
    )?.[0] ?? '';
    expect(reviewSection).not.toMatch(/SECURITY INVOKER/);
  });

  it('C01 f24_get_site_diary_approval_review uses explicit empty search_path', () => {
    const reviewSection = c01Sql.match(
      /CREATE OR REPLACE FUNCTION "public"\."f24_get_site_diary_approval_review"[\s\S]*?(?=CREATE OR REPLACE FUNCTION "public"\."f25_|$)/
    )?.[0] ?? '';
    expect(reviewSection).toMatch(/SET search_path\s*=\s*''/);
  });

  it('C01 f24_get_site_diary_approval_review derives actor from auth.uid() — not a client parameter', () => {
    const reviewSection = c01Sql.match(
      /CREATE OR REPLACE FUNCTION "public"\."f24_get_site_diary_approval_review"[\s\S]*?(?=CREATE OR REPLACE FUNCTION "public"\."f25_|$)/
    )?.[0] ?? '';
    expect(reviewSection).toMatch(/"auth"\."uid"\(\)/);
    const signatureLine = reviewSection.match(/FUNCTION "public"\."f24_get_site_diary_approval_review"\(([\s\S]*?)\)/)?.[1] ?? '';
    expect(signatureLine).not.toMatch(/actor_id|p_actor/i);
  });

  it('C01 f24_get_site_diary_approval_review delegates to private.get_site_diary_approval_review', () => {
    expect(c01Sql).toMatch(/"private"\."get_site_diary_approval_review"\(/);
  });

  it('C01 f24_get_site_diary_approval_review grants EXECUTE to authenticated only', () => {
    expect(c01Sql).toMatch(
      /REVOKE ALL ON FUNCTION "public"\."f24_get_site_diary_approval_review"\(uuid\) FROM PUBLIC, anon, authenticated/
    );
    expect(c01Sql).toMatch(
      /GRANT EXECUTE ON FUNCTION "public"\."f24_get_site_diary_approval_review"\(uuid\) TO authenticated/
    );
  });

  // ============================================================
  // f25_get_site_diary_print_read — PUBLIC WRAPPER
  // ============================================================

  it('C01 replaces f25_get_site_diary_print_read as SECURITY DEFINER (not INVOKER)', () => {
    expect(c01Sql).toMatch(
      /CREATE OR REPLACE FUNCTION "public"\."f25_get_site_diary_print_read"[\s\S]*?SECURITY DEFINER/
    );
    const printSection = c01Sql.match(
      /CREATE OR REPLACE FUNCTION "public"\."f25_get_site_diary_print_read"[\s\S]*/
    )?.[0] ?? '';
    expect(printSection).not.toMatch(/SECURITY INVOKER/);
  });

  it('C01 f25_get_site_diary_print_read uses explicit empty search_path', () => {
    const printSection = c01Sql.match(
      /CREATE OR REPLACE FUNCTION "public"\."f25_get_site_diary_print_read"[\s\S]*/
    )?.[0] ?? '';
    expect(printSection).toMatch(/SET search_path\s*=\s*''/);
  });

  it('C01 f25_get_site_diary_print_read derives actor from auth.uid() — not a client parameter', () => {
    const printSection = c01Sql.match(
      /CREATE OR REPLACE FUNCTION "public"\."f25_get_site_diary_print_read"[\s\S]*/
    )?.[0] ?? '';
    expect(printSection).toMatch(/"auth"\."uid"\(\)/);
    const signatureLine = printSection.match(/FUNCTION "public"\."f25_get_site_diary_print_read"\(([\s\S]*?)\)/)?.[1] ?? '';
    expect(signatureLine).not.toMatch(/actor_id|p_actor/i);
  });

  it('C01 f25_get_site_diary_print_read delegates to private.get_site_diary_print_read', () => {
    expect(c01Sql).toMatch(/"private"\."get_site_diary_print_read"\(/);
  });

  it('C01 f25_get_site_diary_print_read grants EXECUTE to authenticated only', () => {
    expect(c01Sql).toMatch(
      /REVOKE ALL ON FUNCTION "public"\."f25_get_site_diary_print_read"\(uuid\) FROM PUBLIC, anon, authenticated/
    );
    expect(c01Sql).toMatch(
      /GRANT EXECUTE ON FUNCTION "public"\."f25_get_site_diary_print_read"\(uuid\) TO authenticated/
    );
  });
});
