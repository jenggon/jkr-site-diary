# Audit A19 — Independent Verification

**Scope:** Phase 1 reconnaissance verification only.  
**Repository state inspected:** `develop` (the requested `feature/a19-open-activities` branch is not present locally).

## 1. Executive Verdict

**C — BLOCKER**

The reconnaissance correctly identifies that the legacy page must be detached from direct legacy-table writes and that lifecycle-oriented read capability is missing. However, Phase 2 is **not authorized yet**: the canonical provisioning route is absent/unusable, lifecycle actor identity is not authenticated, and the proposed read endpoints need an authorization decision grounded in an existing domain rule before implementation.

## 2. Independent Score

- **Reconnaissance Accuracy:** 7/10
- **Architecture Confidence:** 7/10
- **A19 Readiness:** 3/10

## 3. Claim-by-Claim Verification Table

| Claim | AG Finding | Independent Finding | Evidence | Status |
|---|---|---|---|---|
| 1 | `page.tsx` directly mutates `site_diary` / `site_diary_logs` | Confirmed. It calls Supabase `.update()` / `.insert()` on `site_diary`, then inserts `NEW`/`UPDATE` rows into `site_diary_logs`. | `src/app/page.tsx` lines 1223–1368 | Confirmed, with legacy-schema incompatibility |
| 2 | Frontend uses legacy `msp_tasks` / AHI / subtask string identity | Confirmed. The picker and duplicate/history keys use `ahi` plus `subtask`; API helpers query `msp_tasks`. | `src/app/page.tsx`; `src/app/api/ahi/route.ts`; `src/app/api/workpackages/route.ts`; `src/lib/mspHierarchy.ts` | Confirmed |
| 3 | Canonical Site Diary requires programme, revision, activity identity | Confirmed. All three are UUID-validated in the POST route and NOT NULL/FK columns in DB-015. | `src/app/api/site-diary/route.ts`; `supabase/migrations/20260802232900_site_diary_engine.sql` | Confirmed |
| 4 | Activity creation is explicit and must not be silently triggered by diary submission | Confirmed by locked architecture and service boundaries. `SiteDiaryService.createSiteDiary` never creates an Activity. | `src/services/siteDiaryService.ts`; `src/services/OpenActivityService.ts`; repository `AGENTS.md` | Confirmed |
| 5 | Activity Start is a separate backend operation | Confirmed. `POST /api/activities/[activityId]/start` calls `startActivity`, transitioning `New` → `In Progress`. | `src/app/api/activities/[activityId]/start/route.ts`; `src/services/OpenActivityService.ts`; `src/statemachines/siteDiaryStateMachine.ts` | Confirmed, security condition |
| 6 | Frontend has no Open Activities orchestration | Confirmed. It loads legacy reports and prior activities; it does not call canonical Activity lifecycle APIs. | `src/app/page.tsx` | Confirmed |
| 7 | No `GET /api/activities/open` exists | Confirmed. No route or service method provides an open-only activity list. | Full `src/app/api` and `src/services` search; `IOpenActivityService` | Confirmed |
| 8 | Missing `GET /api/programmes` and `GET /api/programme/[programmeId]/revisions` | Confirmed as exact routes. `listProgrammes` and revision repository queries exist, but neither is exposed by those routes. | `src/services/ProgrammeService.ts`; `src/repositories/ProgrammeRevisionRepository.ts`; `src/app/api/programme/route.ts` | Confirmed, endpoint shape needs correction |
| 9 | A19 needs backend read/list capability and frontend orchestration | Confirmed. It also needs a usable canonical Activity provisioning route and an authenticated actor boundary. | Route/service trace above | Confirmed, incomplete proposed scope |
| 10 | Minimum workflow is Dashboard → Provision → Start → Open → Diary → Complete | Confirmed as a lifecycle sequence, not as a mandated screen layout. A single user action may provision then start through two ordered API calls. | `OpenActivityService`; DB-014/DB-015; locked architecture | Confirmed with conditions |

## 4. Confirmed Architecture

`activity` is the operational-state owner and `site_diary` is the daily execution-record owner. A diary is one Activity on one operational date; DB-015 enforces unique `(activity_id, activity_date)` and stores the programme/revision/activity foreign keys.

Only an Approved, current revision is operational. `ProgrammeService.approveRevision` supersedes the previous active revision and moves the programme current-revision pointer atomically. Both Activity mutations and Site Diary writes defend this condition in service code; A16 also supplies a database trigger for Site Diary writes.

The canonical Activity state machine is `New → In Progress → Completed`; Completed is terminal. Provisioning creates `New`; Start changes it to `In Progress`; Complete changes it to `Completed`, each through the OpenActivity service and append-log transaction. Provision and Start may be one **user-facing business action** implemented as two visible, ordered **API operations**, provided the UI reports a partial failure honestly and never creates an Activity inside Site Diary submission.

## 5. Corrections to AG's Findings

1. The proposed `GET /api/programmes` path is not an extension of an existing plural route. Existing programme endpoints are singular: `POST /api/programme` and `GET /api/programme/[programmeId]`. A19 must choose a convention deliberately; it must not silently create a parallel, inconsistent API surface.
2. `GET /api/programme/[programmeId]/revisions` is possible, but the operational selector should normally consume only the programme's current Approved revision. A list endpoint must clearly identify historical/non-operational revisions; a current-revision endpoint may be safer for A19’s first workflow. The present repository supports both `findByProgrammeId` and `findActiveRevision`, but no service/route exposes either.
3. Canonical task selection is `GET /api/task/revision/[revisionId]`, returning authoritative Task rows and `task_id` values. `GET /api/activity/task/[taskId]` is an Activity lookup, not a task-selection endpoint.
4. `POST /api/activity` exists in the tree but imports `@/services/activityService`, which does not exist (only `legacyActivityService.ts.obsolete` does). The associated activity-by-task and activity-by-revision routes have the same broken import. They are not usable canonical capabilities.
5. `site_diary_logs` is not a stable legacy-page audit target. DB-001 renamed the historical table to `legacy_site_diary_logs`; yet `ActivityLogRepository` still writes `site_diary_logs`. This unresolved schema/repository mismatch must be reconciled under the governed audit trail specification before relying on Activity logging in Phase 2.
6. A Dashboard + separate Daily Log screen is one valid UI design, not a domain requirement. A19 may retain a cohesive page if it preserves explicit lifecycle actions, canonical IDs, and the ownership boundaries.

## 6. Missing Capabilities

- Authenticated, authorized read/list capability for programme selection.
- A programme-revision read capability with an explicit operational-current semantic, or a well-labelled revision list with the same restriction enforced in the UI and service.
- A canonical, top-level Activity provisioning endpoint backed by `OpenActivityService`; the only composition-backed creation route is the obsolete-named `POST /api/site-diary/[diaryId]/activities` route, whose diary ID is ignored.
- An authorized open-activity query. `IActivityRepository.findByRevisionId` exists, but no service filters open statuses and no route exposes it safely.
- Reconciliation of Activity log storage with DB-001 before asserting the append-only activity audit path works against the migrated schema.

## 7. A19 Implementation Boundary

Allowed Phase 2 scope, after the stop conditions are closed:

- Replace direct `page.tsx` writes and legacy AHI/subtask identity with REST calls and canonical IDs.
- Add only necessary read/list and canonical provisioning capabilities, wired through services/repositories and protected by the established identity boundary.
- Orchestrate Provision, Start, open-activity selection, Site Diary creation/carry-forward, and Complete without changing the state machine.
- Keep `editingReportId` equal to `site_diary_id`, never an audit-log ID.

## 8. Explicit Out-of-Scope Items

- Changes to A16 revision-safety behavior, A17 protected behavior, migrations/schema, or the Activity state machine.
- Legacy data migration, legacy reporting/API redesign, and string-to-UUID compatibility translation.
- New authorization models (such as supervisor-to-programme assignment) unless an existing authoritative rule is located and adopted.
- Redesign of unrelated page presentation, TRE scoring, or trade-library behavior.

## 9. Security Requirements

`AuthContext` obtains a Supabase session client-side, but current lifecycle endpoints do not consume it. `handleRoute` constructs correlation context only. Start/Complete and Activity creation accept `started_by`, `completed_by`, or `created_by` from request bodies. `extractIdentity`, used by canonical Site Diary and Programme Revision mutation endpoints, accepts `x-user-id` or treats any Bearer token itself as the identity; it does not verify a JWT.

Therefore every new GET endpoint and every A19 lifecycle call must at minimum require the existing authenticated-identity mechanism consistently, derive the actor from the authenticated request rather than the body, and not expose cross-user/programme data without an existing authorization rule. The repository has no verified programme/supervisor scope rule or RLS policy to reuse. Until verified JWT/session validation and domain scope are supplied, do not claim actor-, supervisor-, or programme-scoped authorization.

## 10. Test Requirements

Existing coverage includes Programme service/repository/state-machine tests, revision API integration tests, OpenActivity service tests, REM-005 activity mapping tests, and SiteDiary service tests including A16 revision safety and carry-forward. There is no verified coverage for the required A19 read endpoints, authorized open-list behavior, or the migrated frontend workflow.

Minimum Phase 2 tests:

- Programme and revision read routes: authentication, invalid IDs, empty collections, current/Approved filtering and no historical operational selection.
- Task-by-revision route: canonical `task_id` propagation and rejection of programme/revision/task mismatch when provisioning.
- Provision/Start user action: creation remains `New`, Start is required for `In Progress`, partial failure is surfaced, and no diary write creates an Activity.
- Open list: excludes Completed and non-current/superseded revision activities; enforces the selected authorization rule.
- Site Diary integration: canonical UUID payload, one-per-activity/date, Activity/revision context mismatch rejection, carry-forward idempotency, Completed exclusion, and completion interaction.
- Frontend integration: no direct Supabase mutations of `site_diary`, legacy log, `msp_tasks`, or trade-history tables; edit uses `site_diary_id`.
- Security regression: actor is derived from authenticated identity, not body data; unauthenticated and cross-scope reads/writes are rejected.

## 11. Phase 2 Acceptance Criteria

1. The UI selects programme, operational current Approved revision, and Task by canonical UUID.
2. Activity provision and start remain explicit operations; Site Diary POST never provisions an Activity.
3. Open Activities is a server-derived, authorized projection of non-Completed Activity records on the operational revision.
4. Daily diaries use the canonical Site Diary API with programme/revision/activity UUIDs and preserve one Activity/date.
5. Completion only follows `In Progress`; carry-forward never includes Completed or superseded-revision work.
6. No frontend direct database mutation remains in the A19 workflow, and all tests above pass.
7. Activity append-only log storage is verified against the actual post-DB-001 schema before Phase 2 uses it.

## 12. Stop Conditions

Stop Phase 2 immediately if any change would alter A16/A17 behavior, revise the Activity state machine, silently create an Activity during Site Diary submission, bypass REST boundaries, translate legacy strings to canonical UUIDs, or weaken authorization.

Also stop before implementation unless HQ resolves: (a) the authoritative authorization mechanism/scope for reads and lifecycle mutations; (b) the canonical Activity provisioning route; and (c) the `site_diary_logs` versus `legacy_site_diary_logs` migration/repository conflict.

## HQ Disposition

**Verdict: C — BLOCKER. Phase 2 implementation is not authorized.** The lifecycle direction is valid, but authorization, canonical provisioning, and audit-log schema alignment must be resolved without modifying protected A16/A17 behavior before A19 proceeds.
