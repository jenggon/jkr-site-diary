# A27 Option 2 — Step 2 Implementation Report

## Verdict

COMPLETE / PASS

Baseline: `79939ea09e270a2bf3fbadef1af32d3f52ed193a`

Disposable Supabase project: `olxxofaegsvrctbqflyv` (`jkr-site-diary-a27-test`)

Production project `dihwyhlkoymedsxjuiul` was not touched. No branch, commit, push, or pull request was created.

## Atomicity and actor-integrity implementation

- Replayed all 15 historical repository migrations in filename order on the disposable project.
- Added distinct append-only `site_diary_logs` with `site_diary_id` ownership.
- Added Approval and Progress create/update atomic RPCs, including optional Activity completion and Activity log.
- Added authenticated Supabase RPC adapters; Approval/Progress no longer rely on the no-op transaction manager.
- Approval and Progress mutation routes require verified Bearer identity. Caller-supplied actor fields and `x-user-id` cannot become canonical actors.
- Public Audit POST/PATCH routes return HTTP 405.
- Created disposable Auth principal ID `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`; no credential or login identifier is committed or reported.

## Bounded blocker remediation

### B1 — canonical Programme Revision persistence

- Persistence types and mapper now use migrated columns `revision_no` and `revision_name`.
- Removed reads/writes for nonexistent revision columns, including `is_current`.
- Domain fields remain unchanged; `isCurrent` is derived solely from `programme.current_revision_id === programme_revision.revision_id`.
- Active lookup reads the Programme pointer and then that exact revision. History orders by `revision_no` and maps all rows against the same pointer.
- Status updates write only canonical lifecycle fields.
- Focused tests cover mapping, current/non-current derivation, history reconciliation, and superseded rejection.

### B2 — canonical Site Diary route slug

- Moved `/api/site-diary/[diaryId]/activities` to `/api/site-diary/[siteDiaryId]/activities` without changing URL shape, methods, or response contracts.
- Updated context and integration tests to `siteDiaryId`.
- Added a static assertion preventing a conflicting same-level dynamic slug.
- Development startup and production route generation confirm only `[siteDiaryId]` at that level.

## Real database and handler evidence

- Approval forced audit failure rolled back the Approval row; PASS.
- Approval success produced exactly one Approval and actor-matched Audit; PASS.
- Progress forced later Activity-log failure rolled back Progress, Audit, and Activity completion; PASS.
- Progress success produced exactly one Progress/Audit, Activity completion, and Activity log; PASS.
- RPC grants deny anon/PUBLIC and allow authenticated execution only on intended wrappers; PASS.
- Authenticated Approval create returned 201 and update returned 200; PASS.
- Authenticated Progress create returned 201; PASS.
- Forged actor `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb` was ignored. Stored `requested_by`, `approved_by`, and all relevant Audit actors equal verified principal `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`; PASS.
- Forged-actor Audit writes: 0; PASS.
- Unauthenticated Approval and Progress POST returned 401 and produced no corresponding writes; PASS.

## Security advisor

Security advisor ran only on the disposable project. It reports the four public A27 wrappers because they are intentionally authenticated-callable `SECURITY DEFINER` functions. This is the selected DB-INVARIANT trust boundary: every wrapper has a fixed empty search path, checks `auth.uid()` against the supplied actor, enforces operational/link/lifecycle invariants, and delegates to inaccessible private helpers. The warnings are expected and reviewed, not bypasses.

Baseline findings remain: RLS disabled on eight existing public tables, mutable search paths on two pre-A27 revision-safety trigger functions, and leaked-password protection disabled for disposable Auth. A27 does not invent the broader Programme-level RLS model; it revokes direct `PUBLIC`/anon/authenticated mutation on the canonical mutation surface and enables RLS on new history.

References: [mutable search path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [RLS disabled](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Final validation

- Focused regression: PASS — 56/56 tests across 6 files.
- Typecheck: PASS.
- Lint: PASS.
- Full suite: PASS — 320/320 tests across 60 files.
- Production build: PASS.
- Build retained one pre-existing casing warning for `ActivityRepository.ts` versus `activityRepository.ts`; compilation succeeds and the warning is outside this bounded remediation.

## Changed-file classification

### Atomicity/auth

- `supabase/migrations/20260816120000_a27_atomic_foundation.sql`
- `src/repositories/atomic/ApprovalAtomicRepository.ts`
- `src/repositories/atomic/IApprovalAtomicRepository.ts`
- `src/repositories/atomic/IProgressAtomicRepository.ts`
- `src/repositories/atomic/ProgressAtomicRepository.ts`
- `src/app/api/_shared/identity.ts`
- `src/app/api/approval/route.ts`
- `src/app/api/approval/[approvalId]/route.ts`
- `src/app/api/progress/route.ts`
- `src/app/api/progress/[progressId]/route.ts`
- `src/app/api/audit/route.ts`
- `src/app/api/audit/[auditId]/route.ts`
- `src/composition/approvalComposition.ts`
- `src/composition/progressComposition.ts`
- `src/lib/supabase.ts`
- `src/services/IApprovalService.ts`
- `src/services/IProgressService.ts`
- `src/services/approvalService.ts`
- `src/services/progressService.ts`

### Revision reconciliation

- `src/repositories/ProgrammeRevisionRepository.ts`
- `src/repositories/mappers/IProgrammeRowMapper.ts`
- `src/repositories/mappers/ProgrammeRowMapper.ts`
- `src/repositories/types/programmeRow.ts`
- `tests/unit/repositories/ProgrammeRevisionRepository.test.ts`
- `tests/unit/repositories/mappers/ProgrammeRowMapper.test.ts`

### Route collision

- Removed `src/app/api/site-diary/[diaryId]/activities/route.ts`
- Added `src/app/api/site-diary/[siteDiaryId]/activities/route.ts`
- `tests/integration/api/siteDiaryActivitiesRoute.integration.test.ts`
- `tests/unit/api/siteDiaryRouteStructure.test.ts`

### Atomic service tests

- `tests/unit/services/approvalService.test.ts`
- `tests/unit/services/progressService.test.ts`

### Report

- `A27-OPTION2-STEP2-IMPLEMENTATION-REPORT.md`

## Architecture confirmation

REM-007 and locked DB-014/DB-015 remain intact: Activity owns operational state, Site Diary owns one Activity/day execution records, `site_diary_logs` owns append-only history, and only the latest authorised CPM revision is operational.

## Step 4 hardening addendum

Step 4 adds `supabase/migrations/20260816130000_a27_atomic_security_hardening.sql` and closes the residual trust gaps identified by the Step 3 audit. The original foundation migration now fails closed: it grants neither private-schema access nor public wrapper execution; the corrective migration installs the reviewed DB-INVARIANT boundary.

- Direct table mutation is revoked from `PUBLIC`, `anon`, and `authenticated` across the governed canonical tables.
- Private A27 helpers have no schema usage or function execution grant for those roles.
- Only the four exact public Approval/Progress wrapper signatures are executable by `authenticated`; anon and `PUBLIC` have none.
- Approval status/lifecycle, linkage, active-revision, actor, timestamp, and audit invariants are enforced inside the transaction.
- Progress linkage, cumulative percentage, lifecycle, actor, audit, and Activity-completion invariants are enforced inside the transaction.
- Caller-controlled `p_complete_activity` was removed; completion is derived by SQL from Approved 100% cumulative progress.
- Disposable adversarial checks, canonical API checks, actor-integrity checks, and both required forced-failure rollback checks passed.
- Final validation remains PASS: typecheck, lint, 320/320 tests, and build.
- Production project `dihwyhlkoymedsxjuiul` was not touched.
