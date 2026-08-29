import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

describe('F3-B06 final runtime security gate contract', () => {
  let correctionSql: string;
  let runtimeSql: string;

  beforeAll(() => {
    correctionSql = readFileSync(
      join(
        __dirname,
        '../../supabase/migrations/20260830010000_f3_b06_private_execute_closure.sql',
      ),
      'utf8',
    );
    runtimeSql = readFileSync(
      join(__dirname, '../security/f3B06FinalSecurityGate.runtime.sql'),
      'utf8',
    );
  });

  it('labels the bounded correction and revokes every stale private client grant', () => {
    expect(correctionSql).toContain('F3-B06-CORR-001');

    const closedSignatures = [
      ['assert_capability', 'uuid, uuid, character varying'],
      ['a27_create_approval_atomic', 'jsonb, uuid, uuid, uuid, timestamptz'],
      ['f24_assert_site_diary_unsealed', 'uuid'],
      ['get_site_diary_approval_queue', 'uuid, uuid'],
      ['trg_bootstrap_programme_creator', ''],
      ['trg_check_programme_membership_role_scope', ''],
    ] as const;

    for (const [name, signature] of closedSignatures) {
      const escapedSignature = signature
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
        .join('\\s*,\\s*');
      expect(correctionSql).toMatch(
        new RegExp(
          `REVOKE ALL ON FUNCTION "private"\\."${name}"\\(\\s*${escapedSignature}\\s*\\)\\s*FROM PUBLIC, anon, authenticated;`,
        ),
      );
    }
  });

  it('preserves the intentional authenticated RLS helper grant', () => {
    expect(correctionSql).not.toMatch(
      /REVOKE[\s\S]*ON FUNCTION "private"\."is_programme_member"/,
    );
  });

  it('keeps runtime fixtures rollback-only and proves the critical attack families', () => {
    expect(runtimeSql).toMatch(/BEGIN;[\s\S]*ROLLBACK;\s*$/);
    expect(runtimeSql).toContain('critical foreign revision ingest denied');
    expect(runtimeSql).toContain('critical foreign revision approval denied');
    expect(runtimeSql).toContain('foreign RPC matrix leaves target and global Trade rows unchanged');
    expect(runtimeSql).toContain('requester cannot approve own request');
    expect(runtimeSql).toContain('Approved Progress cannot be reopened or downgraded');
    expect(runtimeSql).toContain('authenticated direct Approval SELECT denied');
    expect(runtimeSql).toContain('direct trade_library UPDATE denied');
    expect(runtimeSql).toContain('F3-B06 RUNTIME DATABASE PROOF: PASS');
  });

  it('uses an owner-read concurrency token so foreign proofs reach authorization', () => {
    expect(runtimeSql).toContain(
      'CREATE FUNCTION pg_temp.b06_site_diary_token(p_site_diary_id uuid)',
    );
    expect(runtimeSql).toContain('foreign Site Diary update denied');
    expect(runtimeSql).toContain(
      "pg_temp.b06_site_diary_token('14000000-0000-4000-8000-000000000002')",
    );
  });
});
