# DB-002 — ACTIVITY REPOSITORY CUTOVER

**Project:** JKR Site Diary Digital Platform
**Date:** 2026-08-09
**Status:** BLOCKED / STOPPED

---

## 1. Baseline
Commit: `8b87bcc4366e79ab244a325fb8c6ab89ef814d5d`

## 2. Previous Persistence Boundary
The `OpenActivityRepository` previously targeted the `site_diary` table and mapped application-specific operational state (`is_locked`, `trade_info`, `material_snapshot`) to it, conflating daily execution records with operational activity concepts.

## 3. New Persistence Boundary
The canonical target for `OpenActivityRepository` must be the `activity` table (as per DB-014).

## 4. Repository Changes
**BLOCKED.** The cutover cannot be implemented because the `OpenActivity` domain entity structurally contradicts the DB-014 canonical schema.

## 5. Field Mapping Contradictions
The `OpenActivity` domain model (`src/types/openActivity.ts`) contains multiple **REQUIRED** fields that have no canonical representation in DB-014, and structural contradictions that violate canonical rules:

| Domain Field | Canonical DB-014 Column | Status | Issue |
|---|---|---|---|
| `siteDiaryId` | N/A | **UNSUPPORTED** | Structurally reverses the canonical 1:Many parent-child relationship. `activity` does not have a single `site_diary_id`. |
| `activityName` | `subtask`? | **UNSUPPORTED** | Ambiguous mapping. DB-014 defines `subtask`, not `activity_name`. |
| `status` | `status` | **CONTRADICTS** | Domain enum (`Planned`, `InProgress`, `Completed`, `Suspended`, `Cancelled`) clashes with DB-014 enum (`New`, `In Progress`, `Completed`). |
| `isLocked` | N/A | **UNSUPPORTED** | DB-014 does not store lock state; REM-004 enforces it dynamically via triggers. |
| `createdBy` | `submitted_by` | **DERIVABLE** | Requires renaming/mapping. |

## 6. Revision Affinity
Cannot be verified due to blocked implementation.

## 7. REM-004 Compatibility
Cannot be verified due to blocked implementation.

## 8. Site Diary Boundary
`siteDiaryRepository` is structurally ready to point to the canonical `site_diary` schema, but it is blocked from deployment until the Activity domain is resolved, as they share the same release boundary.

## 9. API Impact
The `OpenActivity` API will require a breaking redesign to conform to DB-014. Exposing fields like `siteDiaryId` and `isLocked` as part of the `OpenActivity` contract is no longer viable.

## 10. Tests
Not implemented.

## 11. Search/Contradiction Scan
The entire `OpenActivity` domain (services, repository, DTOs, mappers) heavily references these unsupported fields. A domain-wide refactor is required before persistence can be cut over.

## 12. CI Limitation
`ERR_PNPM_OUTDATED_LOCKFILE` was observed in previous tasks, but CI was not triggered for this blocked task.

## 13. Known Limitations
The application cutover is fundamentally blocked by domain-to-database architectural contradictions.

## 14. Files Changed
- `docs/10_Development/DB-002-ACTIVITY-REPOSITORY-CUTOVER-IMPLEMENTATION.md` (NEW)

## 15. Commit SHA
Uncommitted.
