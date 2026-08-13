# Audit A19 — Blocker-Resolution Independent Verification

**Role:** Independent security / architecture reviewer  
**Repository state:** `develop`, inspected 2026-08-12  
**Method:** Current source, migration history, baseline schema, repository interfaces, route wiring, and tests. Proposed remediation was not credited as implemented evidence.

## 1. Executive Verdict

**NOT AUTHORIZED.** None of the three claimed remediations is presently complete. The current repository permits actor spoofing, has no clean executable canonical Activity provisioning endpoint, and has no canonical Activity lifecycle-log persistence schema aligned with its repository.

## 2. Blocker 1 — Authentication / Actor Identity

**Classification: UNRESOLVED / BLOCKING**  
**Security risk: Critical — client-controlled actor impersonation.**

### Complete identity chain

`AuthContext` obtains a browser Supabase session using `supabase.auth.getSession()` and reacts to browser auth changes. It does not attach that session/JWT to the examined API calls. The server-side `getSupabaseServerClient()` is created with the public anonymous key and no request Authorization header or cookie is supplied to it.

`extractIdentity(request)` has no Supabase call, JWT validation, signature verification, session lookup, expiry check, or `getUser()` call. It returns a non-empty `x-user-id` header verbatim; otherwise it returns the text following `Authorization: Bearer ` verbatim. Therefore a malicious client can send `x-user-id: <another-user-uuid>` and the API will pass that chosen identity to the service.

### Representative route evidence

| Route | Current actor source | Finding |
|---|---|---|
| `POST /api/site-diary` | `extractIdentity(request)` | Rejects an absent header, but accepts a spoofed header/token string. |
| Programme revision create/approve/archive (A17-style protected routes) | `extractIdentity(request)` | Same spoofable mechanism; no authorization/scope check follows extraction. |
| `POST /api/activities/[activityId]/start` | `body.started_by` | No identity extraction at all. |
| `POST /api/activities/[activityId]/complete` | `body.completed_by` | No identity extraction at all. |
| `POST /api/site-diary/[diaryId]/activities` | `body.created_by` | No identity extraction at all. |
| `POST /api/activity` | `body.submitted_by` | Route is also broken due to a missing service import. |

### Answers to required questions

A. **No.** `extractIdentity` does not cryptographically or session-verify the user.  
B. **Yes.** It returns `x-user-id` or Bearer-header contents.  
C. **Yes.** A client can impersonate another user through `x-user-id`.  
D. **No verified server-side Supabase identity mechanism is used elsewhere.** `src/lib/supabase.ts` exposes browser, anonymous server, and service-role clients, but no examined route invokes `auth.getUser(token)`, uses a server-auth helper, or validates bearer claims.  
E. **Not proven.** A secure server-side mechanism could be introduced outside A16/A17 domain semantics, but the current repository provides no already-used verified pattern to reuse.  
F. **No.** `extractIdentity` alone is insufficient.

**Evidence:** `src/context/AuthContext.tsx` (`getSession`, `onAuthStateChange`); `src/lib/supabase.ts` (`getSupabaseServerClient`); `src/app/api/_shared/identity.ts` (`extractIdentity`); `src/app/api/_shared/handleRoute.ts`; `src/app/api/site-diary/route.ts`; `src/app/api/programme-revision/route.ts`; `src/app/api/programme-revision/[revisionId]/approve/route.ts`; lifecycle routes above. The route integration tests deliberately use `x-user-id: test-actor`, so they test header forwarding—not authentication.

## 3. Blocker 2 — Canonical Activity Provisioning

**Classification: UNRESOLVED / BLOCKING**  
**Security/operational risk: High — broken public route, misleading route ownership, and no end-to-end executable transaction.**

`OpenActivityService` is the authoritative intended service: it creates `New` Activities, validates revision operational status, validates a Task when a task repository is injected, appends `NEW`/`UPDATE` lifecycle entries, and enforces `New → In Progress → Completed`. `createOpenActivityService()` wires it through `ActivityRepository`, `ActivityLogRepository`, `ProgrammeRevisionRepository`, and `DatabaseTransactionManager`; `LazyPlatformServiceContainer.openActivity()` exposes that composition root.

This does **not** prove a canonical provision route is executable:

- `POST /api/activity`, `GET /api/activity/[activityId]`, `GET /api/activity/task/[taskId]`, and `GET /api/activity/revision/[revisionId]` import `@/services/activityService`. That file does not exist; only `legacyActivityService.ts.obsolete` exists. These routes cannot compile/execute as written.
- The only composed creation route is `POST /api/site-diary/[diaryId]/activities`. It calls `OpenActivityService`, but accepts the caller’s `created_by`, accepts a diary route parameter that it expressly ignores, and exposes Activity creation beneath a Site Diary path despite the locked ownership rule. It is not a clean canonical Activity provisioning API.
- The composed factory does not inject `taskRepository`, so OpenActivityService’s task/programme/revision validation branch is not active in production composition. The database FK remains a last-line constraint, not the service-level task affinity guarantee exercised by REM-005 unit tests.
- Every composed create/start/complete mutation writes through `ActivityLogRepository` to a table absent after DB-001. Thus persistence fails even if routing is corrected.
- `DatabaseTransactionManager` calls `withTransaction`, whose current implementation is a dummy transaction: `commit` and `rollback` are no-ops around separate Supabase calls. It does not establish database atomicity for Activity plus log writes.

### Contracts and A16/A17 boundary

The broken legacy `POST /api/activity` contract requires `programme_id`, `revision_id`, `task_id`, `subtask`, `activity_date`, `notes`, and `submitted_by`. The composed `CreateActivityRequestDto` takes `programme_id`, `revision_id`, optional `task_id`, `subtask`, and `created_by`; the service creates its own date and empty notes. A direct repoint is therefore not contract-compatible. Repointing to the governed service could preserve A16/A17 **domain** semantics only if separately designed and tested; the proposed route substitution is not a no-op repair.

Existing OpenActivity tests instantiate the service with mock repositories/transaction managers. REM-005 tests can inject a task repository. They do not import the broken `/api/activity` family, execute the actual composition with a migrated database, prove transaction rollback, or prove the missing `site_diary_logs` schema exists.

**Evidence:** `src/services/OpenActivityService.ts` (`createActivity`, `transitionStatusWithLog`, `startActivity`, `completeActivity`); `src/composition/activityComposition.ts`; `src/app/api/_shared/container.ts`; `src/app/api/activity/route.ts`; `src/app/api/activity/[activityId]/route.ts`; `src/app/api/activity/task/[taskId]/route.ts`; `src/app/api/activity/revision/[revisionId]/route.ts`; `src/app/api/site-diary/[diaryId]/activities/route.ts`; `src/transactions/DatabaseTransactionManager.ts`; `src/lib/db.ts`; `tests/unit/services/OpenActivityService.test.ts`; `tests/unit/rem005OpenActivityApiSchema.test.ts`; `tests/integration/services/openActivityService.integration.test.ts`.

## 4. Blocker 3 — Site Diary Logs / Activity Log Persistence

**Classification: UNRESOLVED / BLOCKING**  
**Security/data-integrity risk: Critical — missing table plus unresolved ownership semantics.**

### Proven ownership history

The original `baseline.sql` defines `site_diary_logs` with `id`, nullable `site_diary_id`, `action`, AHI/subtask/work-status/daily fields, `submitted_by`, and `created_at`; its FK is to legacy `site_diary(id)`. It was a **legacy Site Diary audit/history table**, not an Activity lifecycle table.

DB-001 deliberately renamed it to `legacy_site_diary_logs` together with `site_diary`, preserving the legacy FK as `legacy_fk_site_diary_logs` to `legacy_site_diary(id)`. This was to archive structurally ambiguous legacy records and free the canonical Site Diary namespace—not to transform it into an Activity log.

REM-007 designates a Site Diary Log as Audit Engine-owned, parented by Site Diary. The later SPEC-001 documents likewise distinguish daily operational `site_diary_logs` from a proposed Activity-owned administrative sidecar, `activity_workflow_events`. DB-021 already defines the generic, immutable `audit` table and requires every Activity lifecycle transition to generate an Audit record. These authorities do not establish a canonical `activity_logs`/Activity lifecycle snapshot table.

### Repository mismatch

`ActivityLogRepository` currently requires a different, uncreated schema:

| Required column | Required meaning |
|---|---|
| `log_id` | lifecycle entry PK |
| `activity_id` | Activity parent/FK |
| `event_type` | `NEW` or `UPDATE` |
| `snapshot_data` | immutable Activity snapshot JSON |
| `logged_at` | event timestamp |
| `logged_by` | actor |

It inserts and queries this shape under the name `site_diary_logs`, but no current migration creates that table or these columns. There is no `activity_logs` table or migration. The integration test only mocks an adapter and explicitly assumes the `site_diary_logs` table; it is not database evidence.

### Answers to required questions

A–C. `site_diary_logs` originated as the legacy Site Diary audit log, and DB-001 renamed it because its parent/identity/schema were legacy and incompatible with canonical DB-014/DB-015. It was not an Activity lifecycle log.  
D. **Not on the evidence provided.** Activity lifecycle logs must not be written to the archived legacy table, and the current `site_diary_logs` target does not exist.  
E. **No intended canonical Activity log table was implemented.** There is a generic canonical `audit` table and a separately proposed, not implemented `activity_workflow_events` table for administrative events. Neither matches the repository’s Activity snapshot schema.  
F. The exact repository schema is listed above.  
G. A future approved schema must specify an immutable append-only write model, PK, `activity_id` FK, actor FK/identity type, event type constraint, snapshot type, activity/time indexes, least-privilege grants/RLS, and a verified service-only write path. Current migrations contain no RLS/policy implementation for it.  
H. **Yes.** Recreating `site_diary_logs` with Activity columns would reuse the name of an intentionally archived legacy Site Diary log and contradict proven parent ownership unless HQ explicitly supersedes that design.  
I. A new Activity-owned lifecycle log table may be required, but that is a governance/design decision—not a justified A19 migration. The existing generic `audit` model must first be reconciled with the desired lifecycle snapshot/history contract.  
J. **No migration is presently architecturally authorized.** The minimum correct next step is an approved ownership/schema decision, then one dedicated migration for the selected canonical owner; it must not recreate the archived legacy table by name or alter A16/A17 protected behavior.

**Evidence:** `baseline.sql` (`site_diary_logs` DDL/FK); `supabase/migrations/20260809220000_db001_database_canonicalization.sql`; `src/repositories/ActivityLogRepository.ts`; `src/repositories/IActivityLogRepository.ts`; `src/types/openActivity.ts`; `src/services/OpenActivityService.ts`; `docs/10_Development/REM-007-ARCHITECTURE-SUPERSESSION-MIGRATION-SPECIFICATION.md` §4; `docs/06_Database/DB-021-Audit-Schema.md`; `docs/10_Development/SPEC-001-SUSPEND-CANCEL-CANONICAL-MECHANISM.md` §§3, 9; `tests/integration/services/openActivityService.integration.test.ts`.

## 5. AG Claim vs Independently Verified Reality

| AG claimed remediation | Independently verified reality | Result |
|---|---|---|
| Use `extractIdentity(request)` | It is a header/token-string extractor, not authentication; current lifecycle routes do not use it. | Fail |
| Repoint broken Activity routes to OpenActivityService | The target service/composition exists, but the public routes are broken or misleading, contracts differ, production composition omits task validation, log persistence is missing, and transactions are not real. | Fail |
| Create a canonical `site_diary_logs` migration | `site_diary_logs` is a deliberately archived legacy Site Diary log name. No evidence proves it is the canonical Activity lifecycle owner; creating it now risks resurrecting legacy semantics. | Fail |

## 6. Required Remediation

Before any A19 Phase 2 authorization, HQ must require separate, governed work that:

1. establishes genuine server-side Supabase/JWT verification and derives actor identity only from verified claims; applies it consistently without inventing RBAC or changing A16/A17 domain behavior;
2. defines one canonical Activity provisioning API/contract under an Activity path, composed through OpenActivityService, with service-level Task validation and real transactional behavior; and
3. resolves Activity lifecycle audit ownership against REM-007, DB-021, and the legacy Site Diary log archive, then approves and implements the corresponding canonical schema/repository/test contract.

## 7. Phase 2 Authorization Gate

| Mandatory condition | Current state | Gate |
|---|---|---|
| Actor identity is authenticated and non-spoofable | `x-user-id` and bearer text are accepted without verification | Fail |
| Canonical Activity routes execute through the governed service boundary | Broken legacy imports; misleading composed route; missing log table; dummy transaction | Fail |
| Activity lifecycle persistence has proven canonical schema alignment | No canonical schema; repository targets an archived legacy table name with incompatible columns | Fail |

Because all three mandatory conditions fail, **A19 Phase 2 is NOT AUTHORIZED.**

## 8. Final Recommendation

Reject the AG recommendation to authorize Phase 2. Do not implement the three proposed changes as a bundled A19 fix: authentication verification and lifecycle-log ownership are prerequisite architecture/security decisions, not routine route wiring. Preserve A16/A17 and the locked Activity state machine while those decisions are resolved.

Authentication: **FAIL**  
Activity provisioning: **FAIL**  
Activity log persistence: **FAIL**

A19 Phase 2:  
**NOT AUTHORIZED**
