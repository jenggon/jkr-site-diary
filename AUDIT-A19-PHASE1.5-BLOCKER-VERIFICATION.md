# Audit A19 Phase 1.5 — Blocker Verification

## 1. Scope

Independent, adversarial verification of `feature/a19-phase1.5-blocker-remediation` against `develop`. This review inspected the actual diff, runtime route graph, identity implementation, persistence migration, repository/service dependencies, and requested quality checks. It did not modify application code, migrations, tests, or prior audit documents.

## 2. Repository Baseline

- Checked-out branch: `feature/a19-phase1.5-blocker-remediation`.
- Diff against `develop`: four Activity routes, `IActivityRepository`, `ActivityRepository`, one `site_diary_logs` migration, and test mock updates.
- The remediation has **not** modified `src/app/page.tsx`, Site Diary routes, A16 migration/state-machine files, or the A17 Programme Revision routes. `git diff --check develop...HEAD` and working-tree `git diff --check` passed.
- The two pre-existing independent audit documents remain untracked; this report is the only audit artifact added by this verification.

## 3. Blocker 1 — Authenticated Actor Identity

**Classification: NOT RESOLVED**  
**Risk: Critical — caller-controlled impersonation.**

`POST /api/activity` no longer takes `submitted_by` from its payload and now produces 401 when `extractIdentity()` returns null. That is a narrow improvement only.

It is not an authenticated request boundary. `src/app/api/_shared/identity.ts` returns a non-empty `x-user-id` header verbatim, or the string after `Authorization: Bearer ` verbatim. Its own comment says JWT verification is for the future. It does not invoke Supabase `auth.getUser`, validate a JWT signature, validate expiry/audience/issuer, or bind a request session/cookie. A client can select a real victim UUID in `x-user-id` and cause it to be used as `createdBy` / `updatedBy`; the UUID database type does not establish ownership.

`AuthContext` only retrieves and observes the browser session (`src/context/AuthContext.tsx`). It does not establish the server-side identity for these API requests. `src/lib/supabase.ts` exposes an anonymous server client but the current routes do not pass the incoming authorization data to it for verification. The actual A17 Programme Revision routes use the same `extractIdentity` convention, so the remediation matches an existing **weak** convention rather than a verified security convention.

| Verification question | Evidence-backed result |
|---|---|
| POST derives actor from a genuinely authenticated request | No. It derives it from spoofable headers. |
| `submitted_by` authoritative source removed | Yes, from the new POST contract. |
| Missing identity is 401 | Yes, only when neither accepted header supplies a non-empty string. |
| Header/body impersonation possible | Yes: `x-user-id` and Bearer contents can be client chosen. `submitted_by` is ignored by the new POST but does not cure header impersonation. |
| JWT cryptographically validated | No. |
| Identity classification | **C — effectively trusts caller-controlled identity.** |

Relevant tests do not prove authentication: Site Diary and Programme Revision route tests construct requests with `x-user-id: test-actor`; no test verifies a Supabase session/JWT or rejects a forged identity.

## 4. Blocker 2 — Canonical Activity Provisioning

**Classification: NOT RESOLVED**  
**Risk: Critical — the remediated creation route cannot compile into the application.**

The missing `@/services/activityService` imports were removed from the four requested routes. `OpenActivityService` and the real factory do exist at `src/services/OpenActivityService.ts` and `src/composition/activityComposition.ts`, respectively. The service provides the intended `New → In Progress → Completed` state behavior and does not create Site Diary records.

However, `POST /api/activity` and `src/app/api/activity/[activityId]/route.ts` import `@/composition/openActivityComposition`, which does not exist. The actual factory is `@/composition/activityComposition`. Production build independently failed with:

```
Module not found: Can't resolve '@/composition/openActivityComposition'
```

for both routes. Thus POST cannot reach OpenActivityService at runtime. The revision/task read routes also use `ActivityRepository` through a browser `supabase` client rather than the canonical composition/root server adapter, and their authentication remains spoofable.

Additional unresolved contract/dependency issues:

- `task_id` is optional in the new route schema and in `CreateActivityRequestDto`, but DB-014 marks `activity.task_id` NOT NULL. `OpenActivityService` substitutes `''` when absent. This is not a valid canonical task-provisioning command.
- `createOpenActivityService()` injects no task repository, so its Task/programme/revision affinity check is absent in the production composition. The REM-005 tests only prove this check when they explicitly inject a mock task repository.
- The route does derive `createdBy` from `extractIdentity`, but that does not satisfy the required verified identity boundary.
- The state starts `New` in `OpenActivityService`, and that service does not create Site Diary data, but neither fact proves the non-compiling POST route executable.
- `DatabaseTransactionManager` still delegates to `withTransaction`, whose implementation uses a dummy no-op transaction object; it does not atomically couple Activity and log persistence.

The branch does not modify A16/A17 protected domain logic or introduce automatic Activity creation from Site Diary submission. Those governance points pass, but they do not resolve the executable provisioning blocker.

## 5. Blocker 3 — Activity Log Persistence

**Classification: NOT RESOLVED**  
**Risk: Major architectural/data-integrity blocker.**

DB-001 did rename the legacy `site_diary_logs` table to `legacy_site_diary_logs` and preserved its foreign key to `legacy_site_diary`; this correctly isolates legacy data. The new migration `supabase/migrations/20260812120000_a19_site_diary_logs.sql` creates the columns expected by `ActivityLogRepository`: `log_id`, `activity_id`, `event_type`, `snapshot_data`, `logged_by`, and `logged_at`. It has an Activity FK and two read indexes.

That structural column match does not establish canonical correctness:

- The legacy table was an AHI/subtask/daily Site Diary audit log parented by `site_diary(id)` (`baseline.sql`). REM-007 defines `site_diary_logs` as Audit Engine-owned and parented by Site Diary. The new migration reuses that deliberately archived name for an Activity-owned lifecycle snapshot table. This is an unresolved domain-ownership conflict, not merely a missing table repair.
- The migration has no append-only protection, no RLS/policies/grants, no actor/user FK, no event-type check limiting values to the repository’s `NEW | UPDATE`, and uses `ON DELETE CASCADE`, which permits Activity deletion to remove lifecycle history. These do not prove immutable audit-log semantics.
- The repository has no explicit ordering for `findLogsByActivityId`; the Activity GET route previously uses history to derive a latest state elsewhere. The migration does not provide a deterministic compound lookup/order contract.
- Activity creation, start, and completion cannot be demonstrated against this migration because the provisioning route graph fails to build. Existing `openActivityService.integration.test.ts` uses an in-memory/mock adapter and literally labels the table assumption; it neither applies migration SQL nor exercises a real database.
- The existing dummy transaction means a failed log insertion can leave an Activity write committed; therefore even an applied table would not prove atomic lifecycle persistence.

The new table does not resurrect the old *columns*, but it does reuse the old table name for an incompatible Activity parent/owner. It is therefore not safe to classify as a proven canonical `site_diary_logs` remediation without an approved ownership decision.

## 6. Test Evidence

Executed independently on the remediation branch:

| Check | Actual result | Qualification |
|---|---|---|
| `git status` | Two earlier untracked audits before this report; remediation branch otherwise checked out | No remediation source changes were uncommitted. |
| `git diff --check develop...HEAD` | Pass | Formatting only. |
| `npm run lint` | Pass | Required elevated filesystem access after a sandbox EPERM. |
| `npm run typecheck` | Pass | `tsconfig.json` explicitly excludes `src/app/api/**/*`; it does not check the remediated routes. |
| `npm test` | Pass — 48 files, 223 tests | No test imports the remediated Activity routes; lifecycle integration uses mock persistence. |
| `npm run build` | **Fail** | Missing `@/composition/openActivityComposition` in two remediated production routes. |

The reported 223 tests are therefore not evidence that the three blockers are resolved. They do not test authenticated identity, forged-header rejection, real route compilation/execution, or applied-migration Activity log writes/transitions.

## 7. Git / Diff Evidence

The implementation diff did not change frontend workflow, Site Diary submission/carry-forward routes, A16 state-machine/revision safety, or A17 Programme Revision behavior. It added the migration and rewired legacy Activity routes, but the two creation/update routes refer to a nonexistent composition module. The diff also makes task identity optional despite DB-014’s required task relationship.

## 8. Governance Verification

| Governance check | Result |
|---|---|
| A16 state-machine semantics changed | No evidence of change. |
| A17 protected validation changed | No evidence of change. |
| Unsafe legacy string-to-UUID translation API added | No. |
| Site Diary submission auto-creates Activity | No. |
| A19 Phase 2 dashboard/page workflow started | No. `page.tsx` is untouched. |
| Historical A18/A19 evidence fabricated/altered | No evidence in the remediation diff. |
| New log schema has a proven authorized owner | No; it conflicts with REM-007’s recorded Site Diary Log ownership. |

## 9. Remaining Risks

1. Any caller can impersonate any known UUID through `x-user-id`; Bearer values are also accepted as identity strings.
2. Production build failure makes canonical Activity POST/PATCH inaccessible.
3. Task identity is optional in an API that must provision a DB-014 Activity with a required Task FK.
4. The lifecycle log migration has unresolved ownership, immutability, authorization, and deletion-retention defects.
5. Mock-only lifecycle tests and an excluded API directory conceal the production route failure.
6. Activity/log persistence is not truly transactional.

## 10. Final Verdict

The claim **“A — BLOCKERS RESOLVED” is not defensible** on the current repository evidence.

**BLOCKER 1: NOT RESOLVED**  
**BLOCKER 2: NOT RESOLVED**  
**BLOCKER 3: NOT RESOLVED**

**C — MAJOR ARCHITECTURAL/SECURITY BLOCKER REMAINS. A19 Phase 2 is not authorized.**
