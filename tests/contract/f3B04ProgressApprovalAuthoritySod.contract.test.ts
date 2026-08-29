import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

type ProgressStatus = 'Draft' | 'Verified' | 'Approved';
type ProgressPermission = 'PROGRESS_EDIT' | 'PROGRESS_VERIFY' | 'PROGRESS_APPROVE';
type ApprovalDecision = 'Approved' | 'Rejected' | 'Returned' | 'Cancelled' | 'Pending';

function normalizeSql(sql: string): string {
  return sql.replace(/--.*$/gm, '').replace(/"/g, '').replace(/\s+/g, ' ').trim();
}

function functionDefinition(sql: string, schema: 'private' | 'public', name: string): string {
  const start = sql.indexOf(`CREATE OR REPLACE FUNCTION "${schema}"."${name}"`);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = sql.indexOf('$$;', start);
  expect(end).toBeGreaterThan(start);
  return sql.slice(start, end + 3);
}

function authorizeProgressCreate(status: ProgressStatus): void {
  if (status !== 'Draft') throw new Error('F3_PROGRESS_CREATE_STATUS_INVALID');
}

function authorizeProgressUpdate(
  from: ProgressStatus,
  to: ProgressStatus,
  hasEditPatch: boolean,
  permissions: ReadonlySet<ProgressPermission>,
): 'edit' | 'verify' | 'approve' {
  if (from === 'Draft' && to === 'Draft') {
    if (!permissions.has('PROGRESS_EDIT')) throw new Error('F3_UNAUTHORIZED_AUTHORITY');
    return 'edit';
  }

  if (from === 'Draft' && to === 'Verified') {
    if (hasEditPatch && !permissions.has('PROGRESS_EDIT')) {
      throw new Error('F3_UNAUTHORIZED_AUTHORITY');
    }
    if (!permissions.has('PROGRESS_VERIFY')) throw new Error('F3_UNAUTHORIZED_AUTHORITY');
    return 'verify';
  }

  if (from === 'Verified' && to === 'Approved') {
    if (hasEditPatch) throw new Error('F3_PROGRESS_NOT_EDITABLE');
    if (!permissions.has('PROGRESS_APPROVE')) throw new Error('F3_UNAUTHORIZED_AUTHORITY');
    return 'approve';
  }

  throw new Error('F3_PROGRESS_TRANSITION_INVALID');
}

function authorizeApprovalDecision(
  requesterId: string,
  actorId: string,
  target: ApprovalDecision,
  hasPermission: boolean,
): void {
  if (!hasPermission) throw new Error('F24_UNAUTHORIZED_CAPABILITY');
  if (['Approved', 'Rejected', 'Returned'].includes(target) && requesterId === actorId) {
    throw new Error('F3_APPROVAL_SELF_DECISION_DENIED');
  }
}

describe('F3-B04 Progress / Approval Authority & Separation of Duty contracts', () => {
  let migrationSql: string;
  let normalizedMigration: string;
  let createProgress: string;
  let updateProgress: string;
  let updateApproval: string;
  let b03Sql: string;

  beforeAll(() => {
    const migrationsDirectory = join(__dirname, '../../supabase/migrations');
    const files = readdirSync(migrationsDirectory).filter((file) =>
      file.endsWith('_f3_b04_progress_approval_authority_sod.sql'),
    );

    expect(files).toHaveLength(1);
    expect(files[0]!.localeCompare('20260829230000_f3_b03_read_isolation_grant_closure.sql')).toBeGreaterThan(0);

    migrationSql = readFileSync(join(migrationsDirectory, files[0]!), 'utf8');
    normalizedMigration = normalizeSql(migrationSql);
    createProgress = functionDefinition(
      migrationSql,
      'private',
      'a27_create_progress_atomic',
    );
    updateProgress = functionDefinition(
      migrationSql,
      'private',
      'a27_update_progress_atomic',
    );
    updateApproval = functionDefinition(
      migrationSql,
      'private',
      'a27_update_approval_atomic',
    );
    b03Sql = readFileSync(
      join(migrationsDirectory, '20260829230000_f3_b03_read_isolation_grant_closure.sql'),
      'utf8',
    );
  });

  describe('Progress vertical authority', () => {
    it('1. PROGRESS_EDIT creation is bound to locked Activity context and persists Draft only', () => {
      expect(createProgress).toContain('SELECT * INTO STRICT v_activity');
      expect(createProgress).toContain('FOR UPDATE;');
      expect(createProgress).toContain("p_actor_id, v_activity.programme_id, 'PROGRESS_EDIT'");
      expect(createProgress).toContain("'Draft'::\"public\".\"progress_measurement_status\"");
      expect(createProgress).toContain('F3_PROGRESS_CREATE_STATUS_INVALID');
    });

    it('2. caller-supplied Verified or Approved cannot enter through create', () => {
      expect(() => authorizeProgressCreate('Verified')).toThrow(
        'F3_PROGRESS_CREATE_STATUS_INVALID',
      );
      expect(() => authorizeProgressCreate('Approved')).toThrow(
        'F3_PROGRESS_CREATE_STATUS_INVALID',
      );
    });

    it('3. ordinary field edits require PROGRESS_EDIT and remain Draft', () => {
      expect(
        authorizeProgressUpdate('Draft', 'Draft', true, new Set(['PROGRESS_EDIT'])),
      ).toBe('edit');
      expect(() => authorizeProgressUpdate('Draft', 'Draft', true, new Set())).toThrow(
        'F3_UNAUTHORIZED_AUTHORITY',
      );
      expect(updateProgress).toContain(
        "v_existing.measurement_status = 'Draft' AND v_new_status = 'Draft'",
      );
    });

    it('4. PROGRESS_EDIT alone cannot produce Verified', () => {
      expect(() =>
        authorizeProgressUpdate('Draft', 'Verified', false, new Set(['PROGRESS_EDIT'])),
      ).toThrow('F3_UNAUTHORIZED_AUTHORITY');
    });

    it('5. PROGRESS_EDIT alone cannot produce Approved', () => {
      expect(() =>
        authorizeProgressUpdate('Verified', 'Approved', false, new Set(['PROGRESS_EDIT'])),
      ).toThrow('F3_UNAUTHORIZED_AUTHORITY');
    });

    it('6. Draft -> Verified requires PROGRESS_VERIFY; bundled edits require PROGRESS_EDIT too', () => {
      expect(
        authorizeProgressUpdate('Draft', 'Verified', false, new Set(['PROGRESS_VERIFY'])),
      ).toBe('verify');
      expect(() =>
        authorizeProgressUpdate('Draft', 'Verified', true, new Set(['PROGRESS_VERIFY'])),
      ).toThrow('F3_UNAUTHORIZED_AUTHORITY');
      expect(
        authorizeProgressUpdate(
          'Draft',
          'Verified',
          true,
          new Set(['PROGRESS_EDIT', 'PROGRESS_VERIFY']),
        ),
      ).toBe('verify');
      expect(updateProgress).toContain("'PROGRESS_VERIFY'");
    });

    it('7. PROGRESS_VERIFY alone cannot approve; Verified -> Approved requires PROGRESS_APPROVE', () => {
      expect(() =>
        authorizeProgressUpdate('Verified', 'Approved', false, new Set(['PROGRESS_VERIFY'])),
      ).toThrow('F3_UNAUTHORIZED_AUTHORITY');
      expect(
        authorizeProgressUpdate('Verified', 'Approved', false, new Set(['PROGRESS_APPROVE'])),
      ).toBe('approve');
      expect(updateProgress).toContain("'PROGRESS_APPROVE'");
    });

    it('8. status skip, downgrade, reopen, and terminal mutation fail closed', () => {
      const forbidden: Array<[ProgressStatus, ProgressStatus]> = [
        ['Draft', 'Approved'],
        ['Verified', 'Draft'],
        ['Approved', 'Draft'],
        ['Approved', 'Verified'],
        ['Approved', 'Approved'],
      ];
      for (const [from, to] of forbidden) {
        expect(() =>
          authorizeProgressUpdate(
            from,
            to,
            false,
            new Set(['PROGRESS_EDIT', 'PROGRESS_VERIFY', 'PROGRESS_APPROVE']),
          ),
        ).toThrow('F3_PROGRESS_TRANSITION_INVALID');
      }
      expect(updateProgress).toContain('F3_PROGRESS_TRANSITION_INVALID');
    });

    it('9. generic JSONB update cannot smuggle a privileged status or edit an approved path', () => {
      expect(updateProgress).toContain("p_payload ? 'measurement_status'");
      expect(updateProgress).toContain("p_payload ? 'actual_quantity'");
      expect(updateProgress).toContain("p_payload ? 'progress_percentage'");
      expect(updateProgress).toContain('F3_PROGRESS_NOT_EDITABLE');
      expect(() =>
        authorizeProgressUpdate(
          'Verified',
          'Approved',
          true,
          new Set(['PROGRESS_EDIT', 'PROGRESS_APPROVE']),
        ),
      ).toThrow('F3_PROGRESS_NOT_EDITABLE');
    });

    it('10. update derives Programme authority from stored Progress and preserves B02 context checks', () => {
      expect(updateProgress).toContain('SELECT * INTO STRICT v_existing');
      expect(updateProgress).toContain('p_actor_id, v_existing.programme_id');
      expect(updateProgress).toContain('"private"."a27_assert_revision_operational"');
      expect(updateProgress).toContain('"private"."a27_assert_activity_context"');
      expect(updateProgress).toContain('"private"."a27_assert_linked_context"');
      expect(updateProgress).not.toContain("p_payload->>'programme_id'");
    });

    it('11. approved completion, Activity history, and audit remain in one atomic core', () => {
      expect(updateProgress).toContain("v_complete := v_new_status = 'Approved'");
      expect(updateProgress).toContain('UPDATE "public"."activity"');
      expect(updateProgress).toContain('INSERT INTO "public"."activity_logs"');
      expect(updateProgress).toContain('INSERT INTO "public"."audit"');
      expect(updateProgress.indexOf('UPDATE "public"."activity"')).toBeLessThan(
        updateProgress.indexOf('INSERT INTO "public"."activity_logs"'),
      );
      expect(updateProgress.indexOf('INSERT INTO "public"."activity_logs"')).toBeLessThan(
        updateProgress.indexOf('INSERT INTO "public"."audit"'),
      );
    });

    it('12. exact public grants remain authenticated-only and private cores remain inaccessible', () => {
      const signatures = [
        '"private"."a27_create_progress_atomic"(jsonb, uuid, uuid, uuid, uuid)',
        '"private"."a27_update_progress_atomic"(uuid, jsonb, uuid, uuid, uuid)',
        '"public"."a27_create_progress_atomic"(jsonb, uuid, uuid, uuid, uuid)',
        '"public"."a27_update_progress_atomic"(uuid, jsonb, uuid, uuid, uuid)',
      ];
      for (const signature of signatures) {
        expect(migrationSql).toContain(`REVOKE ALL ON FUNCTION ${signature}`);
      }
      expect(migrationSql).toContain(
        'GRANT EXECUTE ON FUNCTION "public"."a27_create_progress_atomic"(jsonb, uuid, uuid, uuid, uuid)',
      );
      expect(migrationSql).toContain(
        'GRANT EXECUTE ON FUNCTION "public"."a27_update_progress_atomic"(uuid, jsonb, uuid, uuid, uuid)',
      );
      expect(migrationSql).not.toMatch(/GRANT EXECUTE ON FUNCTION "private"/);
    });
  });

  describe('Approval separation of duty', () => {
    it('13. requester cannot approve own Site Diary Approval', () => {
      expect(() => authorizeApprovalDecision('requester', 'requester', 'Approved', true)).toThrow(
        'F3_APPROVAL_SELF_DECISION_DENIED',
      );
      expect(updateApproval).toContain('p_actor_id = v_old.requested_by');
    });

    it('14. requester cannot reject or return own Approval', () => {
      for (const target of ['Rejected', 'Returned'] as const) {
        expect(() => authorizeApprovalDecision('requester', 'requester', target, true)).toThrow(
          'F3_APPROVAL_SELF_DECISION_DENIED',
        );
      }
      expect(updateApproval).toContain("v_target IN ('Approved', 'Rejected', 'Returned')");
    });

    it('15. a different actor without the operation permission remains denied', () => {
      expect(() => authorizeApprovalDecision('requester', 'reviewer', 'Approved', false)).toThrow(
        'F24_UNAUTHORIZED_CAPABILITY',
      );
      expect(updateApproval).toContain("'SITE_DIARY_APPROVAL_APPROVE'");
      expect(updateApproval).toContain("'SITE_DIARY_APPROVAL_RETURN'");
      expect(updateApproval).toContain("'SITE_DIARY_APPROVAL_REJECT'");
    });

    it('16. a different actor with the correct capability passes the SoD contract', () => {
      expect(() =>
        authorizeApprovalDecision('requester', 'reviewer', 'Approved', true),
      ).not.toThrow();
      expect(() =>
        authorizeApprovalDecision('requester', 'reviewer', 'Rejected', true),
      ).not.toThrow();
      expect(() =>
        authorizeApprovalDecision('requester', 'reviewer', 'Returned', true),
      ).not.toThrow();
    });

    it('17. cancellation and same-row requester resubmission are not blocked by decision SoD', () => {
      expect(() =>
        authorizeApprovalDecision('requester', 'requester', 'Cancelled', true),
      ).not.toThrow();
      expect(() =>
        authorizeApprovalDecision('requester', 'requester', 'Pending', true),
      ).not.toThrow();
      expect(updateApproval).toContain("'SITE_DIARY_APPROVAL_CANCEL'");
      expect(updateApproval).toContain("v_old.approval_status = 'Returned' AND v_target = 'Pending'");
      expect(updateApproval).toContain('v_is_resubmit');
    });

    it('18. requester and deciding identities come from stored row/authenticated actor, not payload', () => {
      expect(updateApproval).toContain('PERFORM "private"."a27_assert_actor"(p_actor_id)');
      expect(updateApproval).toContain('p_actor_id = v_old.requested_by');
      expect(updateApproval).toContain(
        'approved_by = CASE WHEN v_is_resubmit THEN NULL ELSE p_actor_id END',
      );
      expect(updateApproval).toContain(
        'requested_by = CASE WHEN v_is_resubmit THEN p_actor_id ELSE requested_by END',
      );
      expect(updateApproval).not.toContain("p_payload->>'requested_by'");
      expect(updateApproval).not.toContain("p_payload->>'approved_by'");
      expect(updateApproval).not.toContain("p_payload->>'reviewed_by'");
    });

    it('19. Programme capability and canonical context/lock checks remain enforced', () => {
      expect(updateApproval).toContain(
        '"private"."assert_capability"(\n                p_actor_id, v_disc_prog_id',
      );
      expect(updateApproval).toContain('SELECT * INTO STRICT v_old');
      expect(updateApproval).toContain('F24_APPROVAL_CONTEXT_CHANGED');
      expect(updateApproval).toContain('"private"."a27_assert_revision_operational"');
      expect(updateApproval).toContain('"private"."a27_assert_activity_context"');
      expect(updateApproval).toContain('"private"."a27_assert_linked_context"');
    });

    it('20. Approval RPC grant stays exact and its private core remains inaccessible', () => {
      expect(migrationSql).toContain(
        'REVOKE ALL ON FUNCTION "private"."a27_update_approval_atomic"(uuid, jsonb, uuid, uuid, timestamptz)',
      );
      expect(migrationSql).toContain(
        'REVOKE ALL ON FUNCTION "public"."a27_update_approval_atomic"(uuid, jsonb, uuid, uuid, timestamptz)',
      );
      expect(migrationSql).toContain(
        'GRANT EXECUTE ON FUNCTION "public"."a27_update_approval_atomic"(uuid, jsonb, uuid, uuid, timestamptz)',
      );
    });
  });

  describe('B01-B03 preservation and migration hygiene', () => {
    it('21. B04 does not reopen direct approval/progress reads or add permissive policies', () => {
      expect(normalizedMigration).not.toMatch(/GRANT SELECT ON TABLE public\.(approval|progress)/i);
      expect(normalizedMigration).not.toMatch(/USING\s*\(\s*true\s*\)/i);
      expect(normalizedMigration).not.toMatch(/WITH CHECK\s*\(\s*true\s*\)/i);

      const normalizedB03 = normalizeSql(b03Sql);
      expect(normalizedB03).toContain(
        'REVOKE ALL ON TABLE public.approval FROM PUBLIC, anon, authenticated',
      );
      expect(normalizedB03).toContain(
        'REVOKE ALL ON TABLE public.progress FROM PUBLIC, anon, authenticated',
      );
      expect(normalizedB03).not.toMatch(/GRANT SELECT ON TABLE public\.(approval|progress)/i);
    });

    it('22. all replaced cores remain SECURITY DEFINER with an empty search_path', () => {
      for (const definition of [createProgress, updateProgress, updateApproval]) {
        expect(definition).toContain('SECURITY DEFINER');
        expect(definition).toContain("SET search_path = ''");
      }
      expect(normalizedMigration).not.toContain('GRANT EXECUTE ON ALL FUNCTIONS');
      expect(normalizedMigration).not.toMatch(/GRANT USAGE ON SCHEMA private/i);
    });
  });
});
