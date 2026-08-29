import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const DIRECT_SCOPED_TARGETS = ['audit', 'vo_item', 'workforce'] as const;
const PARENT_DERIVED_TARGETS = ['activity_logs', 'site_diary_logs'] as const;
const DENIED_READ_TARGETS = ['approval', 'progress'] as const;
const ALL_TARGET_TABLES = [
  ...DIRECT_SCOPED_TARGETS,
  ...PARENT_DERIVED_TARGETS,
  ...DENIED_READ_TARGETS,
] as const;

const EXISTING_SAFE_READ_SURFACES = [
  'programme',
  'programme_revision',
  'task',
  'activity',
  'site_diary',
] as const;

function normalizeSql(sql: string): string {
  return sql.replace(/--.*$/gm, '').replace(/"/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function statements(sql: string): string[] {
  return normalizeSql(sql)
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function policyStatement(sqlStatements: string[], policyName: string): string {
  return (
    sqlStatements.find((statement) => statement.startsWith(`create policy ${policyName} `)) ?? ''
  );
}

describe('F3-B03 Database Read Isolation & Grant Closure Contract Test Suite', () => {
  let b03MigrationSql: string;
  let b03Statements: string[];
  let allMigrations: { filename: string; sql: string; statements: string[] }[];

  beforeAll(() => {
    const migrationsDirectory = join(__dirname, '../../supabase/migrations');
    const b03Files = readdirSync(migrationsDirectory).filter((file) =>
      file.endsWith('_f3_b03_read_isolation_grant_closure.sql'),
    );

    expect(b03Files).toHaveLength(1);
    const b03Filename = b03Files[0]!;
    b03MigrationSql = readFileSync(join(migrationsDirectory, b03Filename), 'utf8');
    b03Statements = statements(b03MigrationSql);

    const allFiles = readdirSync(migrationsDirectory).filter((f) => f.endsWith('.sql')).sort();
    allMigrations = allFiles.map((file) => {
      const sql = readFileSync(join(migrationsDirectory, file), 'utf8');
      return {
        filename: file,
        sql,
        statements: statements(sql),
      };
    });
  });

  describe('Part 1: RLS Enablement and Owner Definer Rules', () => {
    it.each(ALL_TARGET_TABLES)('enables Row Level Security on public.%s', (table) => {
      expect(b03Statements).toContain(`alter table public.${table} enable row level security`);
    });

    it('does NOT use FORCE ROW LEVEL SECURITY on any target table', () => {
      const normalized = normalizeSql(b03MigrationSql);
      expect(normalized).not.toContain('force row level security');
    });
  });

  describe('Part 2: Privilege Normalization and Explicit Grant Posture', () => {
    it.each(ALL_TARGET_TABLES)(
      'revokes ALL privileges from PUBLIC, anon, authenticated on public.%s',
      (table) => {
        expect(b03Statements).toContain(
          `revoke all on table public.${table} from public, anon, authenticated`,
        );
      },
    );

    it.each([...DIRECT_SCOPED_TARGETS, ...PARENT_DERIVED_TARGETS])(
      'grants SELECT-only to authenticated on sanctioned readable table public.%s',
      (table) => {
        expect(b03Statements).toContain(
          `grant select on table public.${table} to authenticated`,
        );

        const grantsForTable = b03Statements.filter(
          (s) => s.startsWith('grant ') && s.includes(`public.${table}`),
        );
        expect(grantsForTable).toEqual([
          `grant select on table public.${table} to authenticated`,
        ]);
      },
    );

    it.each(DENIED_READ_TARGETS)(
      'grants NO direct SELECT or any direct privileges to authenticated on fail-closed public.%s',
      (table) => {
        const grantsForTable = b03Statements.filter(
          (s) => s.startsWith('grant ') && s.includes(`public.${table}`),
        );
        expect(grantsForTable).toHaveLength(0);
      },
    );

    it('does not grant INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, or TRIGGER on any target', () => {
      const normalized = normalizeSql(b03MigrationSql);
      expect(normalized).not.toMatch(/grant (?:insert|update|delete|truncate|references|trigger|all) /);
    });
  });

  describe('Part 3: Policy Hygiene and Drop of Obsolete Policies', () => {
    it('drops legacy overly permissive workforce policy a27_authenticated_workforce_read', () => {
      expect(b03Statements).toContain(
        'drop policy if exists a27_authenticated_workforce_read on public.workforce',
      );
    });

    it('drops legacy overly permissive activity_logs read and insert policies', () => {
      expect(b03Statements).toContain(
        'drop policy if exists enable read access for all users on public.activity_logs',
      );
      expect(b03Statements).toContain(
        'drop policy if exists enable insert for authenticated users only on public.activity_logs',
      );
    });

    it('drops legacy overly permissive site_diary_logs history policy authenticated_read_site_diary_history', () => {
      expect(b03Statements).toContain(
        'drop policy if exists authenticated_read_site_diary_history on public.site_diary_logs',
      );
    });

    it('contains zero surviving USING(true) or WITH CHECK(true) in B03 migration', () => {
      const normalized = normalizeSql(b03MigrationSql);
      expect(normalized).not.toMatch(/using\s*\(\s*true\s*\)/);
      expect(normalized).not.toMatch(/with check\s*\(\s*true\s*\)/);
    });
  });

  describe('Part 4: Direct Programme Membership Scoped Policies', () => {
    it.each(DIRECT_SCOPED_TARGETS)(
      'creates canonical Programme-membership SELECT policy on public.%s',
      (table) => {
        const policyName = `f3_b03_${table}_select`;
        const policy = policyStatement(b03Statements, policyName);
        expect(policy).toBe(
          `create policy ${policyName} on public.${table} for select to authenticated using ( private.is_programme_member(programme_id) )`,
        );
      },
    );
  });

  describe('Part 5: Parent-Derived History Policies', () => {
    it('creates parent-derived SELECT policy on public.activity_logs via activity -> programme', () => {
      const policy = policyStatement(b03Statements, 'f3_b03_activity_logs_select');
      expect(policy).toBe(
        'create policy f3_b03_activity_logs_select on public.activity_logs for select to authenticated using ( exists ( select 1 from public.activity as a where a.activity_id = activity_logs.activity_id and private.is_programme_member(a.programme_id) ) )',
      );
    });

    it('creates parent-derived SELECT policy on public.site_diary_logs via site_diary -> programme', () => {
      const policy = policyStatement(b03Statements, 'f3_b03_site_diary_logs_select');
      expect(policy).toBe(
        'create policy f3_b03_site_diary_logs_select on public.site_diary_logs for select to authenticated using ( exists ( select 1 from public.site_diary as sd where sd.site_diary_id = site_diary_logs.site_diary_id and private.is_programme_member(sd.programme_id) ) )',
      );
    });
  });

  describe('Part 6: Fail-Closed Posture for Approval and Progress', () => {
    it.each(DENIED_READ_TARGETS)(
      'creates zero SELECT policies for authenticated on public.%s',
      (table) => {
        const policies = b03Statements.filter(
          (s) => s.startsWith('create policy ') && s.includes(`public.${table}`),
        );
        expect(policies).toHaveLength(0);
      },
    );
  });

  describe('Part 7: Preserved Existing Surfaces and Privileged Read RPCs', () => {
    it.each(EXISTING_SAFE_READ_SURFACES)(
      'preserves C04/C07 RLS enablement and membership policy on public.%s',
      (table) => {
        const c04orC07 = allMigrations.filter(
          (m) =>
            m.filename.includes('f2_7_c04') || m.filename.includes('f2_7_c07'),
        );
        const allC04C07Sql = c04orC07.map((m) => normalizeSql(m.sql)).join(' ');

        expect(allC04C07Sql).toContain(
          `alter table public.${table} enable row level security`,
        );
        expect(allC04C07Sql).toContain(
          `grant select on table public.${table} to authenticated`,
        );
        expect(allC04C07Sql).toContain(
          `private.is_programme_member(programme_id)`,
        );
      },
    );

    it('preserves public.f24_get_site_diary_approval_queue as capability-gated SECURITY DEFINER', () => {
      const c01Migration = allMigrations.find((m) =>
        m.filename.includes('f2_7_c01_security_wrapper_remediation'),
      );
      expect(c01Migration).toBeDefined();
      const sql = c01Migration!.sql;
      expect(sql).toContain('CREATE OR REPLACE FUNCTION "public"."f24_get_site_diary_approval_queue"');
      expect(sql).toContain('SECURITY DEFINER');
      expect(sql).toContain('SITE_DIARY_APPROVAL_QUEUE_VIEW');
      expect(sql).toContain('GRANT EXECUTE ON FUNCTION "public"."f24_get_site_diary_approval_queue"(uuid) TO authenticated;');
    });

    it('preserves public.f24_get_site_diary_approval_review as capability-gated SECURITY DEFINER', () => {
      const c01Migration = allMigrations.find((m) =>
        m.filename.includes('f2_7_c01_security_wrapper_remediation'),
      );
      expect(c01Migration).toBeDefined();
      const sql = c01Migration!.sql;
      expect(sql).toContain('CREATE OR REPLACE FUNCTION "public"."f24_get_site_diary_approval_review"');
      expect(sql).toContain('SECURITY DEFINER');
      expect(sql).toContain('GRANT EXECUTE ON FUNCTION "public"."f24_get_site_diary_approval_review"(uuid) TO authenticated;');
    });

    it('preserves public.f25_get_site_diary_print_read as capability-gated SECURITY DEFINER', () => {
      const c01Migration = allMigrations.find((m) =>
        m.filename.includes('f2_7_c01_security_wrapper_remediation'),
      );
      expect(c01Migration).toBeDefined();
      const sql = c01Migration!.sql;
      expect(sql).toContain('CREATE OR REPLACE FUNCTION "public"."f25_get_site_diary_print_read"');
      expect(sql).toContain('SECURITY DEFINER');
      expect(sql).toContain('GRANT EXECUTE ON FUNCTION "public"."f25_get_site_diary_print_read"(uuid) TO authenticated;');
    });
  });

  describe('Part 8: B01 / B02 Authority Foundation Non-Regression', () => {
    it('preserves private.assert_authority and private.assert_global_capability', () => {
      const b01Migration = allMigrations.find((m) =>
        m.filename.includes('f3_b01_authority_rbac_foundation'),
      );
      expect(b01Migration).toBeDefined();
      expect(b01Migration!.sql).toContain('CREATE OR REPLACE FUNCTION "private"."assert_authority"');
      expect(b01Migration!.sql).toContain('CREATE OR REPLACE FUNCTION "private"."assert_global_capability"');
    });

    it('preserves all B02 mutation RPCs', () => {
      const b02Migration = allMigrations.find((m) =>
        m.filename.includes('f3_b02_privileged_rpc_mutation_closure'),
      );
      expect(b02Migration).toBeDefined();
      const b02Sql = b02Migration!.sql;

      expect(b02Sql).toContain('a27_create_programme_atomic');
      expect(b02Sql).toContain('a27_ingest_msp_atomic');
      expect(b02Sql).toContain('a27_approve_revision_atomic');
      expect(b02Sql).toContain('a27_archive_programme');
      expect(b02Sql).toContain('a27_update_task');
      expect(b02Sql).toContain('a27_create_activity_atomic');
      expect(b02Sql).toContain('a27_update_activity_atomic');
      expect(b02Sql).toContain('a27_start_activity_atomic');
      expect(b02Sql).toContain('a27_complete_activity_atomic');
      expect(b02Sql).toContain('f1_start_activity_on_date_atomic');
      expect(b02Sql).toContain('f1_complete_activity_with_dates_atomic');
      expect(b02Sql).toContain('f1_create_site_diary_full_atomic');
      expect(b02Sql).toContain('f1_update_site_diary_full_atomic');
      expect(b02Sql).toContain('f1_create_trade_atomic');
      expect(b02Sql).toContain('a27_create_workforce_atomic');
      expect(b02Sql).toContain('a27_update_workforce_atomic');
      expect(b02Sql).toContain('f1_create_vo_item_atomic');
      expect(b02Sql).toContain('a27_create_progress_atomic');
      expect(b02Sql).toContain('a27_update_progress_atomic');
    });
  });

  describe('Part 9: Read Isolation Policy Logic Simulation', () => {
    interface ProgrammeMembership {
      programme_id: string;
      user_id: string;
      is_active: boolean;
    }

    const memberships: ProgrammeMembership[] = [
      { programme_id: 'prog-alpha', user_id: 'user-alice', is_active: true },
      { programme_id: 'prog-beta', user_id: 'user-bob', is_active: true },
      { programme_id: 'prog-gamma', user_id: 'user-inactive', is_active: false },
    ];

    function isProgrammeMember(actorId: string | null, programmeId: string): boolean {
      if (!actorId) return false;
      return memberships.some(
        (m) => m.programme_id === programmeId && m.user_id === actorId && m.is_active,
      );
    }

    it('simulates direct table read policy for member vs non-member vs anon', () => {
      // Alice on Programme Alpha
      expect(isProgrammeMember('user-alice', 'prog-alpha')).toBe(true);
      // Alice on Programme Beta (denied)
      expect(isProgrammeMember('user-alice', 'prog-beta')).toBe(false);
      // Inactive user on Programme Gamma (denied)
      expect(isProgrammeMember('user-inactive', 'prog-gamma')).toBe(false);
      // Unauthenticated caller (denied)
      expect(isProgrammeMember(null, 'prog-alpha')).toBe(false);
    });

    it('simulates parent-derived read policy for activity_logs', () => {
      const activities = [
        { activity_id: 'act-1', programme_id: 'prog-alpha' },
        { activity_id: 'act-2', programme_id: 'prog-beta' },
      ];
      const activityLogs = [
        { log_id: 'log-1', activity_id: 'act-1' },
        { log_id: 'log-2', activity_id: 'act-2' },
      ];

      function canReadActivityLog(actorId: string | null, log: (typeof activityLogs)[0]): boolean {
        const act = activities.find((a) => a.activity_id === log.activity_id);
        if (!act) return false;
        return isProgrammeMember(actorId, act.programme_id);
      }

      // Alice can read log-1 (belongs to act-1 in prog-alpha)
      expect(canReadActivityLog('user-alice', activityLogs[0]!)).toBe(true);
      // Alice CANNOT read log-2 (belongs to act-2 in prog-beta)
      expect(canReadActivityLog('user-alice', activityLogs[1]!)).toBe(false);
      // Anon cannot read any log
      expect(canReadActivityLog(null, activityLogs[0]!)).toBe(false);
      expect(canReadActivityLog(null, activityLogs[1]!)).toBe(false);
    });

    it('simulates parent-derived read policy for site_diary_logs', () => {
      const siteDiaries = [
        { site_diary_id: 'sd-1', programme_id: 'prog-alpha' },
        { site_diary_id: 'sd-2', programme_id: 'prog-beta' },
      ];
      const siteDiaryLogs = [
        { log_id: 'sdl-1', site_diary_id: 'sd-1' },
        { log_id: 'sdl-2', site_diary_id: 'sd-2' },
      ];

      function canReadSiteDiaryLog(actorId: string | null, log: (typeof siteDiaryLogs)[0]): boolean {
        const sd = siteDiaries.find((s) => s.site_diary_id === log.site_diary_id);
        if (!sd) return false;
        return isProgrammeMember(actorId, sd.programme_id);
      }

      // Bob can read sdl-2 (belongs to sd-2 in prog-beta)
      expect(canReadSiteDiaryLog('user-bob', siteDiaryLogs[1]!)).toBe(true);
      // Bob CANNOT read sdl-1 (belongs to sd-1 in prog-alpha)
      expect(canReadSiteDiaryLog('user-bob', siteDiaryLogs[0]!)).toBe(false);
      // Anon cannot read any log
      expect(canReadSiteDiaryLog(null, siteDiaryLogs[0]!)).toBe(false);
      expect(canReadSiteDiaryLog(null, siteDiaryLogs[1]!)).toBe(false);
    });
  });
});
