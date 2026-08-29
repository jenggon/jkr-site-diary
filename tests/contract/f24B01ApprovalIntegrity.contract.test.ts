import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = readFileSync(resolve(
  'supabase/migrations/20260818103000_f2_4_approval_integrity.sql'
), 'utf8').replace(/\r\n/g, '\n');

function index(fragment: string): number {
  const found = sql.indexOf(fragment);
  expect(found, `missing SQL contract fragment: ${fragment}`).toBeGreaterThan(-1);
  return found;
}

describe('F2.4-B01 SQL transactional integrity contract (source proof, not live concurrency)', () => {
  it('enforces Site Diary edit sealing', () => {
    // Proves that update site diary calls the sealing function
    const lock = index('FOR UPDATE;');
    const sealCheck = index('PERFORM "private"."f24_assert_site_diary_unsealed"');
    const updateCore = index('v_diary := "private"."a27_mutate_site_diary_core"');
    
    expect(lock).toBeLessThan(sealCheck);
    expect(sealCheck).toBeLessThan(updateCore);

    // Proves the seal logic blocks Pending/Approved, and ONLY Pending/Approved
    expect(sql).toContain("AND approval_status IN ('Pending', 'Approved')");
    expect(sql).not.toContain("AND approval_status IN ('Pending', 'Approved', 'Returned')");
    expect(sql).not.toContain("AND approval_status IN ('Pending', 'Approved', 'Rejected')");
    expect(sql).toContain("RAISE EXCEPTION 'F24_SITE_DIARY_SEALED' USING ERRCODE = 'PT409'");
  });

  it('drops legacy vulnerable Approval RPCs', () => {
    expect(sql).toContain('DROP FUNCTION IF EXISTS "public"."a27_create_approval_atomic"(jsonb, uuid, uuid, uuid)');
    expect(sql).toContain('DROP FUNCTION IF EXISTS "public"."a27_update_approval_atomic"(uuid, jsonb, uuid, uuid)');
  });

  it('implements expected token handshake for createApproval only when site_diary_id is present', () => {
    const sdCheck = index('IF v_site_diary_id IS NOT NULL THEN');
    const tokenRequired = index("RAISE EXCEPTION 'F24_EXPECTED_LAST_MODIFIED_REQUIRED'");
    const sdLock = index('SELECT coalesce(updated_at, submitted_at) INTO v_sd_token \n        FROM "public"."site_diary" \n        WHERE site_diary_id = v_site_diary_id FOR UPDATE;');
    const staleCheck = index("RAISE EXCEPTION 'F24_SITE_DIARY_STALE'");
    const insertAppr = index('INSERT INTO "public"."approval"');

    expect(sdCheck).toBeLessThan(tokenRequired);
    expect(tokenRequired).toBeLessThan(sdLock);
    expect(sdLock).toBeLessThan(staleCheck);
    expect(staleCheck).toBeLessThan(insertAppr);
  });

  it('implements exact canonical lock order for updateApproval', () => {
    // 1. Unlocked discovery read
    const discovery = index('SELECT site_diary_id, programme_id, revision_id, activity_id \n    INTO v_disc_sd_id, v_disc_prog_id, v_disc_rev_id, v_disc_act_id \n    FROM "public"."approval" WHERE approval_id = p_approval_id;');
    // 2. Lock Site Diary
    const lockSd = index('SELECT coalesce(updated_at, submitted_at) INTO v_sd_token \n        FROM "public"."site_diary" \n        WHERE site_diary_id = v_disc_sd_id FOR UPDATE;');
    // 3. Compare token
    const staleCheck = sql.indexOf("RAISE EXCEPTION 'F24_SITE_DIARY_STALE'", lockSd);
    expect(staleCheck, `missing SQL contract fragment`).toBeGreaterThan(-1);
    // 4. Lock Approval
    const lockAppr = index('SELECT * INTO STRICT v_old FROM "public"."approval"\n     WHERE approval_id = p_approval_id FOR UPDATE;');
    // 5. Post-lock revalidation
    const revalidate = index("RAISE EXCEPTION 'F24_APPROVAL_CONTEXT_CHANGED'");
    // 6. Transition
    const transition = index('UPDATE "public"."approval" SET');

    expect(discovery).toBeLessThan(lockSd);
    expect(lockSd).toBeLessThan(staleCheck);
    expect(staleCheck).toBeLessThan(lockAppr);
    expect(lockAppr).toBeLessThan(revalidate);
    expect(revalidate).toBeLessThan(transition);
  });

  it('revalidates exact context post-lock to prevent ABA problems', () => {
    expect(sql).toContain('IF v_old.site_diary_id IS DISTINCT FROM v_disc_sd_id OR');
    expect(sql).toContain('v_old.programme_id IS DISTINCT FROM v_disc_prog_id OR');
    expect(sql).toContain('v_old.revision_id IS DISTINCT FROM v_disc_rev_id OR');
    expect(sql).toContain('v_old.activity_id IS DISTINCT FROM v_disc_act_id THEN');
  });

  it('has no role check fabricated', () => {
    expect(sql).toContain('PERFORM "private"."a27_assert_actor"(p_actor_id)');
    expect(sql).not.toContain('role_name');
    expect(sql).not.toContain('Superintending Officer');
  });
});
