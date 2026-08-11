# DB-002A — DOMAIN MODEL RECONCILIATION

**Date:** 2026-08-09
**Task:** DB-002A (Domain Model Reconciliation)
**Mode:** Analysis Only

## 1. Executive Summary
The existing `OpenActivity` domain model heavily conflicts with the canonical `DB-014` specification. It illegally enforces a 1:1 relationship with Site Diary by embedding `siteDiaryId`, defines unapproved operational states (`Suspended`, `Cancelled`), and relies on database-unsupported fields (`isLocked`, `location`). 
The recommended architecture is **Option C**: Split the current model. `Activity` becomes the strict canonical persistence entity (DB-014), while `OpenActivity` is downgraded to a read-only aggregate DTO (projection) for the frontend, built by joining Activity, Site Diary, and Revision data.

## 2. Current Domain Model
The `OpenActivity` model (`src/types/openActivity.ts`) serves as a monolithic aggregate. It directly maps to the legacy `site_diary` table via `OpenActivityRepository`, conflating the Activity's lifecycle (`status`, `taskId`) with a specific daily Site Diary execution (`siteDiaryId`) and temporary UI states (`isLocked`, `tradeInfo`).

## 3. Canonical Activity Model
Based on `DB-014`, `AE-001`, and `AE-009`:
- Activity is the operational execution of a Task.
- Activity owns its operational state (`New`, `In Progress`, `Completed`).
- Activity has a 1-to-Many relationship with Site Diary.
- Activity does NOT natively store UI locks, as locking is dynamically enforced via REM-004 at the database transaction layer.

## 4. Field Reconciliation Matrix

| Current Field | Canonical Concept | DB-014 Field | Action |
|---|---|---|---|
| `activityId` | Activity Identity | `activity_id` | KEEP |
| `siteDiaryId` | **CONTRADICTION** (Child ID on Parent) | None | REMOVE from persistence. RETAIN AS DOMAIN-ONLY in API projection. |
| `programmeId` | Programme Identity | `programme_id` | KEEP |
| `revisionId` | Revision Identity | `revision_id` | KEEP |
| `taskId` | Task Identity | `task_id` | KEEP |
| `activityName` | MSP Work Package | `subtask` | HQ DECISION REQUIRED / RENAME |
| `status` | Operational Status | `status` | HQ DECISION REQUIRED (Enum mismatch) |
| `isLocked` | Database Protection | None | DERIVE (from `programme_revision.status`) |
| `location` | GPS/Extension | None | HQ DECISION REQUIRED / RETAIN AS DOMAIN-ONLY |
| `tradeInfo` | Resource snapshot | None | HQ DECISION REQUIRED / RETAIN AS DOMAIN-ONLY |
| `workforceCount` | Resource snapshot | None | HQ DECISION REQUIRED / RETAIN AS DOMAIN-ONLY |
| `materialSnapshot`| Resource snapshot | None | HQ DECISION REQUIRED / RETAIN AS DOMAIN-ONLY |
| `createdAt` | Creation | `created_at` | KEEP |
| `createdBy` | Submission | `submitted_by` | RENAME / MAP |
| `updatedAt` | Update | `updated_at` | KEEP |
| `updatedBy` | Update actor | None | HQ DECISION REQUIRED |

## 5. Status Reconciliation
**Current:** `Planned`, `InProgress`, `Completed`, `Suspended`, `Cancelled`
**Canonical (AE-009 / DB-014):** `New`, `In Progress`, `Completed`
**Analysis:** `AE-009` explicitly lists only 3 states and notes "Completed is terminal". There is no canonical support for `Suspended` or `Cancelled`. `Planned` conceptually belongs to the `Task` engine rather than `Activity`.
**HQ DECISION REQUIRED:** Must the canonical state machine be expanded to include `Suspended` and `Cancelled`, or should the UI be updated to respect the AE-009 3-state machine?

## 6. Lock Reconciliation
`isLocked` has no database persistence column in DB-014. REM-004 enforces locks strictly at the DB-layer based on `programme_revision.status`.
**Resolution:** `isLocked` must be a **derived/read-only projection** (Option C). The repository must not attempt to save `isLocked` to the `activity` table.

## 7. Site Diary Relationship
`siteDiaryId` on the `OpenActivity` domain model structurally violates the `1 Activity -> Many Site Diary` canonical rule.
**Resolution:** **REMOVE** from the canonical `Activity` domain entity. It can only be returned in a composed API DTO (e.g., `ActiveSiteDiaryDto`) if the frontend needs to know the "current day's" diary ID.

## 8. Activity Naming Semantics
`activityName` vs `subtask`. DB-014 defines `subtask` (MSP Work Package) and `subtask_display_name`. 
**HQ DECISION REQUIRED:** Can `activityName` be safely renamed/mapped to `subtask_display_name`, or do they hold different semantic values?

## 9. Lifecycle Ownership
- **Create / Start (New → In Progress) / Resume / Complete (→ Completed):** Activity Engine (AE-001, AE-009).
- **Suspend / Cancel:** **CONTRADICTION** (Not in AE-009).
- **Carry Forward:** Activity Engine (AE-005).

## 10. Persistence Ownership
| Concept | Owner Engine | Persistence Table | Primary Key |
|---|---|---|---|
| Task | Task Engine | `task` | `task_id` |
| Activity | Activity Engine | `activity` | `activity_id` |
| Open Activity | **NONE** (Concept) | **NONE** (Aggregate) | `activity_id` |
| Site Diary | Operation Engine | `site_diary` | `site_diary_id` |

## 11. API Impact
Existing APIs exposing `OpenActivity` (e.g., `/api/previous-activities`, `/api/site-diary/[id]/activities`) will require an **ADAPTER/FACADE**. The raw canonical `Activity` cannot be returned directly if the UI explicitly expects `siteDiaryId` and `isLocked`.

## 12. Test Impact
Tests heavily mocking `OpenActivityRepository` and expecting fields like `siteDiaryId` to be saved are **OBSOLETE** and require new specifications.

## 13. Migration Impact
The DB-001 canonical schema requires NO changes. The domain reconciliation is purely an **application-level** refactor.

## 14. Recommended Target Architecture
**Option C: Split into Activity + Operational Projection.**
- Implement a pure `Activity` domain entity that mirrors DB-014 perfectly.
- Downgrade `OpenActivity` to a read-only DTO (`OpenActivityDto`) returned by an API Facade. The Facade queries `Activity`, joins the current `ProgrammeRevision` (to derive `isLocked`), and joins `SiteDiary` (to attach `tradeInfo`, `location`, `siteDiaryId`).
- `OpenActivityRepository` is deleted and replaced by a pure `ActivityRepository`.

## 15. HQ Decisions Required
1. **Status Semantics:** Does HQ authorize expanding the AE-009 state machine to include `Suspended` and `Cancelled`, or should the application drop them?
2. **Activity Naming:** Is `activityName` semantically identical to `subtask` or `subtask_display_name`?
3. **Transient Resource Fields:** Are `location`, `tradeInfo`, `workforceCount`, and `materialSnapshot` meant to be saved in the DB, or are they purely transient frontend UI states? If persistent, which canonical table (Site Diary? Workforce?) should hold them?

## 16. Implementation Readiness
**BLOCKED.** DB-003 (Domain Refactor) cannot commence until HQ answers the unresolved status and field mapping contradictions.
