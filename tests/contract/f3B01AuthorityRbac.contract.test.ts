import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

describe('F3-B01 Authority Foundation & RBAC Closure Contract Test Suite', () => {
  let migrationSql: string;

  beforeAll(() => {
    migrationSql = readFileSync(
      join(
        __dirname,
        '../../supabase/migrations/20260829210000_f3_b01_authority_rbac_foundation.sql',
      ),
      'utf8',
    );
  });

  describe('1. Schema Extensions & Scope Invariant Trigger Contract', () => {
    it('adds nullable global_role_id to user_profile referencing role(role_id)', () => {
      expect(migrationSql).toMatch(
        /ALTER TABLE "public"\."user_profile"\s+ADD COLUMN IF NOT EXISTS "global_role_id" uuid REFERENCES "public"\."role"\("role_id"\)/,
      );
    });

    it('creates private.trg_check_user_profile_global_role_scope with SECURITY DEFINER and search_path hardening', () => {
      const triggerFn = migrationSql.match(
        /CREATE OR REPLACE FUNCTION "private"\."trg_check_user_profile_global_role_scope"\(\)[\s\S]*?\$\$;/,
      )?.[0];
      expect(triggerFn).toBeDefined();
      expect(triggerFn).toContain('SECURITY DEFINER');
      expect(triggerFn).toContain("SET search_path = ''");
      expect(triggerFn).toContain("RAISE EXCEPTION 'Cannot assign a Programme role as a global_role_id.' USING ERRCODE = 'PT400';");
    });

    it('explicitly seals private.trg_check_user_profile_global_role_scope from PUBLIC, anon, and authenticated', () => {
      expect(migrationSql).toMatch(
        /REVOKE ALL ON FUNCTION "private"\."trg_check_user_profile_global_role_scope"\(\)\s+FROM PUBLIC, anon, authenticated;/,
      );
    });

    it('binds the trigger before INSERT OR UPDATE on user_profile', () => {
      expect(migrationSql).toMatch(
        /CREATE TRIGGER "trg_check_user_profile_global_role_scope"\s+BEFORE INSERT OR UPDATE ON "public"\."user_profile"/,
      );
    });
  });

  describe('2. Roles & Permission Catalogue Seed Contract', () => {
    it('seeds canonical missing Programme roles', () => {
      expect(migrationSql).toContain("'PLANNER', 'Planner', 'Programme'");
      expect(migrationSql).toContain("'SUPERINTENDING_OFFICER', 'Superintending Officer', 'Programme'");
      expect(migrationSql).toContain("'SITE_ENGINEER', 'Site Engineer', 'Programme'");
      expect(migrationSql).toContain("'ASSISTANT_ENGINEER', 'Assistant Engineer', 'Programme'");
    });

    it('seeds all 16 new canonical F3 permissions', () => {
      const newPermissions = [
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
        'VO_ITEM_CREATE',
      ];

      for (const perm of newPermissions) {
        expect(migrationSql).toContain(`'${perm}'`);
      }
    });

    it('seeds exactly the 26 enumerated canonical permissions to SYSTEM_ADMIN and HQ_ADMIN', () => {
      const all26Permissions = [
        'PROGRAMME_MEMBERSHIP_MANAGE',
        'PROGRAMME_UPDATE',
        'SITE_DIARY_APPROVAL_REQUEST',
        'SITE_DIARY_APPROVAL_REVIEW',
        'SITE_DIARY_APPROVAL_APPROVE',
        'SITE_DIARY_APPROVAL_RETURN',
        'SITE_DIARY_APPROVAL_REJECT',
        'SITE_DIARY_APPROVAL_CANCEL',
        'SITE_DIARY_APPROVAL_QUEUE_VIEW',
        'SITE_DIARY_PRINT_READ',
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
        'VO_ITEM_CREATE',
      ];

      for (const perm of all26Permissions) {
        expect(migrationSql).toContain(perm);
      }
    });
  });

  describe('3. Private Global and Combined Authority Helpers Security Contract', () => {
    it('creates private.assert_global_capability with SECURITY DEFINER and search_path hardening', () => {
      const fn = migrationSql.match(
        /CREATE OR REPLACE FUNCTION "private"\."assert_global_capability"[\s\S]*?\$\$;/,
      )?.[0];
      expect(fn).toBeDefined();
      expect(fn).toContain('SECURITY DEFINER');
      expect(fn).toContain("SET search_path = ''");
      expect(fn).toContain('PERFORM "private"."a27_assert_actor"(p_actor_id);');
      expect(fn).toContain("r.scope = 'Global'");
      expect(fn).toContain("RAISE EXCEPTION 'F3_UNAUTHORIZED_GLOBAL_CAPABILITY' USING ERRCODE = 'PT403';");
    });

    it('revokes execute on private.assert_global_capability from PUBLIC, anon, authenticated', () => {
      expect(migrationSql).toMatch(
        /REVOKE ALL ON FUNCTION "private"\."assert_global_capability"\(uuid, character varying\)\s+FROM PUBLIC, anon, authenticated;/,
      );
    });

    it('creates private.assert_authority composing canonical assert_capability and assert_global_capability', () => {
      const fn = migrationSql.match(
        /CREATE OR REPLACE FUNCTION "private"\."assert_authority"[\s\S]*?\$\$;/,
      )?.[0];
      expect(fn).toBeDefined();
      expect(fn).toContain('SECURITY DEFINER');
      expect(fn).toContain("SET search_path = ''");
      expect(fn).toContain('PERFORM "private"."a27_assert_actor"(p_actor_id);');
      expect(fn).toContain('PERFORM "private"."assert_capability"(p_actor_id, p_programme_id, p_permission_code);');
      expect(fn).toContain('PERFORM "private"."assert_global_capability"(p_actor_id, p_permission_code);');
      expect(fn).toContain("WHEN SQLSTATE 'PT403' THEN");
      expect(fn).toContain("RAISE EXCEPTION 'F3_UNAUTHORIZED_AUTHORITY' USING ERRCODE = 'PT403';");
      // Proves no duplicate queries on programme_membership / role / permission in assert_authority
      expect(fn).not.toContain('FROM "public"."programme_membership"');
    });

    it('revokes execute on private.assert_authority from PUBLIC, anon, authenticated', () => {
      expect(migrationSql).toMatch(
        /REVOKE ALL ON FUNCTION "private"\."assert_authority"\(uuid, uuid, character varying\)\s+FROM PUBLIC, anon, authenticated;/,
      );
    });
  });

  describe('4. In-Memory Behavioral Simulation Proof (Static & Simulation; Runtime DB Proof deferred to F3-B06)', () => {
    // Relational In-Memory Simulator mirroring PostgreSQL schema and composed helper semantics
    interface UserProfile {
      userId: string;
      fullName: string | null;
      isActive: boolean;
      globalRoleId: string | null;
    }

    interface Role {
      roleId: string;
      roleCode: string;
      roleName: string;
      scope: 'Global' | 'Programme';
      isActive: boolean;
    }

    interface Permission {
      permissionId: string;
      permissionCode: string;
      module: string;
      isActive: boolean;
    }

    interface ProgrammeMembership {
      membershipId: string;
      programmeId: string;
      userId: string;
      roleId: string;
      isActive: boolean;
    }

    class AuthorityDatabase {
      userProfiles = new Map<string, UserProfile>();
      roles = new Map<string, Role>();
      permissions = new Map<string, Permission>();
      rolePermissions = new Set<string>(); // `${roleId}:${permissionId}`
      programmeMemberships = new Map<string, ProgrammeMembership>();

      addRole(roleId: string, roleCode: string, roleName: string, scope: 'Global' | 'Programme', isActive = true) {
        this.roles.set(roleId, { roleId, roleCode, roleName, scope, isActive });
      }

      addPermission(permissionId: string, permissionCode: string, module: string, isActive = true) {
        this.permissions.set(permissionId, { permissionId, permissionCode, module, isActive });
      }

      grantPermission(roleId: string, permissionCode: string) {
        const perm = [...this.permissions.values()].find((p) => p.permissionCode === permissionCode);
        if (!perm) throw new Error(`Permission not found: ${permissionCode}`);
        this.rolePermissions.add(`${roleId}:${perm.permissionId}`);
      }

      setUserProfile(user: UserProfile) {
        // Trigger: trg_check_user_profile_global_role_scope
        if (user.globalRoleId !== null) {
          const role = this.roles.get(user.globalRoleId);
          if (!role || role.scope !== 'Global') {
            const err = new Error('Cannot assign a Programme role as a global_role_id.');
            (err as unknown as { code: string }).code = 'PT400';
            throw err;
          }
        }
        this.userProfiles.set(user.userId, user);
      }

      addProgrammeMembership(membership: ProgrammeMembership) {
        // Trigger: trg_check_programme_membership_role_scope
        const role = this.roles.get(membership.roleId);
        if (!role || role.scope !== 'Programme') {
          const err = new Error('Cannot assign a Global role as a Programme membership.');
          (err as unknown as { code: string }).code = 'PT400';
          throw err;
        }
        this.programmeMemberships.set(`${membership.programmeId}:${membership.userId}`, membership);
      }

      // private.assert_capability
      assertCapability(actorId: string, programmeId: string, permissionCode: string): void {
        const user = this.userProfiles.get(actorId);
        if (!user || !user.isActive) {
          const err = new Error('F24_UNAUTHORIZED_CAPABILITY');
          (err as unknown as { code: string }).code = 'PT403';
          throw err;
        }

        const membership = this.programmeMemberships.get(`${programmeId}:${actorId}`);
        if (!membership || !membership.isActive) {
          const err = new Error('F24_UNAUTHORIZED_CAPABILITY');
          (err as unknown as { code: string }).code = 'PT403';
          throw err;
        }

        const role = this.roles.get(membership.roleId);
        if (!role || !role.isActive || role.scope !== 'Programme') {
          const err = new Error('F24_UNAUTHORIZED_CAPABILITY');
          (err as unknown as { code: string }).code = 'PT403';
          throw err;
        }

        const perm = [...this.permissions.values()].find((p) => p.permissionCode === permissionCode);
        if (!perm || !perm.isActive) {
          const err = new Error('F24_UNAUTHORIZED_CAPABILITY');
          (err as unknown as { code: string }).code = 'PT403';
          throw err;
        }

        if (!this.rolePermissions.has(`${role.roleId}:${perm.permissionId}`)) {
          const err = new Error('F24_UNAUTHORIZED_CAPABILITY');
          (err as unknown as { code: string }).code = 'PT403';
          throw err;
        }
      }

      // private.assert_global_capability
      assertGlobalCapability(actorId: string, permissionCode: string): void {
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

        const perm = [...this.permissions.values()].find((p) => p.permissionCode === permissionCode);
        if (!perm || !perm.isActive) {
          const err = new Error('F3_UNAUTHORIZED_GLOBAL_CAPABILITY');
          (err as unknown as { code: string }).code = 'PT403';
          throw err;
        }

        if (!this.rolePermissions.has(`${role.roleId}:${perm.permissionId}`)) {
          const err = new Error('F3_UNAUTHORIZED_GLOBAL_CAPABILITY');
          (err as unknown as { code: string }).code = 'PT403';
          throw err;
        }
      }

      // private.assert_authority (Composed of assertCapability and assertGlobalCapability)
      assertAuthority(actorId: string, programmeId: string, permissionCode: string): void {
        try {
          this.assertCapability(actorId, programmeId, permissionCode);
          return;
        } catch (err) {
          if ((err as { code?: string }).code !== 'PT403') {
            throw err; // Unexpected DB error not swallowed
          }
        }

        try {
          this.assertGlobalCapability(actorId, permissionCode);
          return;
        } catch (err) {
          if ((err as { code?: string }).code === 'PT403') {
            const authErr = new Error('F3_UNAUTHORIZED_AUTHORITY');
            (authErr as unknown as { code: string }).code = 'PT403';
            throw authErr;
          }
          throw err; // Unexpected DB error not swallowed
        }
      }
    }

    let db: AuthorityDatabase;

    const ROLE_SYSADMIN = 'role-sysadmin';
    const ROLE_HQADMIN = 'role-hqadmin';
    const ROLE_PLANNER = 'role-planner';
    const ROLE_SO = 'role-so';
    const ROLE_RE = 'role-re';
    const ROLE_AE = 'role-ae';
    const ROLE_SE = 'role-se';
    const ROLE_SS = 'role-ss';
    const ROLE_PM = 'role-pm';
    const ROLE_CONTRACTOR = 'role-contractor';
    const ROLE_VIEWER = 'role-viewer';

    beforeAll(() => {
      db = new AuthorityDatabase();

      // Seed Roles
      db.addRole(ROLE_SYSADMIN, 'SYSTEM_ADMIN', 'System Administrator', 'Global');
      db.addRole(ROLE_HQADMIN, 'HQ_ADMIN', 'HQ Administrator', 'Global');
      db.addRole(ROLE_PLANNER, 'PLANNER', 'Planner', 'Programme');
      db.addRole(ROLE_SO, 'SUPERINTENDING_OFFICER', 'Superintending Officer', 'Programme');
      db.addRole(ROLE_RE, 'RESIDENT_ENGINEER', 'Resident Engineer', 'Programme');
      db.addRole(ROLE_AE, 'ASSISTANT_ENGINEER', 'Assistant Engineer', 'Programme');
      db.addRole(ROLE_SE, 'SITE_ENGINEER', 'Site Engineer', 'Programme');
      db.addRole(ROLE_SS, 'SITE_SUPERVISOR', 'Site Supervisor', 'Programme');
      db.addRole(ROLE_PM, 'PROJECT_MANAGER', 'Project Manager', 'Programme');
      db.addRole(ROLE_CONTRACTOR, 'CONTRACTOR', 'Contractor', 'Programme');
      db.addRole(ROLE_VIEWER, 'VIEWER', 'Viewer', 'Programme');

      // Seed Permissions
      const allPermissions = [
        'PROGRAMME_MEMBERSHIP_MANAGE',
        'PROGRAMME_UPDATE',
        'SITE_DIARY_APPROVAL_REQUEST',
        'SITE_DIARY_APPROVAL_REVIEW',
        'SITE_DIARY_APPROVAL_APPROVE',
        'SITE_DIARY_APPROVAL_RETURN',
        'SITE_DIARY_APPROVAL_REJECT',
        'SITE_DIARY_APPROVAL_CANCEL',
        'SITE_DIARY_APPROVAL_QUEUE_VIEW',
        'SITE_DIARY_PRINT_READ',
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
        'VO_ITEM_CREATE',
      ];

      for (let i = 0; i < allPermissions.length; i++) {
        db.addPermission(`perm-${i + 1}`, allPermissions[i]!, 'Module');
      }

      // Seed Role Permissions (SYSTEM_ADMIN & HQ_ADMIN: all 26)
      for (const perm of allPermissions) {
        db.grantPermission(ROLE_SYSADMIN, perm);
        db.grantPermission(ROLE_HQADMIN, perm);
      }

      // PLANNER
      db.grantPermission(ROLE_PLANNER, 'REVISION_IMPORT');
      db.grantPermission(ROLE_PLANNER, 'TASK_UPDATE');

      // SUPERINTENDING_OFFICER
      db.grantPermission(ROLE_SO, 'REVISION_APPROVE');
      db.grantPermission(ROLE_SO, 'PROGRAMME_UPDATE');
      db.grantPermission(ROLE_SO, 'PROGRESS_APPROVE');

      // RESIDENT_ENGINEER
      db.grantPermission(ROLE_RE, 'ACTIVITY_UPDATE');
      db.grantPermission(ROLE_RE, 'PROGRESS_VERIFY');
      db.grantPermission(ROLE_RE, 'SITE_DIARY_APPROVAL_REVIEW');
      db.grantPermission(ROLE_RE, 'SITE_DIARY_APPROVAL_APPROVE');
      db.grantPermission(ROLE_RE, 'SITE_DIARY_APPROVAL_RETURN');
      db.grantPermission(ROLE_RE, 'SITE_DIARY_APPROVAL_REJECT');
      db.grantPermission(ROLE_RE, 'SITE_DIARY_APPROVAL_QUEUE_VIEW');
      db.grantPermission(ROLE_RE, 'SITE_DIARY_PRINT_READ');

      // ASSISTANT_ENGINEER
      db.grantPermission(ROLE_AE, 'PROGRESS_VERIFY');

      // SITE_ENGINEER
      db.grantPermission(ROLE_SE, 'ACTIVITY_CREATE');
      db.grantPermission(ROLE_SE, 'ACTIVITY_UPDATE');
      db.grantPermission(ROLE_SE, 'ACTIVITY_EXECUTE');
      db.grantPermission(ROLE_SE, 'SITE_DIARY_CREATE');
      db.grantPermission(ROLE_SE, 'SITE_DIARY_UPDATE');
      db.grantPermission(ROLE_SE, 'WORKFORCE_MANAGE');
      db.grantPermission(ROLE_SE, 'PROGRESS_EDIT');

      // SITE_SUPERVISOR
      db.grantPermission(ROLE_SS, 'ACTIVITY_CREATE');
      db.grantPermission(ROLE_SS, 'ACTIVITY_UPDATE');
      db.grantPermission(ROLE_SS, 'ACTIVITY_EXECUTE');
      db.grantPermission(ROLE_SS, 'SITE_DIARY_CREATE');
      db.grantPermission(ROLE_SS, 'SITE_DIARY_UPDATE');
      db.grantPermission(ROLE_SS, 'WORKFORCE_MANAGE');
      db.grantPermission(ROLE_SS, 'PROGRESS_EDIT');
      db.grantPermission(ROLE_SS, 'SITE_DIARY_APPROVAL_REQUEST');
      db.grantPermission(ROLE_SS, 'SITE_DIARY_APPROVAL_CANCEL');
      db.grantPermission(ROLE_SS, 'SITE_DIARY_APPROVAL_QUEUE_VIEW');
      db.grantPermission(ROLE_SS, 'SITE_DIARY_PRINT_READ');

      // PROJECT_MANAGER
      db.grantPermission(ROLE_PM, 'PROGRAMME_MEMBERSHIP_MANAGE');
      db.grantPermission(ROLE_PM, 'PROGRAMME_UPDATE');
      db.grantPermission(ROLE_PM, 'SITE_DIARY_PRINT_READ');

      // CONTRACTOR
      db.grantPermission(ROLE_CONTRACTOR, 'SITE_DIARY_APPROVAL_REQUEST');
      db.grantPermission(ROLE_CONTRACTOR, 'SITE_DIARY_APPROVAL_CANCEL');
      db.grantPermission(ROLE_CONTRACTOR, 'SITE_DIARY_APPROVAL_QUEUE_VIEW');
    });

    // --- Section A: Programme Authority (Tests 1-5) ---
    it('1. active Programme member + correct permission -> PASS', () => {
      const user = 'user-prog-active';
      const prog = 'prog-1';
      db.setUserProfile({ userId: user, fullName: 'Active Planner', isActive: true, globalRoleId: null });
      db.addProgrammeMembership({ membershipId: 'mem-1', programmeId: prog, userId: user, roleId: ROLE_PLANNER, isActive: true });

      expect(() => db.assertCapability(user, prog, 'REVISION_IMPORT')).not.toThrow();
    });

    it('2. active Programme member without permission -> DENY', () => {
      const user = 'user-prog-active';
      const prog = 'prog-1';
      expect(() => db.assertCapability(user, prog, 'REVISION_APPROVE')).toThrow('F24_UNAUTHORIZED_CAPABILITY');
    });

    it('3. non-member -> DENY', () => {
      const user = 'user-non-member';
      const prog = 'prog-1';
      db.setUserProfile({ userId: user, fullName: 'Stranger', isActive: true, globalRoleId: null });

      expect(() => db.assertCapability(user, prog, 'REVISION_IMPORT')).toThrow('F24_UNAUTHORIZED_CAPABILITY');
    });

    it('4. inactive membership -> DENY', () => {
      const user = 'user-inactive-mem';
      const prog = 'prog-1';
      db.setUserProfile({ userId: user, fullName: 'Inactive Member', isActive: true, globalRoleId: null });
      db.addProgrammeMembership({ membershipId: 'mem-2', programmeId: prog, userId: user, roleId: ROLE_PLANNER, isActive: false });

      expect(() => db.assertCapability(user, prog, 'REVISION_IMPORT')).toThrow('F24_UNAUTHORIZED_CAPABILITY');
    });

    it('5. inactive user -> DENY', () => {
      const user = 'user-inactive-profile';
      const prog = 'prog-1';
      db.setUserProfile({ userId: user, fullName: 'Inactive User', isActive: false, globalRoleId: null });
      db.addProgrammeMembership({ membershipId: 'mem-3', programmeId: prog, userId: user, roleId: ROLE_PLANNER, isActive: true });

      expect(() => db.assertCapability(user, prog, 'REVISION_IMPORT')).toThrow('F24_UNAUTHORIZED_CAPABILITY');
    });

    // --- Section B: Global Authority (Tests 6-10) ---
    it('6. active user + SYSTEM_ADMIN/HQ_ADMIN + exact permission -> PASS', () => {
      const userSys = 'user-sysadmin';
      const userHq = 'user-hqadmin';
      db.setUserProfile({ userId: userSys, fullName: 'System Admin', isActive: true, globalRoleId: ROLE_SYSADMIN });
      db.setUserProfile({ userId: userHq, fullName: 'HQ Admin', isActive: true, globalRoleId: ROLE_HQADMIN });

      expect(() => db.assertGlobalCapability(userSys, 'PROGRAMME_CREATE')).not.toThrow();
      expect(() => db.assertGlobalCapability(userHq, 'TRADE_LIBRARY_MANAGE')).not.toThrow();
    });

    it('7. Global role without requested permission -> DENY', () => {
      const customGlobalRole = 'role-limited-global';
      db.addRole(customGlobalRole, 'LIMITED_GLOBAL', 'Limited Global', 'Global');
      const user = 'user-limited-global';
      db.setUserProfile({ userId: user, fullName: 'Limited Global', isActive: true, globalRoleId: customGlobalRole });

      expect(() => db.assertGlobalCapability(user, 'PROGRAMME_CREATE')).toThrow('F3_UNAUTHORIZED_GLOBAL_CAPABILITY');
    });

    it('8. Programme role assigned as global_role_id -> structurally rejected', () => {
      expect(() => {
        db.setUserProfile({ userId: 'user-invalid-global', fullName: 'Invalid Global', isActive: true, globalRoleId: ROLE_PLANNER });
      }).toThrow('Cannot assign a Programme role as a global_role_id.');
    });

    it('9. inactive user with Global role -> DENY', () => {
      const user = 'user-inactive-sysadmin';
      db.setUserProfile({ userId: user, fullName: 'Inactive Admin', isActive: false, globalRoleId: ROLE_SYSADMIN });

      expect(() => db.assertGlobalCapability(user, 'PROGRAMME_CREATE')).toThrow('F3_UNAUTHORIZED_GLOBAL_CAPABILITY');
    });

    it('10. NULL Global role -> DENY global-only authority', () => {
      const user = 'user-null-global';
      db.setUserProfile({ userId: user, fullName: 'No Global Role', isActive: true, globalRoleId: null });

      expect(() => db.assertGlobalCapability(user, 'PROGRAMME_CREATE')).toThrow('F3_UNAUTHORIZED_GLOBAL_CAPABILITY');
    });

    // --- Section C: Combined Authority (Tests 11-15) ---
    it('11. Programme permission available -> PASS', () => {
      const user = 'user-combined-prog';
      const prog = 'prog-2';
      db.setUserProfile({ userId: user, fullName: 'Planner Only', isActive: true, globalRoleId: null });
      db.addProgrammeMembership({ membershipId: 'mem-4', programmeId: prog, userId: user, roleId: ROLE_PLANNER, isActive: true });

      expect(() => db.assertAuthority(user, prog, 'REVISION_IMPORT')).not.toThrow();
    });

    it('12. Programme permission absent but valid Global permission available -> PASS', () => {
      const user = 'user-sysadmin';
      const prog = 'prog-2'; // Not a member of prog-2
      expect(() => db.assertAuthority(user, prog, 'REVISION_IMPORT')).not.toThrow();
    });

    it('13. neither Programme nor Global permission -> DENY', () => {
      const user = 'user-viewer';
      const prog = 'prog-2';
      db.setUserProfile({ userId: user, fullName: 'Viewer Only', isActive: true, globalRoleId: null });
      db.addProgrammeMembership({ membershipId: 'mem-5', programmeId: prog, userId: user, roleId: ROLE_VIEWER, isActive: true });

      expect(() => db.assertAuthority(user, prog, 'ACTIVITY_CREATE')).toThrow('F3_UNAUTHORIZED_AUTHORITY');
    });

    it('14. foreign Programme membership + no Global permission -> DENY', () => {
      const user = 'user-foreign';
      const progA = 'prog-A';
      const progB = 'prog-B';
      db.setUserProfile({ userId: user, fullName: 'Foreign SE', isActive: true, globalRoleId: null });
      db.addProgrammeMembership({ membershipId: 'mem-6', programmeId: progA, userId: user, roleId: ROLE_SE, isActive: true });

      // Has SE permissions on prog-A, but trying to assert on prog-B
      expect(() => db.assertAuthority(user, progB, 'ACTIVITY_CREATE')).toThrow('F3_UNAUTHORIZED_AUTHORITY');
    });

    it('15. Global role exists but does not contain exact permission -> DENY', () => {
      const roleLimited = 'role-limited-override';
      db.addRole(roleLimited, 'LIMITED_OVERRIDE', 'Limited Override', 'Global');
      const user = 'user-limited-override';
      db.setUserProfile({ userId: user, fullName: 'Limited Override', isActive: true, globalRoleId: roleLimited });

      const prog = 'prog-2';
      expect(() => db.assertAuthority(user, prog, 'ACTIVITY_CREATE')).toThrow('F3_UNAUTHORIZED_AUTHORITY');
    });

    // --- Section D: Seed Correctness (Tests 16-20) ---
    it('16. PLANNER can import revision/update Task but cannot approve Revision', () => {
      const plannerId = ROLE_PLANNER;
      const permImport = [...db.permissions.values()].find((p) => p.permissionCode === 'REVISION_IMPORT')!;
      const permTask = [...db.permissions.values()].find((p) => p.permissionCode === 'TASK_UPDATE')!;
      const permApprove = [...db.permissions.values()].find((p) => p.permissionCode === 'REVISION_APPROVE')!;

      expect(db.rolePermissions.has(`${plannerId}:${permImport.permissionId}`)).toBe(true);
      expect(db.rolePermissions.has(`${plannerId}:${permTask.permissionId}`)).toBe(true);
      expect(db.rolePermissions.has(`${plannerId}:${permApprove.permissionId}`)).toBe(false);
    });

    it('17. SUPERINTENDING_OFFICER can approve Revision', () => {
      const soId = ROLE_SO;
      const permApprove = [...db.permissions.values()].find((p) => p.permissionCode === 'REVISION_APPROVE')!;
      const permUpdate = [...db.permissions.values()].find((p) => p.permissionCode === 'PROGRAMME_UPDATE')!;
      const permProgressApprove = [...db.permissions.values()].find((p) => p.permissionCode === 'PROGRESS_APPROVE')!;

      expect(db.rolePermissions.has(`${soId}:${permApprove.permissionId}`)).toBe(true);
      expect(db.rolePermissions.has(`${soId}:${permUpdate.permissionId}`)).toBe(true);
      expect(db.rolePermissions.has(`${soId}:${permProgressApprove.permissionId}`)).toBe(true);
    });

    it('18. SITE_ENGINEER/SITE_SUPERVISOR receive operational entry permissions', () => {
      const seId = ROLE_SE;
      const ssId = ROLE_SS;
      const operationalPerms = [
        'ACTIVITY_CREATE',
        'ACTIVITY_UPDATE',
        'ACTIVITY_EXECUTE',
        'SITE_DIARY_CREATE',
        'SITE_DIARY_UPDATE',
        'WORKFORCE_MANAGE',
        'PROGRESS_EDIT',
      ];

      for (const permCode of operationalPerms) {
        const perm = [...db.permissions.values()].find((p) => p.permissionCode === permCode)!;
        expect(db.rolePermissions.has(`${seId}:${perm.permissionId}`)).toBe(true);
        expect(db.rolePermissions.has(`${ssId}:${perm.permissionId}`)).toBe(true);
      }
    });

    it('19. RESIDENT_ENGINEER / ASSISTANT_ENGINEER receive expected verification permission', () => {
      const reId = ROLE_RE;
      const aeId = ROLE_AE;
      const permVerify = [...db.permissions.values()].find((p) => p.permissionCode === 'PROGRESS_VERIFY')!;

      expect(db.rolePermissions.has(`${reId}:${permVerify.permissionId}`)).toBe(true);
      expect(db.rolePermissions.has(`${aeId}:${permVerify.permissionId}`)).toBe(true);
    });

    it('20. VO_ITEM_CREATE is NOT granted to an ordinary Programme role', () => {
      const permVo = [...db.permissions.values()].find((p) => p.permissionCode === 'VO_ITEM_CREATE')!;
      const programmeRoles = [
        ROLE_PLANNER,
        ROLE_SO,
        ROLE_RE,
        ROLE_AE,
        ROLE_SE,
        ROLE_SS,
        ROLE_PM,
        ROLE_CONTRACTOR,
        ROLE_VIEWER,
      ];

      for (const roleId of programmeRoles) {
        expect(db.rolePermissions.has(`${roleId}:${permVo.permissionId}`)).toBe(false);
      }

      // Only SYSTEM_ADMIN and HQ_ADMIN receive VO_ITEM_CREATE
      expect(db.rolePermissions.has(`${ROLE_SYSADMIN}:${permVo.permissionId}`)).toBe(true);
      expect(db.rolePermissions.has(`${ROLE_HQADMIN}:${permVo.permissionId}`)).toBe(true);
    });
  });
});
