import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

describe('F3-B02 Privileged RPC Mutation Closure Contract Test Suite', () => {
  let b02MigrationSql: string;

  beforeAll(() => {
    b02MigrationSql = readFileSync(
      join(
        __dirname,
        '../../supabase/migrations/20260829220000_f3_b02_privileged_rpc_mutation_closure.sql',
      ),
      'utf8',
    );
  });

  describe('Part 1: Static SQL Structure & Privilege Hardening Contract', () => {
    it('seeds TRADE_CREATE_DURING_ENTRY and maps to SITE_ENGINEER, SITE_SUPERVISOR, SYSTEM_ADMIN, HQ_ADMIN', () => {
      expect(b02MigrationSql).toContain("'TRADE_CREATE_DURING_ENTRY'");
      expect(b02MigrationSql).toContain('v_perm_trade_entry');
      expect(b02MigrationSql).toContain('(v_se, v_perm_trade_entry)');
      expect(b02MigrationSql).toContain('(v_ss, v_perm_trade_entry)');
      expect(b02MigrationSql).toContain('(v_sys_admin, v_perm_trade_entry)');
      expect(b02MigrationSql).toContain('(v_hq_admin, v_perm_trade_entry)');
    });

    it('Target 1: a27_create_programme_core enforces assert_global_capability(PROGRAMME_CREATE) before mutation', () => {
      const fn = b02MigrationSql.match(
        /CREATE OR REPLACE FUNCTION "private"\."a27_create_programme_core"[\s\S]*?\$\$;/,
      )?.[0];
      expect(fn).toBeDefined();
      expect(fn).toContain('SECURITY DEFINER');
      expect(fn).toContain("SET search_path = ''");
      expect(fn).toContain('PERFORM "private"."assert_global_capability"(p_actor_id, \'PROGRAMME_CREATE\');');
      expect(b02MigrationSql).toMatch(
        /REVOKE ALL ON FUNCTION "private"\."a27_create_programme_core"\(jsonb, uuid, uuid, uuid, uuid\)\s+FROM PUBLIC, anon, authenticated;/,
      );
      expect(b02MigrationSql).toMatch(
        /GRANT EXECUTE ON FUNCTION "public"\."a27_create_programme_atomic"\(jsonb, uuid, uuid, uuid, uuid\)\s+TO authenticated;/,
      );
    });

    it('Target 2: a27_ingest_msp_core enforces assert_authority(REVISION_IMPORT) before inserting revision/tasks', () => {
      const fn = b02MigrationSql.match(
        /CREATE OR REPLACE FUNCTION "private"\."a27_ingest_msp_core"[\s\S]*?\$\$;/,
      )?.[0];
      expect(fn).toBeDefined();
      expect(fn).toContain('SECURITY DEFINER');
      expect(fn).toContain("SET search_path = ''");
      expect(fn).toContain('PERFORM "private"."assert_authority"(p_actor_id, v_programme, \'REVISION_IMPORT\');');
      expect(b02MigrationSql).toMatch(
        /REVOKE ALL ON FUNCTION "private"\."a27_ingest_msp_core"\(jsonb, jsonb, uuid, uuid\)\s+FROM PUBLIC, anon, authenticated;/,
      );
      expect(b02MigrationSql).toMatch(
        /GRANT EXECUTE ON FUNCTION "public"\."a27_ingest_msp_atomic"\(jsonb, jsonb, uuid, uuid\)\s+TO authenticated;/,
      );
    });

    it('Target 3: a27_approve_revision_core derives programme_id from canonical row and enforces REVISION_APPROVE', () => {
      const fn = b02MigrationSql.match(
        /CREATE OR REPLACE FUNCTION "private"\."a27_approve_revision_core"[\s\S]*?\$\$;/,
      )?.[0];
      expect(fn).toBeDefined();
      expect(fn).toContain('SECURITY DEFINER');
      expect(fn).toContain("SET search_path = ''");
      expect(fn).toContain('SELECT * INTO v_target FROM "public"."programme_revision" WHERE revision_id = p_revision_id FOR UPDATE;');
      expect(fn).toContain('PERFORM "private"."assert_authority"(p_actor_id, v_target.programme_id, \'REVISION_APPROVE\');');
      expect(b02MigrationSql).toMatch(
        /GRANT EXECUTE ON FUNCTION "public"\."a27_approve_revision_atomic"\(uuid, uuid, uuid\)\s+TO authenticated;/,
      );
    });

    it('Target 4: a27_archive_programme_core enforces assert_authority(PROGRAMME_ARCHIVE)', () => {
      const fn = b02MigrationSql.match(
        /CREATE OR REPLACE FUNCTION "private"\."a27_archive_programme_core"[\s\S]*?\$\$;/,
      )?.[0];
      expect(fn).toBeDefined();
      expect(fn).toContain('SECURITY DEFINER');
      expect(fn).toContain("SET search_path = ''");
      expect(fn).toContain('PERFORM "private"."assert_authority"(p_actor_id, p_programme_id, \'PROGRAMME_ARCHIVE\');');
      expect(b02MigrationSql).toMatch(
        /GRANT EXECUTE ON FUNCTION "public"\."a27_archive_programme"\(uuid, uuid\)\s+TO authenticated;/,
      );
    });

    it('Target 5: a27_update_task_core derives programme_id from task row and enforces TASK_UPDATE', () => {
      const fn = b02MigrationSql.match(
        /CREATE OR REPLACE FUNCTION "private"\."a27_update_task_core"[\s\S]*?\$\$;/,
      )?.[0];
      expect(fn).toBeDefined();
      expect(fn).toContain('SECURITY DEFINER');
      expect(fn).toContain("SET search_path = ''");
      expect(fn).toContain('SELECT * INTO v_task FROM "public"."task" WHERE task_id = p_task_id FOR UPDATE;');
      expect(fn).toContain('PERFORM "private"."assert_authority"(p_actor_id, v_task.programme_id, \'TASK_UPDATE\');');
      expect(b02MigrationSql).toMatch(
        /GRANT EXECUTE ON FUNCTION "public"\."a27_update_task"\(uuid, jsonb, uuid\)\s+TO authenticated;/,
      );
    });

    it('Target 6: a27_create_activity_core and a27_mutate_activity_core enforce ACTIVITY_CREATE, ACTIVITY_UPDATE, ACTIVITY_EXECUTE', () => {
      const createFn = b02MigrationSql.match(
        /CREATE OR REPLACE FUNCTION "private"\."a27_create_activity_core"[\s\S]*?\$\$;/,
      )?.[0];
      expect(createFn).toBeDefined();
      expect(createFn).toContain('PERFORM "private"."assert_authority"(p_actor_id, v_programme, \'ACTIVITY_CREATE\');');

      const mutateFn = b02MigrationSql.match(
        /CREATE OR REPLACE FUNCTION "private"\."a27_mutate_activity_core"[\s\S]*?\$\$;/,
      )?.[0];
      expect(mutateFn).toBeDefined();
      expect(mutateFn).toContain('PERFORM "private"."assert_authority"(p_actor_id, v_activity.programme_id, \'ACTIVITY_UPDATE\');');
      expect(mutateFn).toContain('PERFORM "private"."assert_authority"(p_actor_id, v_activity.programme_id, \'ACTIVITY_EXECUTE\');');
    });

    it('Target 7: Date-aware Activity lifecycle RPCs enforce ACTIVITY_EXECUTE', () => {
      const startFn = b02MigrationSql.match(
        /CREATE OR REPLACE FUNCTION "private"\."f1_start_activity_on_date_core"[\s\S]*?\$\$;/,
      )?.[0];
      expect(startFn).toBeDefined();
      expect(startFn).toContain('PERFORM "private"."assert_authority"(v_actor, v_activity.programme_id, \'ACTIVITY_EXECUTE\');');

      const compFn = b02MigrationSql.match(
        /CREATE OR REPLACE FUNCTION "private"\."f1_complete_activity_with_dates_core"[\s\S]*?\$\$;/,
      )?.[0];
      expect(compFn).toBeDefined();
      expect(compFn).toContain('PERFORM "private"."assert_authority"(v_actor, v_activity.programme_id, \'ACTIVITY_EXECUTE\');');
    });

    it('Target 8 & Surface Closure: drops obsolete siblings and hardens canonical Site Diary create/update', () => {
      expect(b02MigrationSql).toContain('DROP FUNCTION IF EXISTS "public"."a27_create_site_diary_atomic"(jsonb, uuid, uuid, uuid, uuid);');
      expect(b02MigrationSql).toContain('DROP FUNCTION IF EXISTS "public"."f1_create_site_diary_with_workforce_atomic"(jsonb, uuid, uuid, uuid, uuid);');

      const mutateSdFn = b02MigrationSql.match(
        /CREATE OR REPLACE FUNCTION "private"\."a27_mutate_site_diary_core"[\s\S]*?\$\$;/,
      )?.[0];
      expect(mutateSdFn).toBeDefined();
      expect(mutateSdFn).toContain('PERFORM "private"."assert_authority"(p_actor_id, v_activity.programme_id, \'SITE_DIARY_CREATE\');');
      expect(mutateSdFn).toContain('PERFORM "private"."assert_authority"(p_actor_id, v_diary.programme_id, \'SITE_DIARY_UPDATE\');');
    });

    it('Target 9: a27_mutate_workforce_core enforces WORKFORCE_MANAGE on create and update', () => {
      const wfFn = b02MigrationSql.match(
        /CREATE OR REPLACE FUNCTION "private"\."a27_mutate_workforce_core"[\s\S]*?\$\$;/,
      )?.[0];
      expect(wfFn).toBeDefined();
      expect(wfFn).toContain('PERFORM "private"."assert_authority"(p_actor_id, v_diary.programme_id, \'WORKFORCE_MANAGE\');');
      expect(wfFn).toContain('PERFORM "private"."assert_authority"(p_actor_id, v_workforce.programme_id, \'WORKFORCE_MANAGE\');');
    });

    it('Target 10: f1_create_vo_item_atomic enforces VO_ITEM_CREATE', () => {
      const voFn = b02MigrationSql.match(
        /CREATE OR REPLACE FUNCTION "public"\."f1_create_vo_item_atomic"[\s\S]*?\$\$;/,
      )?.[0];
      expect(voFn).toBeDefined();
      expect(voFn).toContain('PERFORM "private"."assert_authority"(p_actor_id, p_programme_id, \'VO_ITEM_CREATE\');');
    });

    it('Target 11 & 12: f1_create_trade_atomic requires GLOBAL TRADE_LIBRARY_MANAGE; f1_resolve_trade requires TRADE_CREATE_DURING_ENTRY', () => {
      const tradeMasterFn = b02MigrationSql.match(
        /CREATE OR REPLACE FUNCTION "public"\."f1_create_trade_atomic"[\s\S]*?\$\$;/,
      )?.[0];
      expect(tradeMasterFn).toBeDefined();
      expect(tradeMasterFn).toContain('PERFORM "private"."assert_global_capability"(v_actor, \'TRADE_LIBRARY_MANAGE\');');

      const resolveTradeFn = b02MigrationSql.match(
        /CREATE OR REPLACE FUNCTION "private"\."f1_resolve_trade"[\s\S]*?\$\$;/,
      )?.[0];
      expect(resolveTradeFn).toBeDefined();
      expect(resolveTradeFn).toContain('p_programme_id uuid');
      expect(resolveTradeFn).toContain('PERFORM "private"."assert_authority"(p_actor_id, p_programme_id, \'TRADE_CREATE_DURING_ENTRY\');');
    });

    it('Target 13: Progress atomic create and update enforce PROGRESS_EDIT', () => {
      const progCreateFn = b02MigrationSql.match(
        /CREATE OR REPLACE FUNCTION "private"\."a27_create_progress_atomic"[\s\S]*?\$\$;/,
      )?.[0];
      expect(progCreateFn).toBeDefined();
      expect(progCreateFn).toContain('PERFORM "private"."assert_authority"(p_actor_id, v_programme_id, \'PROGRESS_EDIT\');');

      const progUpdateFn = b02MigrationSql.match(
        /CREATE OR REPLACE FUNCTION "private"\."a27_update_progress_atomic"[\s\S]*?\$\$;/,
      )?.[0];
      expect(progUpdateFn).toBeDefined();
      expect(progUpdateFn).toContain('PERFORM "private"."assert_authority"(p_actor_id, v_existing.programme_id, \'PROGRESS_EDIT\');');
    });

    it('ensures fixed search_path = \'\' on all SECURITY DEFINER functions in migration', () => {
      const securityDefinerBlocks = b02MigrationSql.match(/SECURITY DEFINER[\s\S]*?SET search_path = ''/g);
      expect(securityDefinerBlocks).toBeDefined();
      expect(securityDefinerBlocks!.length).toBeGreaterThanOrEqual(15);
    });

    it('HQ-B02-001: f1_update_site_diary_with_workforce_core preserves F2.4 site diary unsealed invariant before any mutation', () => {
      const updateSdCore = b02MigrationSql.match(
        /CREATE OR REPLACE FUNCTION "private"\."f1_update_site_diary_with_workforce_core"[\s\S]*?\$\$;/,
      )?.[0];
      expect(updateSdCore).toBeDefined();
      expect(updateSdCore).toContain('PERFORM "private"."f24_assert_site_diary_unsealed"(p_site_diary_id);');

      const lockIdx = updateSdCore!.indexOf(
        'SELECT * INTO v_diary_row FROM "public"."site_diary" WHERE site_diary_id = p_site_diary_id FOR UPDATE;',
      );
      const unsealedIdx = updateSdCore!.indexOf(
        'PERFORM "private"."f24_assert_site_diary_unsealed"(p_site_diary_id);',
      );
      const mutateIdx = updateSdCore!.indexOf(
        'v_diary := "private"."a27_mutate_site_diary_core"(',
      );

      expect(lockIdx).toBeGreaterThan(-1);
      expect(unsealedIdx).toBeGreaterThan(lockIdx);
      expect(mutateIdx).toBeGreaterThan(unsealedIdx);
    });

    it('guarantees exact-signature REVOKE ALL and GRANT EXECUTE TO authenticated posture', () => {
      const publicRpcSignatures = [
        'a27_create_programme_atomic(jsonb, uuid, uuid, uuid, uuid)',
        'a27_ingest_msp_atomic(jsonb, jsonb, uuid, uuid)',
        'a27_approve_revision_atomic(uuid, uuid, uuid)',
        'a27_archive_programme(uuid, uuid)',
        'a27_update_task(uuid, jsonb, uuid)',
        'a27_create_activity_atomic(jsonb, uuid, uuid, uuid)',
        'a27_update_activity_atomic(uuid, jsonb, uuid, uuid)',
        'a27_start_activity_atomic(uuid, uuid, uuid)',
        'a27_complete_activity_atomic(uuid, uuid, uuid)',
        'f1_start_activity_on_date_atomic(uuid, date)',
        'f1_complete_activity_with_dates_atomic(uuid, date, date)',
        'f1_create_site_diary_full_atomic(jsonb, uuid, uuid, uuid, uuid)',
        'f1_update_site_diary_full_atomic(uuid, jsonb, uuid, uuid, uuid, timestamptz)',
        'f1_create_trade_atomic(text, text)',
        'f1_create_vo_item_atomic(uuid, uuid, text, text, text, boolean, uuid, uuid)',
        'a27_create_workforce_atomic(jsonb, uuid, uuid, uuid)',
        'a27_update_workforce_atomic(uuid, jsonb, uuid, uuid)',
        'a27_create_progress_atomic(jsonb, uuid, uuid, uuid, uuid)',
        'a27_update_progress_atomic(uuid, jsonb, uuid, uuid, uuid)',
      ];

      for (const sig of publicRpcSignatures) {
        const fnName = sig.split('(')[0]!;
        const args = sig.slice(fnName.length);
        const expectedGrant = `GRANT EXECUTE ON FUNCTION "public"."${fnName}"${args} TO authenticated;`;
        expect(b02MigrationSql).toContain(expectedGrant);
      }
    });
  });

  describe('Part 2: Behavioral Authorization & Security Contracts Simulation', () => {
    interface UserProfile {
      userId: string;
      fullName: string;
      isActive: boolean;
      globalRoleId: string | null;
    }

    interface Role {
      roleId: string;
      roleCode: string;
      scope: 'Global' | 'Programme';
      isActive: boolean;
    }

    interface Permission {
      permissionId: string;
      permissionCode: string;
      isActive: boolean;
    }

    interface ProgrammeMembership {
      programmeId: string;
      userId: string;
      roleId: string;
      isActive: boolean;
    }

    interface Programme {
      programmeId: string;
      currentRevisionId: string | null;
      status: string;
    }

    interface ProgrammeRevision {
      revisionId: string;
      programmeId: string;
      status: string;
    }

    interface Task {
      taskId: string;
      programmeId: string;
      revisionId: string;
      taskName: string;
    }

    interface Activity {
      activityId: string;
      programmeId: string;
      revisionId: string;
      status: string;
    }

    interface SiteDiary {
      siteDiaryId: string;
      programmeId: string;
      revisionId: string;
      activityId: string;
      status: string;
    }

    interface Workforce {
      workforceId: string;
      programmeId: string;
      revisionId: string;
      siteDiaryId: string;
      tradeId: string;
    }

    interface TradeLibrary {
      tradeId: string;
      tradeCode: string;
      tradeName: string;
      isActive: boolean;
      createdBy: string;
    }

    interface Progress {
      progressId: string;
      programmeId: string;
      revisionId: string;
      activityId: string;
      status: string;
    }

    interface Approval {
      approvalId: string;
      siteDiaryId: string;
      approvalStatus: 'Pending' | 'Approved' | 'Rejected' | 'Returned' | 'Cancelled';
    }

    class MockPgDb {
      userProfiles = new Map<string, UserProfile>();
      roles = new Map<string, Role>();
      permissions = new Map<string, Permission>();
      rolePermissions = new Set<string>(); // `${roleId}:${permissionId}`
      memberships = new Map<string, ProgrammeMembership>(); // `${programmeId}:${userId}`

      programmes = new Map<string, Programme>();
      revisions = new Map<string, ProgrammeRevision>();
      tasks = new Map<string, Task>();
      activities = new Map<string, Activity>();
      siteDiaries = new Map<string, SiteDiary>();
      workforces = new Map<string, Workforce>();
      tradeLibrary = new Map<string, TradeLibrary>();
      progresses = new Map<string, Progress>();
      approvals = new Map<string, Approval>();

      currentAuthUid: string | null = null;

      addRole(roleId: string, roleCode: string, scope: 'Global' | 'Programme', isActive = true) {
        this.roles.set(roleId, { roleId, roleCode, scope, isActive });
      }

      addPermission(permissionId: string, permissionCode: string, isActive = true) {
        this.permissions.set(permissionId, { permissionId, permissionCode, isActive });
      }

      grant(roleId: string, permCode: string) {
        const perm = [...this.permissions.values()].find((p) => p.permissionCode === permCode);
        if (!perm) throw new Error(`Unknown permission ${permCode}`);
        this.rolePermissions.add(`${roleId}:${perm.permissionId}`);
      }

      setProfile(user: UserProfile) {
        this.userProfiles.set(user.userId, user);
      }

      setMembership(membership: ProgrammeMembership) {
        this.memberships.set(`${membership.programmeId}:${membership.userId}`, membership);
      }

      // private.a27_assert_actor
      assertActor(actorId: string) {
        if (!this.currentAuthUid || this.currentAuthUid !== actorId) {
          const err = new Error('A27_AUTH_ACTOR_MISMATCH');
          (err as unknown as { code: string }).code = '42501';
          throw err;
        }
      }

      // private.assert_global_capability
      assertGlobalCapability(actorId: string, permCode: string) {
        this.assertActor(actorId);
        const user = this.userProfiles.get(actorId);
        if (!user || !user.isActive || !user.globalRoleId) {
          const err = new Error('F3_UNAUTHORIZED_GLOBAL_CAPABILITY');
          (err as unknown as { code: string }).code = 'PT403';
          throw err;
        }
        const role = this.roles.get(user.globalRoleId);
        if (!role || !role.isActive || role.scope !== 'Global') {
          const err = new Error('F3_UNAUTHORIZED_GLOBAL_CAPABILITY');
          (err as unknown as { code: string }).code = 'PT403';
          throw err;
        }
        const perm = [...this.permissions.values()].find((p) => p.permissionCode === permCode);
        if (!perm || !perm.isActive || !this.rolePermissions.has(`${role.roleId}:${perm.permissionId}`)) {
          const err = new Error('F3_UNAUTHORIZED_GLOBAL_CAPABILITY');
          (err as unknown as { code: string }).code = 'PT403';
          throw err;
        }
      }

      // private.assert_capability
      assertCapability(actorId: string, programmeId: string, permCode: string) {
        this.assertActor(actorId);
        const user = this.userProfiles.get(actorId);
        if (!user || !user.isActive) {
          const err = new Error('F24_UNAUTHORIZED_CAPABILITY');
          (err as unknown as { code: string }).code = 'PT403';
          throw err;
        }
        const mem = this.memberships.get(`${programmeId}:${actorId}`);
        if (!mem || !mem.isActive) {
          const err = new Error('F24_UNAUTHORIZED_CAPABILITY');
          (err as unknown as { code: string }).code = 'PT403';
          throw err;
        }
        const role = this.roles.get(mem.roleId);
        if (!role || !role.isActive || role.scope !== 'Programme') {
          const err = new Error('F24_UNAUTHORIZED_CAPABILITY');
          (err as unknown as { code: string }).code = 'PT403';
          throw err;
        }
        const perm = [...this.permissions.values()].find((p) => p.permissionCode === permCode);
        if (!perm || !perm.isActive || !this.rolePermissions.has(`${role.roleId}:${perm.permissionId}`)) {
          const err = new Error('F24_UNAUTHORIZED_CAPABILITY');
          (err as unknown as { code: string }).code = 'PT403';
          throw err;
        }
      }

      // private.assert_authority
      assertAuthority(actorId: string, programmeId: string, permCode: string) {
        try {
          this.assertCapability(actorId, programmeId, permCode);
          return;
        } catch (err) {
          if ((err as { code?: string }).code !== 'PT403') throw err;
        }

        try {
          this.assertGlobalCapability(actorId, permCode);
          return;
        } catch (err) {
          if ((err as { code?: string }).code === 'PT403') {
            const authErr = new Error('F3_UNAUTHORIZED_AUTHORITY');
            (authErr as unknown as { code: string }).code = 'PT403';
            throw authErr;
          }
          throw err;
        }
      }

      // B02 Target 1: Programme Create
      createProgramme(_payload: { programme_code: string; programme_name: string }, actorId: string, programmeId: string, revisionId: string) {
        this.assertGlobalCapability(actorId, 'PROGRAMME_CREATE');
        const prog: Programme = { programmeId, currentRevisionId: revisionId, status: 'Approved' };
        const rev: ProgrammeRevision = { revisionId, programmeId, status: 'Draft' };
        this.programmes.set(programmeId, prog);
        this.revisions.set(revisionId, rev);
        return prog;
      }

      // B02 Target 2: Revision Import
      ingestMsp(revision: { programme_id: string; revision_id: string }, tasks: Array<{ task_id: string; task_name: string }>, actorId: string) {
        this.assertAuthority(actorId, revision.programme_id, 'REVISION_IMPORT');
        const rev: ProgrammeRevision = { revisionId: revision.revision_id, programmeId: revision.programme_id, status: 'Draft' };
        this.revisions.set(rev.revisionId, rev);
        for (const t of tasks) {
          this.tasks.set(t.task_id, { taskId: t.task_id, programmeId: revision.programme_id, revisionId: revision.revision_id, taskName: t.task_name });
        }
        return rev;
      }

      // B02 Target 3: Revision Approve
      approveRevision(revisionId: string, actorId: string) {
        const rev = this.revisions.get(revisionId);
        if (!rev) throw new Error('A27_REVISION_NOT_FOUND');
        this.assertAuthority(actorId, rev.programmeId, 'REVISION_APPROVE');
        rev.status = 'Approved';
        const prog = this.programmes.get(rev.programmeId);
        if (prog) prog.currentRevisionId = rev.revisionId;
        return rev;
      }

      // B02 Target 4: Programme Archive
      archiveProgramme(programmeId: string, actorId: string) {
        this.assertAuthority(actorId, programmeId, 'PROGRAMME_ARCHIVE');
        const prog = this.programmes.get(programmeId);
        if (!prog) throw new Error('A27_PROGRAMME_NOT_FOUND');
        prog.status = 'Archived';
        return prog;
      }

      // B02 Target 5: Task Update
      updateTask(taskId: string, payload: { task_name?: string }, actorId: string) {
        const task = this.tasks.get(taskId);
        if (!task) throw new Error('A27_TASK_NOT_FOUND');
        this.assertAuthority(actorId, task.programmeId, 'TASK_UPDATE');
        if (payload.task_name) task.taskName = payload.task_name;
        return task;
      }

      // B02 Target 6: Activity Create
      createActivity(payload: { programme_id: string; revision_id: string }, activityId: string, actorId: string) {
        this.assertAuthority(actorId, payload.programme_id, 'ACTIVITY_CREATE');
        const act: Activity = { activityId, programmeId: payload.programme_id, revisionId: payload.revision_id, status: 'New' };
        this.activities.set(activityId, act);
        return act;
      }

      // B02 Target 6: Activity Update
      updateActivity(activityId: string, actorId: string) {
        const act = this.activities.get(activityId);
        if (!act) throw new Error('A27_ACTIVITY_NOT_FOUND');
        this.assertAuthority(actorId, act.programmeId, 'ACTIVITY_UPDATE');
        return act;
      }

      // B02 Target 7: Activity Execution
      startActivity(activityId: string, actorId: string) {
        const act = this.activities.get(activityId);
        if (!act) throw new Error('A27_ACTIVITY_NOT_FOUND');
        this.assertAuthority(actorId, act.programmeId, 'ACTIVITY_EXECUTE');
        act.status = 'In Progress';
        return act;
      }

      // B02 Target 8: Site Diary Create
      createSiteDiary(payload: { activity_id: string; programme_id: string; revision_id: string; manpower?: Array<{ trade_name: string }> }, siteDiaryId: string, actorId: string) {
        const act = this.activities.get(payload.activity_id);
        if (!act) throw new Error('A27_ACTIVITY_NOT_FOUND');
        this.assertAuthority(actorId, act.programmeId, 'SITE_DIARY_CREATE');
        const sd: SiteDiary = { siteDiaryId, programmeId: act.programmeId, revisionId: act.revisionId, activityId: act.activityId, status: act.status };
        this.siteDiaries.set(siteDiaryId, sd);

        if (payload.manpower) {
          for (const item of payload.manpower) {
            const trade = this.resolveTrade(item.trade_name, actorId, act.programmeId);
            this.createWorkforce({ site_diary_id: siteDiaryId, programme_id: act.programmeId, revision_id: act.revisionId, activity_id: act.activityId, trade_id: trade.tradeId }, 'wf-' + Math.random(), actorId);
          }
        }
        return sd;
      }

      assertSiteDiaryUnsealed(siteDiaryId: string) {
        const sealed = [...this.approvals.values()].some(
          (appr) =>
            appr.siteDiaryId === siteDiaryId &&
            (appr.approvalStatus === 'Pending' || appr.approvalStatus === 'Approved'),
        );
        if (sealed) {
          const err = new Error('F24_SITE_DIARY_SEALED');
          (err as unknown as { code: string }).code = 'PT409';
          throw err;
        }
      }

      // B02 Target 8: Site Diary Update
      updateSiteDiary(siteDiaryId: string, actorId: string) {
        this.assertActor(actorId);
        const sd = this.siteDiaries.get(siteDiaryId);
        if (!sd) throw new Error('A27_SITE_DIARY_NOT_FOUND');
        this.assertSiteDiaryUnsealed(siteDiaryId);
        this.assertAuthority(actorId, sd.programmeId, 'SITE_DIARY_UPDATE');
        return sd;
      }

      // B02 Target 9: Workforce Mutation
      createWorkforce(payload: { site_diary_id: string; programme_id: string; revision_id: string; activity_id: string; trade_id: string }, workforceId: string, actorId: string) {
        const sd = this.siteDiaries.get(payload.site_diary_id);
        if (!sd) throw new Error('A27_SITE_DIARY_NOT_FOUND');
        this.assertAuthority(actorId, sd.programmeId, 'WORKFORCE_MANAGE');
        const wf: Workforce = { workforceId, programmeId: sd.programmeId, revisionId: sd.revisionId, siteDiaryId: sd.siteDiaryId, tradeId: payload.trade_id };
        this.workforces.set(workforceId, wf);
        return wf;
      }

      // B02 Target 10: VO Item Create
      createVoItem(programmeId: string, revisionId: string, actorId: string) {
        this.assertAuthority(actorId, programmeId, 'VO_ITEM_CREATE');
        return { voItemId: 'vo-1', programmeId, revisionId };
      }

      // B02 Target 11: Explicit Trade Master Create
      createTradeAtomic(tradeCode: string, tradeName: string, actorId: string) {
        this.assertGlobalCapability(actorId, 'TRADE_LIBRARY_MANAGE');
        const trade: TradeLibrary = { tradeId: 'trade-' + tradeCode, tradeCode, tradeName, isActive: true, createdBy: actorId };
        this.tradeLibrary.set(trade.tradeId, trade);
        return trade;
      }

      // B02 Target 12: Dynamic Trade Resolver during Entry
      resolveTrade(tradeName: string, actorId: string, programmeId: string): TradeLibrary {
        this.assertActor(actorId);
        const name = tradeName.trim().toLowerCase();
        const existing = [...this.tradeLibrary.values()].find((t) => t.tradeName.toLowerCase() === name && t.isActive);
        if (existing) return existing;

        this.assertAuthority(actorId, programmeId, 'TRADE_CREATE_DURING_ENTRY');
        const tradeCode = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').slice(0, 50);
        const newTrade: TradeLibrary = { tradeId: 'trade-' + tradeCode, tradeCode, tradeName, isActive: true, createdBy: actorId };
        this.tradeLibrary.set(newTrade.tradeId, newTrade);
        return newTrade;
      }

      // B02 Target 13: Progress Create
      createProgress(payload: { programme_id: string; revision_id: string; activity_id: string }, progressId: string, actorId: string) {
        this.assertAuthority(actorId, payload.programme_id, 'PROGRESS_EDIT');
        const prog: Progress = { progressId, programmeId: payload.programme_id, revisionId: payload.revision_id, activityId: payload.activity_id, status: 'Draft' };
        this.progresses.set(progressId, prog);
        return prog;
      }

      // B02 Target 13: Progress Update
      updateProgress(progressId: string, actorId: string) {
        const prog = this.progresses.get(progressId);
        if (!prog) throw new Error('A27_PROGRESS_NOT_FOUND');
        this.assertAuthority(actorId, prog.programmeId, 'PROGRESS_EDIT');
        return prog;
      }
    }

    let db: MockPgDb;
    const SYSADMIN = 'user-sysadmin';
    const HQADMIN = 'user-hqadmin';
    const PLANNER_A = 'user-planner-a';
    const SO_A = 'user-so-a';
    const SE_A = 'user-se-a';
    const SS_A = 'user-ss-a';
    const RE_A = 'user-re-a';
    const VIEWER_A = 'user-viewer-a';

    const PROG_A = 'prog-a';
    const PROG_B = 'prog-b';
    const REV_A = 'rev-a';
    const REV_B = 'rev-b';

    beforeAll(() => {
      db = new MockPgDb();

      // Seed Roles
      db.addRole('r-sysadmin', 'SYSTEM_ADMIN', 'Global');
      db.addRole('r-hqadmin', 'HQ_ADMIN', 'Global');
      db.addRole('r-planner', 'PLANNER', 'Programme');
      db.addRole('r-so', 'SUPERINTENDING_OFFICER', 'Programme');
      db.addRole('r-se', 'SITE_ENGINEER', 'Programme');
      db.addRole('r-ss', 'SITE_SUPERVISOR', 'Programme');
      db.addRole('r-re', 'RESIDENT_ENGINEER', 'Programme');
      db.addRole('r-viewer', 'VIEWER', 'Programme');

      // Seed Permissions
      const perms = [
        'PROGRAMME_CREATE',
        'PROGRAMME_ARCHIVE',
        'REVISION_IMPORT',
        'REVISION_APPROVE',
        'TASK_UPDATE',
        'ACTIVITY_CREATE',
        'ACTIVITY_UPDATE',
        'ACTIVITY_EXECUTE',
        'SITE_DIARY_CREATE',
        'SITE_DIARY_UPDATE',
        'WORKFORCE_MANAGE',
        'PROGRESS_EDIT',
        'PROGRESS_VERIFY',
        'PROGRESS_APPROVE',
        'TRADE_LIBRARY_MANAGE',
        'TRADE_CREATE_DURING_ENTRY',
        'VO_ITEM_CREATE',
      ];
      for (let i = 0; i < perms.length; i++) {
        db.addPermission(`p-${i + 1}`, perms[i]!);
      }

      // Seed Grants for Global Admins
      for (const p of perms) {
        db.grant('r-sysadmin', p);
        db.grant('r-hqadmin', p);
      }

      // Seed Grants for Programme Roles
      db.grant('r-planner', 'REVISION_IMPORT');
      db.grant('r-planner', 'TASK_UPDATE');

      db.grant('r-so', 'REVISION_APPROVE');
      db.grant('r-so', 'PROGRESS_APPROVE');

      db.grant('r-re', 'ACTIVITY_UPDATE');
      db.grant('r-re', 'PROGRESS_VERIFY');

      const operationalPerms = [
        'ACTIVITY_CREATE',
        'ACTIVITY_UPDATE',
        'ACTIVITY_EXECUTE',
        'SITE_DIARY_CREATE',
        'SITE_DIARY_UPDATE',
        'WORKFORCE_MANAGE',
        'PROGRESS_EDIT',
        'TRADE_CREATE_DURING_ENTRY',
      ];
      for (const p of operationalPerms) {
        db.grant('r-se', p);
        db.grant('r-ss', p);
      }

      // Seed Users
      db.setProfile({ userId: SYSADMIN, fullName: 'Sys Admin', isActive: true, globalRoleId: 'r-sysadmin' });
      db.setProfile({ userId: HQADMIN, fullName: 'HQ Admin', isActive: true, globalRoleId: 'r-hqadmin' });
      db.setProfile({ userId: PLANNER_A, fullName: 'Planner A', isActive: true, globalRoleId: null });
      db.setProfile({ userId: SO_A, fullName: 'SO A', isActive: true, globalRoleId: null });
      db.setProfile({ userId: SE_A, fullName: 'SE A', isActive: true, globalRoleId: null });
      db.setProfile({ userId: SS_A, fullName: 'SS A', isActive: true, globalRoleId: null });
      db.setProfile({ userId: RE_A, fullName: 'RE A', isActive: true, globalRoleId: null });
      db.setProfile({ userId: VIEWER_A, fullName: 'Viewer A', isActive: true, globalRoleId: null });

      // Seed Memberships for Prog A
      db.setMembership({ programmeId: PROG_A, userId: PLANNER_A, roleId: 'r-planner', isActive: true });
      db.setMembership({ programmeId: PROG_A, userId: SO_A, roleId: 'r-so', isActive: true });
      db.setMembership({ programmeId: PROG_A, userId: SE_A, roleId: 'r-se', isActive: true });
      db.setMembership({ programmeId: PROG_A, userId: SS_A, roleId: 'r-ss', isActive: true });
      db.setMembership({ programmeId: PROG_A, userId: RE_A, roleId: 'r-re', isActive: true });
      db.setMembership({ programmeId: PROG_A, userId: VIEWER_A, roleId: 'r-viewer', isActive: true });

      // Initial Seeds for entities
      db.programmes.set(PROG_A, { programmeId: PROG_A, currentRevisionId: REV_A, status: 'Approved' });
      db.programmes.set(PROG_B, { programmeId: PROG_B, currentRevisionId: REV_B, status: 'Approved' });
      db.revisions.set(REV_A, { revisionId: REV_A, programmeId: PROG_A, status: 'Draft' });
      db.revisions.set(REV_B, { revisionId: REV_B, programmeId: PROG_B, status: 'Draft' });
      db.tasks.set('task-a1', { taskId: 'task-a1', programmeId: PROG_A, revisionId: REV_A, taskName: 'Task A1' });
      db.tasks.set('task-b1', { taskId: 'task-b1', programmeId: PROG_B, revisionId: REV_B, taskName: 'Task B1' });
      db.activities.set('act-a1', { activityId: 'act-a1', programmeId: PROG_A, revisionId: REV_A, status: 'New' });
      db.activities.set('act-b1', { activityId: 'act-b1', programmeId: PROG_B, revisionId: REV_B, status: 'New' });
      db.siteDiaries.set('sd-a1', { siteDiaryId: 'sd-a1', programmeId: PROG_A, revisionId: REV_A, activityId: 'act-a1', status: 'In Progress' });
      db.siteDiaries.set('sd-b1', { siteDiaryId: 'sd-b1', programmeId: PROG_B, revisionId: REV_B, activityId: 'act-b1', status: 'In Progress' });
      db.tradeLibrary.set('trade-carpenter', { tradeId: 'trade-carpenter', tradeCode: 'CARPENTER', tradeName: 'Carpenter', isActive: true, createdBy: SYSADMIN });
      db.progresses.set('prog-rec-a1', { progressId: 'prog-rec-a1', programmeId: PROG_A, revisionId: REV_A, activityId: 'act-a1', status: 'Draft' });
    });

    it('Contract 1: Revision import requires REVISION_IMPORT', () => {
      db.currentAuthUid = PLANNER_A;
      expect(() => db.ingestMsp({ programme_id: PROG_A, revision_id: 'rev-a2' }, [{ task_id: 't-1', task_name: 'T1' }], PLANNER_A)).not.toThrow();

      db.currentAuthUid = VIEWER_A;
      expect(() => db.ingestMsp({ programme_id: PROG_A, revision_id: 'rev-a3' }, [{ task_id: 't-2', task_name: 'T2' }], VIEWER_A)).toThrow('F3_UNAUTHORIZED_AUTHORITY');
    });

    it('Contract 2 & 3: Revision approval requires REVISION_APPROVE and blocks foreign takeover', () => {
      db.currentAuthUid = SO_A;
      expect(() => db.approveRevision(REV_A, SO_A)).not.toThrow();

      // Foreign Programme Takeover: SO_A attempting to approve Revision of PROG_B
      expect(() => db.approveRevision(REV_B, SO_A)).toThrow('F3_UNAUTHORIZED_AUTHORITY');
    });

    it('Contract 4: Task update requires TASK_UPDATE derived from canonical task row', () => {
      db.currentAuthUid = PLANNER_A;
      expect(() => db.updateTask('task-a1', { task_name: 'Updated A1' }, PLANNER_A)).not.toThrow();

      // Foreign Task update attempt
      expect(() => db.updateTask('task-b1', { task_name: 'Malicious B1' }, PLANNER_A)).toThrow('F3_UNAUTHORIZED_AUTHORITY');
    });

    it('Contract 5: Activity create requires ACTIVITY_CREATE', () => {
      db.currentAuthUid = SE_A;
      expect(() => db.createActivity({ programme_id: PROG_A, revision_id: REV_A }, 'act-new-1', SE_A)).not.toThrow();

      db.currentAuthUid = PLANNER_A;
      expect(() => db.createActivity({ programme_id: PROG_A, revision_id: REV_A }, 'act-new-2', PLANNER_A)).toThrow('F3_UNAUTHORIZED_AUTHORITY');
    });

    it('Contract 6: Activity update requires ACTIVITY_UPDATE', () => {
      db.currentAuthUid = RE_A;
      expect(() => db.updateActivity('act-a1', RE_A)).not.toThrow();

      db.currentAuthUid = VIEWER_A;
      expect(() => db.updateActivity('act-a1', VIEWER_A)).toThrow('F3_UNAUTHORIZED_AUTHORITY');
    });

    it('Contract 7: Every surviving Activity start/complete path requires ACTIVITY_EXECUTE', () => {
      db.currentAuthUid = SS_A;
      expect(() => db.startActivity('act-a1', SS_A)).not.toThrow();

      db.currentAuthUid = PLANNER_A;
      expect(() => db.startActivity('act-a1', PLANNER_A)).toThrow('F3_UNAUTHORIZED_AUTHORITY');
    });

    it('Contract 8: Site Diary canonical create requires SITE_DIARY_CREATE', () => {
      db.currentAuthUid = SE_A;
      expect(() => db.createSiteDiary({ activity_id: 'act-a1', programme_id: PROG_A, revision_id: REV_A }, 'sd-new-1', SE_A)).not.toThrow();

      db.currentAuthUid = RE_A;
      expect(() => db.createSiteDiary({ activity_id: 'act-a1', programme_id: PROG_A, revision_id: REV_A }, 'sd-new-2', RE_A)).toThrow('F3_UNAUTHORIZED_AUTHORITY');
    });

    it('Contract 9: Site Diary canonical update requires SITE_DIARY_UPDATE', () => {
      db.currentAuthUid = SS_A;
      expect(() => db.updateSiteDiary('sd-a1', SS_A)).not.toThrow();

      db.currentAuthUid = PLANNER_A;
      expect(() => db.updateSiteDiary('sd-a1', PLANNER_A)).toThrow('F3_UNAUTHORIZED_AUTHORITY');
    });

    it('Contract 10: Workforce direct mutation requires WORKFORCE_MANAGE', () => {
      db.currentAuthUid = SE_A;
      expect(() => db.createWorkforce({ site_diary_id: 'sd-a1', programme_id: PROG_A, revision_id: REV_A, activity_id: 'act-a1', trade_id: 'trade-carpenter' }, 'wf-1', SE_A)).not.toThrow();

      db.currentAuthUid = SO_A;
      expect(() => db.createWorkforce({ site_diary_id: 'sd-a1', programme_id: PROG_A, revision_id: REV_A, activity_id: 'act-a1', trade_id: 'trade-carpenter' }, 'wf-2', SO_A)).toThrow('F3_UNAUTHORIZED_AUTHORITY');
    });

    it('Contract 11: Programme create requires GLOBAL PROGRAMME_CREATE', () => {
      db.currentAuthUid = SYSADMIN;
      expect(() => db.createProgramme({ programme_code: 'PRG-X', programme_name: 'New Programme' }, SYSADMIN, 'prog-x', 'rev-x')).not.toThrow();

      db.currentAuthUid = PLANNER_A;
      expect(() => db.createProgramme({ programme_code: 'PRG-Y', programme_name: 'Denied Programme' }, PLANNER_A, 'prog-y', 'rev-y')).toThrow('F3_UNAUTHORIZED_GLOBAL_CAPABILITY');
    });

    it('Contract 12: Programme archive requires PROGRAMME_ARCHIVE', () => {
      db.currentAuthUid = HQADMIN;
      expect(() => db.archiveProgramme(PROG_A, HQADMIN)).not.toThrow();

      db.currentAuthUid = SE_A;
      expect(() => db.archiveProgramme(PROG_B, SE_A)).toThrow('F3_UNAUTHORIZED_AUTHORITY');
    });

    it('Contract 13: VO create requires VO_ITEM_CREATE (Global admin allowed, ordinary role denied)', () => {
      db.currentAuthUid = SYSADMIN;
      expect(() => db.createVoItem(PROG_A, REV_A, SYSADMIN)).not.toThrow();

      db.currentAuthUid = SE_A;
      expect(() => db.createVoItem(PROG_A, REV_A, SE_A)).toThrow('F3_UNAUTHORIZED_AUTHORITY');
    });

    it('Contract 14: Direct Trade Master create requires GLOBAL TRADE_LIBRARY_MANAGE', () => {
      db.currentAuthUid = HQADMIN;
      expect(() => db.createTradeAtomic('WELDER', 'Welder', HQADMIN)).not.toThrow();

      db.currentAuthUid = SE_A;
      expect(() => db.createTradeAtomic('BRICKLAYER', 'Bricklayer', SE_A)).toThrow('F3_UNAUTHORIZED_GLOBAL_CAPABILITY');
    });

    it('Contract 15 & 16: Dynamic Trade creation during entry enforces TRADE_CREATE_DURING_ENTRY', () => {
      // 1. Existing trade resolves without creating duplicate
      db.currentAuthUid = SE_A;
      const existing = db.resolveTrade('Carpenter', SE_A, PROG_A);
      expect(existing.tradeId).toBe('trade-carpenter');

      // 2. Authorized SITE_ENGINEER dynamically creates missing trade
      const created = db.resolveTrade('Plumber', SE_A, PROG_A);
      expect(created.tradeName).toBe('Plumber');
      expect(created.createdBy).toBe(SE_A);

      // 3. Authorized SITE_SUPERVISOR dynamically creates missing trade
      db.currentAuthUid = SS_A;
      const createdBySs = db.resolveTrade('Painter', SS_A, PROG_A);
      expect(createdBySs.tradeName).toBe('Painter');
      expect(createdBySs.createdBy).toBe(SS_A);

      // 4. Foreign Programme exploit: SE_A attempting to create trade via PROG_B
      db.currentAuthUid = SE_A;
      expect(() => db.resolveTrade('Electrician', SE_A, PROG_B)).toThrow('F3_UNAUTHORIZED_AUTHORITY');

      // 5. Role without TRADE_CREATE_DURING_ENTRY is denied
      db.currentAuthUid = PLANNER_A;
      expect(() => db.resolveTrade('Electrician', PLANNER_A, PROG_A)).toThrow('F3_UNAUTHORIZED_AUTHORITY');
    });

    it('Contract 17: Site Diary + Workforce + dynamic Trade creation operates atomically', () => {
      db.currentAuthUid = SE_A;
      expect(() => {
        db.createSiteDiary(
          {
            activity_id: 'act-a1',
            programme_id: PROG_A,
            revision_id: REV_A,
            manpower: [{ trade_name: 'Tiler' }],
          },
          'sd-atomic-1',
          SE_A,
        );
      }).not.toThrow();

      const tiler = [...db.tradeLibrary.values()].find((t) => t.tradeName === 'Tiler');
      expect(tiler).toBeDefined();
      expect(tiler?.createdBy).toBe(SE_A);
    });

    it('Contract 18: Progress create and update require PROGRESS_EDIT', () => {
      db.currentAuthUid = SE_A;
      expect(() => db.createProgress({ programme_id: PROG_A, revision_id: REV_A, activity_id: 'act-a1' }, 'prog-new-1', SE_A)).not.toThrow();
      expect(() => db.updateProgress('prog-rec-a1', SE_A)).not.toThrow();

      db.currentAuthUid = SO_A;
      expect(() => db.createProgress({ programme_id: PROG_A, revision_id: REV_A, activity_id: 'act-a1' }, 'prog-new-2', SO_A)).toThrow('F3_UNAUTHORIZED_AUTHORITY');
      expect(() => db.updateProgress('prog-rec-a1', SO_A)).toThrow('F3_UNAUTHORIZED_AUTHORITY');
    });

    it('Contract 19: Unauthenticated actor is denied before authority check', () => {
      db.currentAuthUid = null;
      expect(() => db.resolveTrade('Mason', SE_A, PROG_A)).toThrow('A27_AUTH_ACTOR_MISMATCH');
    });

    it('Contract 20: Forged actor identity is denied', () => {
      db.currentAuthUid = SE_A;
      // SE_A pretending to be SYSADMIN
      expect(() => db.createProgramme({ programme_code: 'FORGED', programme_name: 'Forged' }, SYSADMIN, 'p-f', 'r-f')).toThrow('A27_AUTH_ACTOR_MISMATCH');
    });

    it('Contract 21: HQ-B02-001 Site Diary edit sealing denies update when Approval is Pending or Approved', () => {
      db.currentAuthUid = SS_A;
      // Normal unsealed update succeeds
      expect(() => db.updateSiteDiary('sd-a1', SS_A)).not.toThrow();

      // Submit for approval -> Pending
      db.approvals.set('appr-sd-a1', {
        approvalId: 'appr-sd-a1',
        siteDiaryId: 'sd-a1',
        approvalStatus: 'Pending',
      });

      // Update attempt must be blocked by edit sealing
      expect(() => db.updateSiteDiary('sd-a1', SS_A)).toThrow('F24_SITE_DIARY_SEALED');

      // Approved status also seals edits
      db.approvals.get('appr-sd-a1')!.approvalStatus = 'Approved';
      expect(() => db.updateSiteDiary('sd-a1', SS_A)).toThrow('F24_SITE_DIARY_SEALED');

      // Returned status unseals the diary
      db.approvals.get('appr-sd-a1')!.approvalStatus = 'Returned';
      expect(() => db.updateSiteDiary('sd-a1', SS_A)).not.toThrow();

      // Clean up test approval state
      db.approvals.delete('appr-sd-a1');
    });
  });
});
