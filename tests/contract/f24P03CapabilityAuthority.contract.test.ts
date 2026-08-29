import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = readFileSync(resolve(
  'supabase/migrations/20260819000000_f2_4_p03_capability_authority.sql'
), 'utf8').replace(/\r\n/g, '\n');

describe('F2.4-P03 Capability Authority SQL contract', () => {
  it('creates assert_capability primitive with correct actor binding', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION "private"."assert_capability"');
    expect(sql).toContain('PERFORM "private"."a27_assert_actor"(p_actor_id);');
  });

  it('assert_capability is SECURITY DEFINER with search_path hardening', () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION "private"."assert_capability"[\s\S]*?SECURITY DEFINER[\s\S]*?SET search_path = ''/);
  });

  it('assert_capability enforces exact capabilities and fail-closed logic', () => {
    // Requires user_profile, programme_membership, role, role_permission, permission
    expect(sql).toContain('FROM "public"."user_profile" up');
    expect(sql).toContain('JOIN "public"."programme_membership" pm ON up.user_id = pm.user_id');
    expect(sql).toContain('JOIN "public"."role" r ON pm.role_id = r.role_id');
    expect(sql).toContain('JOIN "public"."role_permission" rp ON r.role_id = rp.role_id');
    expect(sql).toContain('JOIN "public"."permission" p ON rp.permission_id = p.permission_id');
    
    // Enforces target programme and actor
    expect(sql).toContain('up.user_id = p_actor_id');
    expect(sql).toContain('pm.programme_id = p_programme_id');
    expect(sql).toContain('p.permission_code = p_permission_code');
    
    // Checks active status across chain
    expect(sql).toContain('up.is_active = true');
    expect(sql).toContain('pm.is_active = true');
    expect(sql).toContain('r.is_active = true');
    expect(sql).toContain("r.scope = 'Programme'");
    
    // Returns 403 / PT403 on failure
    expect(sql).toContain("RAISE EXCEPTION 'F24_UNAUTHORIZED_CAPABILITY' USING ERRCODE = 'PT403';");
  });

  it('enforces capability in a27_create_approval_atomic only when site_diary_id IS NOT NULL', () => {
    expect(sql).toMatch(/IF v_site_diary_id IS NOT NULL THEN\s*PERFORM "private"\."assert_capability"\(p_actor_id, v_programme_id, 'SITE_DIARY_APPROVAL_REQUEST'\);\s*END IF;/);
  });

  it('enforces capability in a27_update_approval_atomic mapped by target status only when site_diary_id IS NOT NULL', () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION "private"."a27_update_approval_atomic"/);
    expect(sql).toMatch(/IF v_disc_sd_id IS NOT NULL THEN\s*IF v_target = 'Approved' THEN\s*PERFORM "private"\."assert_capability"\(p_actor_id, v_disc_prog_id, 'SITE_DIARY_APPROVAL_APPROVE'\);/);
    expect(sql).toContain("ELSIF v_target = 'Returned' THEN");
    expect(sql).toContain("PERFORM \"private\".\"assert_capability\"(p_actor_id, v_disc_prog_id, 'SITE_DIARY_APPROVAL_RETURN');");
    expect(sql).toContain("ELSIF v_target = 'Rejected' THEN");
    expect(sql).toContain("PERFORM \"private\".\"assert_capability\"(p_actor_id, v_disc_prog_id, 'SITE_DIARY_APPROVAL_REJECT');");
    expect(sql).toContain("ELSIF v_target = 'Cancelled' THEN");
    expect(sql).toContain("PERFORM \"private\".\"assert_capability\"(p_actor_id, v_disc_prog_id, 'SITE_DIARY_APPROVAL_CANCEL');");
    
    // Target status fallback
    expect(sql).toContain("RAISE EXCEPTION 'A27_APPROVAL_TARGET_INVALID' USING ERRCODE = '23514';");
  });

  it('keeps the complete generic Approval decision branch capability-free', () => {
    const genericBranch = sql.match(
      /ELSE\s+(IF v_target NOT IN \('Approved', 'Rejected', 'Returned', 'Cancelled'\) THEN[\s\S]*?END IF;)\s+END IF;\s+\n\s*-- Canonical Lock Order/
    )?.[1];

    expect(genericBranch).toBeDefined();
    expect(genericBranch).toContain("RAISE EXCEPTION 'A27_APPROVAL_TARGET_INVALID' USING ERRCODE = '23514';");
    expect(genericBranch).not.toContain('assert_capability');
    expect(genericBranch).not.toContain('SITE_DIARY_APPROVAL_');
  });

  it('preserves B01 canonical lock order and token semantics in update', () => {
    // Verifies that Site Diary is still locked before Approval in update
    expect(sql).toMatch(/SELECT coalesce\(updated_at, submitted_at\) INTO v_sd_token[\s\S]*?FROM "public"."site_diary"[\s\S]*?FOR UPDATE;[\s\S]*?SELECT \* INTO STRICT v_old FROM "public"."approval"[\s\S]*?FOR UPDATE;/);
  });
});
