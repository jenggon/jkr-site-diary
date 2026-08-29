# A27 Option 2 — Step 4/6 Atomic Foundation Security + Invariant Hardening

## Verdict

**PASS.** The Approval/Progress atomic foundation now uses a DB-INVARIANT trust boundary. Authenticated callers may reach only four narrowly granted public wrappers; the database independently verifies the authenticated actor and every governed lifecycle/linkage invariant before private transactional mutation.

Production project `dihwyhlkoymedsxjuiul` was not inspected, migrated, queried, or otherwise touched. All live verification used disposable project `olxxofaegsvrctbqflyv` only.

## Remediation delivered

- Added `supabase/migrations/20260816130000_a27_atomic_security_hardening.sql`.
- Made the Step 2 foundation migration fail closed by removing authenticated private-schema access and deferring public wrapper grants to the corrective migration.
- Revoked `INSERT`, `UPDATE`, and `DELETE` from `PUBLIC`, `anon`, and `authenticated` on the governed canonical mutation tables.
- Revoked private-schema usage and all private A27 function execution from those roles.
- Granted authenticated execution only on the exact four current public Approval/Progress wrapper signatures.
- Used `SECURITY DEFINER` with a fixed empty search path and fully qualified object references.
- Bound actor identity to `auth.uid()` in SQL; caller-supplied actor forgery is rejected/neutralized.
- Enforced current Approved revision, Programme/Revision/Activity linkage, Site Diary/Progress linkage, valid Approval transitions, terminal-state protection, mandatory rejection/return comments, cumulative Progress bounds, and valid Activity completion transitions inside SQL.
- Removed the caller-controlled Progress completion boolean from repository contracts and RPC signatures. SQL derives completion from Approved 100% cumulative progress.
- Preserved same-transaction Audit and Activity-log writes and append-only history behavior.

No propagation was made to Programme, Revision, MSP ingestion, Activity, Workforce, or Site Diary service design. REM-007 and DB-014/DB-015 ownership remain intact.

## Disposable security verification

### Direct table access

- Anonymous Approval insert: denied; zero mutation.
- Authenticated Approval insert: denied; zero mutation.
- Anonymous Progress insert: denied; zero mutation.
- Authenticated Progress insert: denied; zero mutation.
- Privilege inspection found zero anon or authenticated mutation grants on the governed canonical targets.

### RPC and invariant boundary

- Authenticated direct RPC attempt to alter a terminal Approval: rejected with `A27_APPROVAL_TERMINAL_STATE`; zero mutation.
- Authenticated direct forged Progress completion against an already Completed Activity: rejected with `A27_ACTIVITY_COMPLETION_TRANSITION_INVALID`; zero mutation.
- Private helper invocation through the Data API: unavailable because the schema is not exposed.
- All eight private A27 functions: anon `false`, authenticated `false`, `PUBLIC` `false` for execution.
- Four public wrappers: authenticated `true`, anon `false`, `PUBLIC` `false` for execution.
- Obsolete Progress signatures containing `p_complete_activity`: absent from the live boundary.

### Canonical application path and actor integrity

- Authenticated Approval POST: 201.
- Authenticated Approval PATCH: 200.
- Authenticated Progress POST: 201.
- Stored Approval requester/approver and all relevant Audit actors matched the verified authenticated principal.
- Forged actor writes: zero.

### Required ACID rollback reconfirmation

- Approval RPC with a forced duplicate Audit primary key failed and left zero Approval and zero new Audit rows.
- Progress RPC with a forced duplicate Activity-log primary key failed and left zero Progress, zero new Audit, no new Activity log, and the Activity still `In Progress`.

Only these two destructive rollback scenarios were rerun.

## Security advisor classification

The security advisor was run only against the disposable project.

- **Expected/reviewed:** four `authenticated_security_definer_function_executable` warnings for the deliberately exposed DB-INVARIANT wrappers. Exact grants, fixed search paths, verified actor binding, private helpers, and adversarial tests make these the intended boundary rather than a bypass. [Advisor guidance](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- **Pre-existing/out of scope:** RLS-disabled findings for eight existing public tables. Direct mutations are nevertheless privilege-revoked by this hardening; designing the broader read/RLS model is not part of Step 4. [Advisor guidance](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public)
- **Pre-existing/out of scope:** mutable search paths on two revision-safety trigger functions. [Advisor guidance](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- **Disposable Auth configuration:** leaked-password protection disabled. [Password guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

No advisor finding identifies an unreviewed A27 private-helper grant, anon wrapper grant, direct Approval/Progress mutation grant, or mutable search path in the new A27 functions.

## Validation

- Focused Approval/Progress/identity regression: PASS — 39/39 tests across 3 files.
- Typecheck: PASS.
- Lint: PASS.
- Full test suite: PASS — 320/320 tests across 60 files.
- Next.js production build: PASS.
- The build retains one pre-existing filename-casing warning for `ActivityRepository.ts` versus `activityRepository.ts`; it is outside this bounded remediation and compilation succeeds.

## Scope and repository state

No branch, commit, push, pull request, or merge was created. Existing working-tree changes were preserved. The next bounded phase may proceed from this hardened Approval/Progress foundation.
