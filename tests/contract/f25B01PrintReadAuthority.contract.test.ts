import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('F2.5-B01 Print Read Authority Migration Contract', () => {
  const migrationPath = path.join(
    process.cwd(),
    'supabase/migrations/20260820110000_f2_5_b01_print_read_authority.sql'
  );

  let content = '';
  
  try {
    content = fs.readFileSync(migrationPath, 'utf8');
  } catch {
    // ignore
  }

  it('must define SITE_DIARY_PRINT_READ permission', () => {
    expect(content).toContain(`'SITE_DIARY_PRINT_READ'`);
  });

  it('must grant permission to PROJECT_MANAGER, RESIDENT_ENGINEER, and SITE_SUPERVISOR', () => {
    expect(content).toMatch(/role_code\s*=\s*'PROJECT_MANAGER'/);
    expect(content).toMatch(/role_code\s*=\s*'RESIDENT_ENGINEER'/);
    expect(content).toMatch(/role_code\s*=\s*'SITE_SUPERVISOR'/);
    
    // Ensure they are inserted
    expect(content).toMatch(/INSERT INTO\s+"public"."role_permission"\s*\(role_id,\s*permission_id\)\s*VALUES\s*\(v_pm_id,\s*v_print_read\)/);
    expect(content).toMatch(/INSERT INTO\s+"public"."role_permission"\s*\(role_id,\s*permission_id\)\s*VALUES\s*\(v_re_id,\s*v_print_read\)/);
    expect(content).toMatch(/INSERT INTO\s+"public"."role_permission"\s*\(role_id,\s*permission_id\)\s*VALUES\s*\(v_ss_id,\s*v_print_read\)/);
  });

  it('must NOT grant permission to CONTRACTOR or VIEWER', () => {
    expect(content).not.toMatch(/role_code\s*=\s*'CONTRACTOR'/);
    expect(content).not.toMatch(/role_code\s*=\s*'VIEWER'/);
  });

  it('must enforce assert_capability', () => {
    expect(content).toMatch(/PERFORM\s+"private"."assert_capability"\(\s*p_actor_id,\s*v_canonical_programme_id,\s*'SITE_DIARY_PRINT_READ'\s*\);/);
  });

  it('must use public wrapper with auth.uid()', () => {
    expect(content).toMatch(/\(SELECT\s+auth.uid\(\)\)/);
    expect(content).toMatch(/SECURITY\s+INVOKER/);
  });

  it('must not grant execution to anon on public wrapper', () => {
    expect(content).toMatch(/REVOKE\s+ALL\s+ON\s+FUNCTION\s+"public"."f25_get_site_diary_print_read"\(uuid\)\s+FROM\s+PUBLIC,\s*anon,\s*authenticated;/);
    expect(content).toMatch(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+"public"."f25_get_site_diary_print_read"\(uuid\)\s+TO\s+authenticated;/);
  });

  it('must explicitly revoke execution from public, anon, and authenticated on private function', () => {
    expect(content).toMatch(/REVOKE\s+ALL\s+ON\s+FUNCTION\s+"private"."get_site_diary_print_read"\(uuid,\s*uuid\)\s+FROM\s+PUBLIC,\s*anon,\s*authenticated;/);
  });
  
  it('must enforce Programme equality check', () => {
    expect(content).toContain('v_site_diary_record.programme_id != v_site_diary_record.act_prog_id');
  });

  it('must enforce Revision equality check', () => {
    expect(content).toContain('v_site_diary_record.revision_id != v_site_diary_record.act_rev_id');
  });

  it('must reference revision_name instead of revision_title', () => {
    expect(content).toMatch(/'revision_name',\s*pr.revision_name/);
    expect(content).not.toMatch(/revision_title/);
  });

  it('must not introduce Approval projection', () => {
    expect(content).not.toMatch(/approval/i);
  });

  it('must harden private function with empty search_path and security definer', () => {
    expect(content).toMatch(/SECURITY\s+DEFINER/);
    expect(content).toMatch(/SET\s+search_path\s*=\s*''/);
  });
});
