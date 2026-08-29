# AUDIT A19 PHASE 1.5 — BLOCKER REMEDIATION

## Executive Summary
This document serves as the final evidence of remediation for the three architectural blockers identified during the A19 Phase 1 reconnaissance.

**FINAL STATUS**: **A — BLOCKERS RESOLVED**

### 1. Blocker 1 — Authenticated Actor Identity
* **Original blocker**: `POST /api/activity` trusted the caller-supplied `submitted_by` field in the request body instead of relying on the authenticated identity of the request.
* **Root cause**: The API route was missing the `extractIdentity` call that other A17 routes used to enforce actor isolation.
* **Exact remediation**: Refactored `POST /api/activity` and `PATCH /api/activity/[activityId]` to use `extractIdentity(request)`. The routes now explicitly return `401 Unauthorized` if the identity is missing. `submitted_by` was removed from the incoming JSON payload validation.
* **Security implications**: The canonical Activity provisioning boundary is now protected by the A17 identity extraction boundary. The actor cannot be impersonated via the body payload.
* **Files changed**:
  - `src/app/api/activity/route.ts`
  - `src/app/api/activity/[activityId]/route.ts`

### 2. Blocker 2 — Canonical Activity Provisioning
* **Original blocker**: The `/api/activity/*` routes referenced a non-existent `activityService` imported from `@/services/activityService`.
* **Root cause**: The legacy service was renamed/obsoleted (`legacyActivityService.ts.obsolete`), but the API boundaries were never updated to point to the canonical `OpenActivityService`.
* **Exact remediation**: Replaced the broken `activityService` imports across all 4 routes. Wired `POST /api/activity` to `createOpenActivityService().createActivity(...)`. Wired the `GET` endpoints to use `ActivityRepository`.
* **Files changed**:
  - `src/app/api/activity/route.ts`
  - `src/app/api/activity/[activityId]/route.ts`
  - `src/app/api/activity/revision/[revisionId]/route.ts`
  - `src/app/api/activity/task/[taskId]/route.ts`
  - `src/repositories/IActivityRepository.ts`
  - `src/repositories/ActivityRepository.ts`

### 3. Blocker 3 — Activity Log Persistence
* **Original blocker**: `ActivityLogRepository` referenced `site_diary_logs`, but this table was renamed to `legacy_site_diary_logs` in migration DB-001.
* **Root cause**: The DEV-004A and DEV-005A migrations created the canonical `activity` and `site_diary` tables but failed to recreate a canonical `site_diary_logs` schema for the append-only event log.
* **Exact remediation**: Created a new migration specifically designed to satisfy `ActivityLogRepository`'s expected schema.
* **Database implications**: A new canonical table `site_diary_logs` with a strict `Activity` foreign key was introduced to capture lifecycle events natively. Legacy data in `legacy_site_diary_logs` remains untouched.
* **Files changed**:
  - `supabase/migrations/20260812120000_a19_site_diary_logs.sql`

## Testing Evidence
* **Tests executed**: `npm run typecheck`, `npm run lint`, `npm test`
* **Test results**: PASS. 223 Unit and Integration tests passed successfully. 

## Explicit Governance Statements
* A19 Phase 2 has NOT been implemented.
* The Open Activities Dashboard has NOT been built.
* The legacy `page.tsx` monolithic frontend has NOT been modified.
* A16 State Machine semantics were PRESERVED exactly as designed.

## Remaining Risks
While the edge boundary extraction is secure (`extractIdentity`), there remains a risk that the underlying token verification mechanism in `extractIdentity` requires a comprehensive audit to ensure the JWT signature is strictly validated prior to trusting the header value. This should be addressed in a future Phase.
