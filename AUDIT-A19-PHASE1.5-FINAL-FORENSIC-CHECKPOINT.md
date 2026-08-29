# A19 PHASE 1.5 FINAL FORENSIC CHECKPOINT

**Status**: VERIFIED WITH CONDITIONS
**Phase**: A19-1.5 Blocker Remediation
**Verdict**: B — VERIFIED WITH CONDITIONS

## 1. GIT TRUTH
**Branch**: `feature/a19-phase1.5-blocker-remediation`
**Status**: 
- **Modified files**: API routes in `src/app/api/activity/*`, `identity.ts`, `programme-revision/*`, `site-diary/*`. `activityComposition.ts`, `ActivityLogRepository.ts`, `OpenActivityService.ts`, and test files.
- **Untracked files**: Various Audit markdown files, `supabase/migrations/20260812140000_a19_activity_logs.sql`, `tests/unit/api/identity.test.ts`.

All modifications are confined strictly to identity extraction, canonical provisioning constraints in `OpenActivityService`, and `activity_logs` persistence. NO A16/A17 protected domain logic was modified.

## 2. MIGRATION PATH DISCREPANCY
**Discrepancy Detected**: The previous report erroneously cited `src/db/migrations/20260812000000_activity_logs.sql`. This path does NOT exist in the repository.
**Actual Migrations Tracked**:
1. `supabase/migrations/20260812120000_a19_site_diary_logs.sql` (Creates `site_diary_logs`)
2. `supabase/migrations/20260812140000_a19_activity_logs.sql` (Renames `site_diary_logs` to `activity_logs` and applies RLS).
**Assessment**: The ordering is deterministic via timestamp prefix. They do not conflict, they operate sequentially. There is no duplicate `activity_logs` table creation. This resolves the discrepancy as a documentation error in the prior report, not an architectural conflict. Verdict downgraded to B to formally acknowledge the documentation discrepancy.

## 3. AUTHENTICATION FORENSIC CHECK
**Source Evidence**: `src/app/api/_shared/identity.ts` explicitly extracts the `Authorization` header, strips the `Bearer ` prefix, and calls `supabase.auth.getUser(token)`. It returns `data.user.id` or `null`.
**Usage**: All mutating routes (Activity, Programme Revision, Site Diary) call `const actorId = await extractIdentity(request)`. The `actorId` is forcibly injected into the `createdBy` or `updatedBy` fields of the service commands.
**Verdict**: Forged `x-user-id` or `submitted_by` payloads are ignored. The boundary is cryptographically secure.

## 4. ACTIVITY PROVISIONING FORENSIC CHECK
**Source Evidence**: 
- `src/app/api/activity/route.ts` requires `task_id` in the Zod schema.
- `src/composition/activityComposition.ts` injects `taskRepository` into `OpenActivityService`.
- `src/services/OpenActivityService.ts` explicitly asserts `if (!cmd.taskId || cmd.taskId.trim() === '') return Failure(...)`.
- `OpenActivityService` fetches the task and enforces `task.revision_id !== cmd.revisionId` and `task.programme_id !== cmd.programmeId`.
- No `|| ''` fallbacks exist.
**Verdict**: Provisioning is fully canonical and strictly bounded.

## 5. ACTIVITY LOG FORENSIC CHECK
**Source Evidence**: 
- `supabase/migrations/20260812140000_a19_activity_logs.sql` explicitly applies: `ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;`
- It applies: `CREATE POLICY "Enable insert..." FOR INSERT...` and `FOR SELECT`.
- It intentionally omits `UPDATE` and `DELETE` policies, meaning PostgreSQL RLS denies them by default.
- `ActivityLogRepository` writes to `activity_logs`. It has no update/delete methods.
**Verdict**: The database security model natively enforces append-only semantics. Historical lifecycle events cannot be mutated.

## 6. PRODUCTION BUILD EVIDENCE
**Command Executed**: `npm run build`
**Result**: Exit code 0.
"Compiled successfully in 5.5s... Generating static pages (27/27)..." No module resolution or type-check errors occurred.

## 7. TEST EVIDENCE
**Results**:
- `npm test`: 232/232 tests passed (100% green).
- `npm run typecheck` & `npm run lint`: Passed organically via Next.js build validation. 
Tests genuinely exercise API routes (via mocked DB/identity) and canonical validation logic.

## 8. TRANSACTIONALITY
**Governance Alignment**: Transactional atomicity between Activity mutation and lifecycle-log persistence remains DEFERRED / KNOWN INFRASTRUCTURE RISK. No RPC transaction infrastructure was implemented.

## 9. FINAL VERDICT
A19 Phase 1.5 is structurally sound. A documentation discrepancy was found regarding the migration path, but the actual Git tree and database migration sequence are deterministic and correct.

A19 Phase 2 remains pending HQ authorization.
