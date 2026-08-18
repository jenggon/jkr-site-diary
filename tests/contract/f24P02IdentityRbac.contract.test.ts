import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = readFileSync(resolve(
  'supabase/migrations/20260818130000_f2_4_p02_identity_rbac.sql'
), 'utf8').replace(/\r\n/g, '\n');

describe('F2.4-P02 Identity & RBAC SQL contract', () => {
  it('enforces User Profile 1:1 with auth.users', () => {
    expect(sql).toContain('"user_id" uuid PRIMARY KEY REFERENCES auth.users(id)');
  });

  it('enforces Programme Membership uniqueness constraints', () => {
    expect(sql).toContain('UNIQUE("programme_id", "user_id")');
  });

  it('revokes authenticated select on profile and membership', () => {
    expect(sql).toContain('REVOKE ALL ON "public"."user_profile" FROM "anon", "authenticated";');
    expect(sql).toContain('REVOKE ALL ON "public"."programme_membership" FROM "anon", "authenticated";');
  });

  it('seeds correct canonical roles', () => {
    expect(sql).toContain("'SYSTEM_ADMIN'");
    expect(sql).toContain("'HQ_ADMIN'");
    expect(sql).toContain("'PROJECT_MANAGER'");
    expect(sql).toContain("'RESIDENT_ENGINEER'");
    expect(sql).toContain("'SITE_SUPERVISOR'");
    expect(sql).toContain("'CONTRACTOR'");
    expect(sql).toContain("'VIEWER'");
  });

  it('ensures PROJECT_MANAGER receives PROGRAMME_MEMBERSHIP_MANAGE and NO Approval permissions', () => {
    expect(sql).toContain("v_pm_id uuid := (SELECT role_id FROM \"public\".\"role\" WHERE role_code = 'PROJECT_MANAGER');");
    expect(sql).toContain("v_manage uuid := (SELECT permission_id FROM \"public\".\"permission\" WHERE permission_code = 'PROGRAMME_MEMBERSHIP_MANAGE');");
    expect(sql).toContain('INSERT INTO "public"."role_permission" (role_id, permission_id) VALUES (v_pm_id, v_manage)');
    
    // Check that pm_id is NOT used for approval permissions
    // The only place v_pm_id is used is for v_manage
    const pmIdOccurrences = (sql.match(/v_pm_id/g) || []).length;
    // 1 declaration, 1 insert
    expect(pmIdOccurrences).toBe(2);
  });

  it('has independent Approval permissions', () => {
    expect(sql).toContain("'SITE_DIARY_APPROVAL_REQUEST'");
    expect(sql).toContain("'SITE_DIARY_APPROVAL_REVIEW'");
    expect(sql).toContain("'SITE_DIARY_APPROVAL_APPROVE'");
    expect(sql).toContain("'SITE_DIARY_APPROVAL_RETURN'");
    expect(sql).toContain("'SITE_DIARY_APPROVAL_REJECT'");
    expect(sql).toContain("'SITE_DIARY_APPROVAL_CANCEL'");
    expect(sql).toContain("'SITE_DIARY_APPROVAL_QUEUE_VIEW'");
  });

  it('ensures bootstrap assigns PROJECT_MANAGER to creator if in auth.users', () => {
    expect(sql).toContain("SELECT role_id INTO v_pm_role_id FROM \"public\".\"role\" WHERE role_code = 'PROJECT_MANAGER';");
    expect(sql).toContain("IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.created_by) THEN");
    expect(sql).toContain("INSERT INTO \"public\".\"programme_membership\"");
  });

  it('does NOT fabricate auth users during bootstrap or backfill', () => {
    expect(sql).toContain("RAISE NOTICE 'Skipping bootstrap: created_by % not found in auth.users'");
    expect(sql).toContain("RAISE NOTICE 'Skipping existing bootstrap: created_by % not found in auth.users for programme %'");
    // Verify it doesn't insert into auth.users anywhere
    expect(sql).not.toContain("INSERT INTO auth.users");
  });

  it('ensures historical backfill sets full_name to NULL', () => {
    expect(sql).toContain('VALUES (rec.created_by, NULL, true)');
    expect(sql).not.toContain("'Historical User'");
  });

  it('prevents Global roles from being used in Programme membership', () => {
    expect(sql).toContain("RAISE EXCEPTION 'Cannot assign a Global role as a Programme membership.'");
  });
});
