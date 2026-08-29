import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const TARGET_TABLES = ['programme_revision', 'task', 'activity', 'site_diary'] as const;

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

describe('F2.7-C07 dependent Programme-context read authority contract', () => {
  let c07Sql: string;
  let c07Statements: string[];
  let c04Sql: string;
  let c04Statements: string[];

  beforeAll(() => {
    const migrationsDirectory = join(__dirname, '../../supabase/migrations');
    const c07Migrations = readdirSync(migrationsDirectory).filter((file) =>
      file.endsWith('_f2_7_c07_dependent_programme_read_authority.sql'),
    );

    expect(c07Migrations).toHaveLength(1);
    const c07Migration = c07Migrations[0];
    if (!c07Migration) {
      throw new Error('C07 migration is missing');
    }

    c07Sql = readFileSync(join(migrationsDirectory, c07Migration), 'utf8');
    c07Statements = statements(c07Sql);

    c04Sql = readFileSync(
      join(migrationsDirectory, '20260823100000_f2_7_c04_programme_discovery_authorization.sql'),
      'utf8',
    );
    c04Statements = statements(c04Sql);
  });

  it.each(TARGET_TABLES)('enables non-FORCE RLS on public.%s', (table) => {
    expect(c07Statements).toContain(`alter table public.${table} enable row level security`);
    expect(c07Statements.some((statement) => statement.includes('force row level security'))).toBe(
      false,
    );
  });

  it.each(TARGET_TABLES)('sets authenticated SELECT-only grants on public.%s', (table) => {
    expect(c07Statements).toContain(`revoke all on table public.${table} from anon, authenticated`);
    expect(c07Statements).toContain(`grant select on table public.${table} to authenticated`);

    const grantsForTable = c07Statements.filter(
      (statement) => statement.startsWith('grant ') && statement.includes(`public.${table}`),
    );
    expect(grantsForTable).toEqual([`grant select on table public.${table} to authenticated`]);
  });

  it.each(TARGET_TABLES)(
    'creates exactly one authenticated membership SELECT policy on public.%s',
    (table) => {
      const policyName = `c07_programme_member_select_${table}`;
      const policy = policyStatement(c07Statements, policyName);
      const tablePolicies = c07Statements.filter(
        (statement) =>
          statement.startsWith('create policy ') && statement.includes(`public.${table}`),
      );

      expect(tablePolicies).toHaveLength(1);
      expect(policy).toBe(
        `create policy ${policyName} on public.${table} for select to authenticated using ( private.is_programme_member(programme_id) )`,
      );
    },
  );

  it('changes authority on exactly the four required dependent tables', () => {
    const touchedTables = new Set(
      c07Statements.flatMap((statement) => {
        const match = statement.match(
          /^(?:alter table|revoke all on table|grant select on table|create policy .*? on) public\.([a-z_]+)/,
        );
        return match ? [match[1]] : [];
      }),
    );

    expect([...touchedTables].sort()).toEqual([...TARGET_TABLES].sort());
    expect(c07Statements).toHaveLength(TARGET_TABLES.length * 4);
  });

  it('does not introduce actor parameters, service-role authority, or direct writes', () => {
    const normalized = normalizeSql(c07Sql);

    expect(normalized).not.toMatch(/actor_id|p_actor/);
    expect(normalized).not.toContain('service_role');
    expect(normalized).not.toMatch(/grant (?:insert|update|delete|all) /);
    expect(normalized).not.toMatch(/create (?:or replace )?function/);
  });

  it('reuses the unchanged C04 helper definition and grants', () => {
    expect(c04Statements).toContain(
      "create or replace function private.is_programme_member( p_programme_id uuid ) returns boolean language sql stable security definer set search_path = '' as $$ select auth.uid() is not null and exists ( select 1 from public.programme_membership as pm where pm.programme_id = p_programme_id and pm.user_id = auth.uid() and pm.is_active = true )",
    );
    expect(c04Statements).toContain(
      'revoke all on function private.is_programme_member(uuid) from public, anon, authenticated',
    );
    expect(c04Statements).toContain(
      'grant execute on function private.is_programme_member(uuid) to authenticated',
    );
    expect(normalizeSql(c07Sql)).not.toContain('is_programme_member(uuid)');
  });

  it('preserves the C04 Programme policy and sealed membership table', () => {
    expect(c04Statements).toContain(
      'create policy c04_active_programme_membership_select on public.programme for select to authenticated using ( private.is_programme_member(programme_id) )',
    );
    expect(c04Statements).toContain(
      'revoke all on table public.programme from anon, authenticated',
    );
    expect(c04Statements).toContain('grant select on table public.programme to authenticated');

    const c07Normalized = normalizeSql(c07Sql);
    expect(c07Normalized).not.toMatch(
      /(?:alter table|grant .* on table|revoke .* on table|create policy .* on) public\.programme(?:\s|$)/,
    );
    expect(c07Normalized).not.toContain('public.programme_membership');
  });

  it('does not touch C06 Programme PATCH authority', () => {
    const normalized = normalizeSql(c07Sql);
    expect(normalized).not.toContain('f2_7_c06');
    expect(normalized).not.toMatch(/\bfor update\b|\bwith check\b/);
    expect(normalized).not.toMatch(/\bcreate function\b|\bcreate or replace function\b/);
  });
});
