# A27 Option 2 — Step 5/6 DB-INVARIANT Atomic/Auth Propagation

## Verdict

**PASS.** The Step 4 DB-INVARIANT pattern is propagated to every mandatory Step 5 workflow without changing Approval/Progress architecture or sealed A17–A26 lifecycle ownership.

Production project `dihwyhlkoymedsxjuiul` was not queried, migrated, inspected, or mutated. Every live database and security operation used disposable project `olxxofaegsvrctbqflyv` after confirming it was `jkr-site-diary-a27-test` and `ACTIVE_HEALTHY`.

## Implementation

Forward migration `supabase/migrations/20260816140000_a27_step5_atomic_propagation.sql` adds exact authenticated wrappers and inaccessible private transactional cores for:

- Programme plus baseline Revision creation and pointer linkage;
- Revision approval, previous-current supersession, and Programme pointer transition;
- prepared MSP Revision plus all Task persistence;
- Activity create/update/start/complete plus mandatory Activity history;
- Workforce create/update plus Audit;
- Site Diary create/update plus `site_diary_logs` and Audit;
- per-item carry-forward through the same Site Diary create boundary;
- authenticated Programme archive and Task PATCH.

All public wrappers are `SECURITY DEFINER` with a fixed empty search path and fully qualified objects. Actor-bearing commands enforce `auth.uid()`. Only exact public signatures are granted to `authenticated`; `PUBLIC` and anon have no wrapper execution, while authenticated has no private-schema usage or private-helper execution.

Step 4 direct mutation revocations remain in force. The migration also supplies the already-defined DB-017 Workforce and DB-018 Trade Library structures missing from the disposable baseline, enables RLS on both, and permits authenticated reads only. Existing revision-safety trigger logic is unchanged; its search path is now fixed so it composes safely with empty-search-path wrappers.

Application mutation routes construct authenticated Supabase clients from verified bearer tokens. No service-role key was added and no browser secret was introduced. Programme archive ignores the request actor, Task PATCH requires verified identity, and Workforce POST/PATCH has no SYSTEM fallback.

## Real disposable ACID evidence

### Programme creation

- PA1 duplicate Audit key after Programme/Revision work: zero Programme, zero Revision, zero new Audit.
- PA2 success: exactly one Programme, one baseline Revision, correct current pointer, and one Audit.

### Revision approval

- RA1 duplicate Audit key after transition work: target remained Draft, previous Revision remained Approved, and Programme pointer was restored.
- RA2 success: target Approved, exactly one Approved current Revision, and Programme pointer correct.

### MSP ingestion

- MI1 invalid second Task: zero imported Revision and zero Tasks.
- MI2 success: one Revision and exactly two prepared canonical Tasks committed with Import Audit.

### Activity

- AC1 duplicate Activity-log key: zero Activity.
- AC2 duplicate transition-log key: original `New` state preserved.
- AC3 create success: Activity plus one `NEW` log.
- AC4 start/complete success: lifecycle changes paired with `UPDATE` logs; final status `Completed` and three total logs for create/start/complete.

### Workforce

- WF1 duplicate Audit key: zero Workforce row.
- Create/update success: Workforce and actor-matched Audit committed exactly once per command; derived total was correct.
- Update duplicate Audit key preserved the prior counts.
- Canonical authenticated PATCH returned 200; verified actor remained authoritative.

### Site Diary

- SD1 duplicate Audit key after row/history work: zero Site Diary and zero partial history.
- SD2 duplicate Audit key on update: original notes preserved.
- SD3 success: Site Diary, `NEW` history, and Audit committed.
- SD4 success: updated row, `UPDATE` history, and Audit committed; two history and two Audit rows total.

### Carry-forward

Two-item representative run preserved per-item semantics: the valid active Activity committed a complete Site Diary/history/Audit unit; the Completed Activity was rejected and left zero rows. The batch was not made transaction-wide atomic.

## Security and canonical path evidence

- Governed `PUBLIC` mutation grants: 0.
- Governed anon mutation grants: 0.
- Governed authenticated direct mutation grants: 0.
- Authenticated private A27 function execution: 0.
- Authenticated private-schema usage: false.
- Authenticated exact public A27 wrappers: 17 total, comprising the four reviewed Step 4 wrappers and thirteen Step 5 wrappers.
- Anon and inherited `PUBLIC` A27 wrapper execution: 0.
- Forged actor RPC: rejected with zero persistence.
- Direct authenticated table insertion: denied with zero persistence.
- Direct illegal terminal Activity RPC: rejected; state remained Completed.

Canonical disposable HTTP results:

- Programme create: 201.
- Revision approve: 200.
- Activity create: 201.
- Task PATCH: 200.
- Workforce PATCH: 200.
- Site Diary PATCH: 200.
- Programme archive: 200 while a forged body actor was ignored.

## Security advisor

Final disposable-only advisor result:

- 17 `authenticated_security_definer_function_executable` warnings: **EXPECTED INTENTIONAL**. Each corresponds to an exact authenticated DB-INVARIANT wrapper with fixed search path, `auth.uid()` actor binding where relevant, inaccessible private core, independent invariant enforcement, and passing adversarial tests.
- Eight RLS-disabled findings on pre-existing public tables (`programme`, `programme_revision`, `activity`, `site_diary`, `audit`, `task`, `approval`, `progress`): **PRE-EXISTING NON-BLOCKING** for this mutation-surface step because all direct mutation grants are revoked. Broader read/RLS design remains a non-goal.
- Leaked-password protection disabled on disposable Auth: **PRE-EXISTING NON-BLOCKING**.
- Mutable function search-path findings: **0**.
- New Workforce/Trade Library RLS findings: **0**.

References: [function privilege/security guidance](https://supabase.com/docs/guides/database/functions), [RLS advisor guidance](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public), [authenticated definer advisor guidance](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

## Validation

- Typecheck: PASS.
- Lint: PASS.
- Full suite: PASS — 320/320 tests across 60 files.
- Next.js production build: PASS.
- The build retains the pre-existing `ActivityRepository.ts` versus `activityRepository.ts` casing warning, explicitly outside Step 5 scope.
- `git diff --check`: PASS; only Windows line-ending notices were emitted.

## Governance

- A17–A26 migrations were not modified.
- Step 4 migrations were not rewritten during Step 5.
- No batch-wide carry-forward transaction, unsupported lifecycle, full RBAC/RLS redesign, frontend redesign, Trade Library redesign, or deferred feature was introduced.
- No branch, commit, push, pull request, or merge was created.
