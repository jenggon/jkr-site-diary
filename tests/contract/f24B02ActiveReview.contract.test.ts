import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = readFileSync(resolve(
  'supabase/migrations/20260819120000_f2_4_b02_active_review_resubmission.sql'
), 'utf8').replace(/\r\n/g, '\n');
const b01Sql = readFileSync(resolve(
  'supabase/migrations/20260818103000_f2_4_approval_integrity.sql'
), 'utf8').replace(/\r\n/g, '\n');

describe('F2.4-B02 active review and resubmission SQL contract', () => {
  it('enforces one Pending Approval per non-null Site Diary with a partial unique index', () => {
    expect(sql).toMatch(
      /CREATE UNIQUE INDEX "uq_approval_one_pending_site_diary"\s+ON "public"\."approval" \("site_diary_id"\)\s+WHERE "site_diary_id" IS NOT NULL\s+AND "approval_status" = 'Pending';/
    );
  });

  it('locks the Site Diary before checking Pending, Approved, or Returned requests', () => {
    const lock = sql.indexOf('WHERE site_diary_id = v_site_diary_id\n        FOR UPDATE;');
    const approved = sql.indexOf("approval_status = 'Approved'", lock);
    const pending = sql.indexOf("approval_status = 'Pending'", approved);
    const returned = sql.indexOf("approval_status = 'Returned'", pending);
    expect(lock).toBeGreaterThan(-1);
    expect(approved).toBeGreaterThan(lock);
    expect(pending).toBeGreaterThan(approved);
    expect(returned).toBeGreaterThan(pending);
  });

  it('maps a uniqueness race to a structured Pending conflict before audit insertion', () => {
    expect(sql).toMatch(
      /INSERT INTO "public"\."approval"[\s\S]*?EXCEPTION WHEN unique_violation THEN\s+GET STACKED DIAGNOSTICS v_constraint_name = CONSTRAINT_NAME;\s+IF v_constraint_name = 'uq_approval_one_pending_site_diary' THEN\s+RAISE EXCEPTION 'F24_PENDING_APPROVAL_EXISTS' USING ERRCODE = 'PT409';\s+END IF;\s+RAISE;[\s\S]*?INSERT INTO "public"\."audit"/
    );
  });

  it('blocks Approved evidence and requires same-row handling for Returned evidence', () => {
    expect(sql).toContain("RAISE EXCEPTION 'F24_APPROVED_APPROVAL_EXISTS' USING ERRCODE = 'PT409';");
    expect(sql).toContain("RAISE EXCEPTION 'F24_RETURNED_APPROVAL_REQUIRES_RESUBMISSION' USING ERRCODE = 'PT409';");
  });

  it('allows a new row after Rejected but not after Pending, Approved, or Returned', () => {
    const createGate = sql.slice(
      sql.indexOf("approval_status = 'Approved'"),
      sql.indexOf('BEGIN\n        INSERT INTO "public"."approval"')
    );
    expect(createGate).toContain("approval_status = 'Pending'");
    expect(createGate).toContain("approval_status = 'Returned'");
    expect(createGate).not.toContain("approval_status = 'Rejected'");
  });

  it('governs resubmission with request capability and exact Returned to Pending transition', () => {
    expect(sql).toMatch(
      /IF v_target = 'Pending' THEN\s+PERFORM "private"\."assert_capability"\(\s*p_actor_id, v_disc_prog_id, 'SITE_DIARY_APPROVAL_REQUEST'/
    );
    expect(sql).toContain("(v_old.approval_status = 'Returned' AND v_target = 'Pending')");
  });

  it('updates the same Approval row and never inserts an Approval during resubmission', () => {
    const updateFunction = sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION "private"."a27_update_approval_atomic"'));
    expect(updateFunction).toContain('UPDATE "public"."approval" SET');
    expect(updateFunction).not.toContain('INSERT INTO "public"."approval"');
    expect(updateFunction).toContain('WHERE approval_id = p_approval_id');
  });

  it('records resubmitter identity without labeling the resubmitter as approver', () => {
    expect(sql).toContain('approved_by = CASE WHEN v_is_resubmit THEN NULL ELSE p_actor_id END');
    expect(sql).toContain('requested_by = CASE WHEN v_is_resubmit THEN p_actor_id ELSE requested_by END');
    expect(sql).toContain("CASE WHEN v_is_resubmit THEN 'submitter' ELSE 'approver' END");
  });

  it('checks the current Site Diary token before locking and mutating Approval', () => {
    const updateFunction = sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION "private"."a27_update_approval_atomic"'));
    const diaryLock = updateFunction.indexOf('WHERE site_diary_id = v_disc_sd_id\n        FOR UPDATE;');
    const stale = updateFunction.indexOf("RAISE EXCEPTION 'F24_SITE_DIARY_STALE'", diaryLock);
    const approvalLock = updateFunction.indexOf('WHERE approval_id = p_approval_id\n    FOR UPDATE;', stale);
    const update = updateFunction.indexOf('UPDATE "public"."approval" SET', approvalLock);
    expect(diaryLock).toBeGreaterThan(-1);
    expect(stale).toBeGreaterThan(diaryLock);
    expect(approvalLock).toBeGreaterThan(stale);
    expect(update).toBeGreaterThan(approvalLock);
  });

  it('permits reviewer decisions only from Pending and makes Rejected terminal', () => {
    expect(sql).toContain(
      "v_old.approval_status = 'Pending'\n             AND v_target IN ('Approved', 'Returned', 'Rejected', 'Cancelled')"
    );
    expect(sql).toContain("v_old.approval_status IN ('Approved', 'Rejected', 'Cancelled')");
  });

  it('preserves B01 sealing only for Pending and Approved', () => {
    const sealingFunction = b01Sql.match(
      /CREATE OR REPLACE FUNCTION "private"\."f24_assert_site_diary_unsealed"[\s\S]*?\$\$;/
    )?.[0];
    expect(sealingFunction).toBeDefined();
    expect(sealingFunction).toContain("approval_status IN ('Pending', 'Approved')");
    expect(sealingFunction).not.toContain('Returned');
    expect(sealingFunction).not.toContain('Rejected');
    expect(sealingFunction).not.toContain('Cancelled');
  });

  it('preserves action-specific P03 capabilities and post-lock context validation', () => {
    for (const capability of ['APPROVE', 'RETURN', 'REJECT', 'CANCEL']) {
      expect(sql).toContain(`SITE_DIARY_APPROVAL_${capability}`);
    }
    expect(sql).toContain("RAISE EXCEPTION 'F24_APPROVAL_CONTEXT_CHANGED' USING ERRCODE = 'PT409';");
    expect(sql).toContain('PERFORM "private"."a27_assert_linked_context"');
  });

  it('keeps generic Approval decisions outside Site Diary capability rules', () => {
    const generic = sql.match(
      /ELSE\s+(IF v_target NOT IN \('Approved', 'Rejected', 'Returned', 'Cancelled'\) THEN[\s\S]*?END IF;)\s+END IF;\s+\n\s*IF v_disc_sd_id IS NOT NULL/
    )?.[1];
    expect(generic).toBeDefined();
    expect(generic).not.toContain('assert_capability');
    expect(generic).not.toContain('SITE_DIARY_APPROVAL_');
  });

  it('keeps Approval and audit mutation atomic for resubmission and decisions', () => {
    const updateFunction = sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION "private"."a27_update_approval_atomic"'));
    expect(updateFunction).toMatch(
      /UPDATE "public"\."approval" SET[\s\S]*?RETURNING \* INTO v_row;[\s\S]*?INSERT INTO "public"\."audit"/
    );
    expect(updateFunction).toContain("'Approval resubmitted after correction'");
  });
});
