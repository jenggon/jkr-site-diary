# DB-002B — DOMAIN DECISION EVIDENCE RESOLUTION

**Project:** JKR Site Diary Digital Platform
**Date:** 2026-08-09
**Status:** SPECIFICATION INVESTIGATION (READ-ONLY)

## 1. Executive Summary
This document resolves the domain contradictions identified in DB-002A using locked specifications.
1. **Status:** There is a severe conflict between legacy architecture documents (DEV-010/011) which rely on `Suspended`/`Cancelled` and canonical Zon Operasi locked specs (AE-009/DB-014) which restrict Activity to `New`, `In Progress`, `Completed`.
2. **Activity Name:** No authoritative evidence maps `activityName` to `subtask`.
3. **Resource Fields:** Are explicitly owned by other engines (Workforce) or marked as "Future Extensions" (GPS Location, Materials), meaning they must not be persisted in the canonical Activity entity.

The proposed DB-003 refactor contract downgrades OpenActivity to a composed UI projection.

---

## 2. Status Evidence

**Question:** Are `Suspended` and `Cancelled` explicitly authorized for Activity?
- **DEV-010A, DEV-010B, DEV-011B, DEV-011E, DEV-012A, DEV-012B:** Explicitly require `Suspended` and `Cancelled` operational states.
- **AE-009 (Activity State Machine):** Explicitly defines a 3-state machine: `New → In Progress → Completed`. States "Completed is terminal". Does not list Suspended/Cancelled.
- **DB-014 (Activity Schema):** `status` ENUM strictly limits values to `'New', 'In Progress', 'Completed'`.
- **Conclusion:** The documents genuinely conflict. The locked canonical DB schema and Zone Operasi engines (AE-001/AE-009) contradict the legacy architecture blueprint rules.
- **RECOMMENDATION:** Do not expand AE-009. Recommend projecting `Suspended` dynamically (e.g., via a Site Diary halt log or a `status_reason` side-table) or strictly defer to HQ if the business requires expanding the canonical database enum.

---

## 3. Activity Naming Evidence

**Question:** Exact semantic meaning of `activityName` vs `subtask`.
- **DB-014:** Defines `subtask` as "MSP Work Package". Defines `subtask_display_name` as optional text.
- **OpenActivity Type:** Defines `activityName` as required.
- **Evidence:** No locked specification explicitly equates `activityName` with `subtask` or `subtask_display_name`.
- **CLASSIFY:** HQ DECISION REQUIRED.

---

## 4. Resource Ownership Evidence

| Field | Canonical Owner | Persistence Table | Source | Evidence | Classification |
|---|---|---|---|---|---|
| `location` | None (Future) | None | DB-014 | Listed under "Future Extensions: GPS Location" | UI TRANSIENT / DOMAIN PROJECTION ONLY |
| `tradeInfo` | Workforce Engine | `workforce` / `site_diary.manpower` | DB-015 / DEV-010C | DEV-010C explicitly shows `workforceRepository` saving trades. DB-015 saves `manpower` JSONB snapshot. | PERSISTENT WORKFORCE DATA / PERSISTENT SITE DIARY DATA |
| `workforceCount` | Workforce Engine | None | DEV-010C | Calculated dynamically per Site Diary. | DOMAIN PROJECTION ONLY |
| `materialSnapshot` | MRE Engine / None | None | DB-015 | Listed under "Future Extensions: Material Usage". | UI TRANSIENT / DOMAIN PROJECTION ONLY |

---

## 5. Open Activity Projection Boundary

Based on evidence, `OpenActivity` cannot be a persistent entity. It must be an API Aggregate Projection containing:

**CANONICAL ACTIVITY FIELDS (from `activity`)**
- `activityId`, `programmeId`, `revisionId`, `taskId`, `status`, `createdAt`, `updatedAt`

**SITE DIARY FIELDS (from `site_diary`)**
- `siteDiaryId` (The ID of the active/open diary for the current operational date)

**DERIVED FIELDS**
- `isLocked` (Dynamically true if `programme_revision.status == Approved` via REM-004 checks, or if previous revision)

**UI-ONLY FIELDS**
- `location`, `tradeInfo`, `workforceCount`, `materialSnapshot` (Fetched from Workforce Engine or temporarily held in UI state)

---

## 6. Proposed DB-003 Contract

- **Canonical Activity entity:** Strictly matches DB-014. No foreign keys to Site Diary.
- **OpenActivity projection:** An API aggregate DTO (`OpenActivityDto`) composed of Activity + Active Site Diary ID + Revision Lock State + Transient Engine Data.
- **SiteDiary:** Strictly matches DB-015. Belongs to Activity (`activity_id`).
- **Activity lifecycle:** Enforced as `New → In Progress → Completed` (AE-009).
- **Lock semantics:** Enforced at the DB layer via REM-004 `FOR SHARE` triggers. Projected as `isLocked` boolean in the DTO.
- **Activity naming:** Pending HQ semantic mapping.
- **Resource fields:** Relegated to `Workforce Engine` and transient UI projections.
- **Fields that must be removed from persistence:** `siteDiaryId`, `isLocked`, `location`, `tradeInfo`, `workforceCount`, `materialSnapshot`, `updatedBy`.
- **Fields that must remain in persistence:** `activityId`, `programmeId`, `revisionId`, `taskId`, `subtask`, `status`, `createdAt`, `updatedAt`.
- **Fields requiring HQ decision:** `Suspended`/`Cancelled` persistence logic, `activityName` semantic mapping.

---

## 7. Specification Conflicts

**CONFLICT-STATUS-001**
- **Document A:** DEV-011B Activity State Machine Specification (and related DEV-01x blueprint specs)
- **Document B:** AE-009 Activity State Machine / DB-014 Activity Schema
- **Exact conflict:** DEV-01x requires 5+ states (`Suspended`, `Cancelled`). AE-009/DB-014 explicitly locks to 3 states (`New`, `In Progress`, `Completed`).
- **Impact:** The UI and legacy Open Activity state machine will crash against the canonical database schema if `Suspended` or `Cancelled` transitions are attempted.
- **Recommended HQ decision:** Retain AE-009 3-state model for physical execution. Implement `Suspended` as a separate derived concept (e.g., via Site Diary "Halt" logs or Progress blockers).

---

## 8. Final HQ Decisions Required

1. **Conflict Resolution (CONFLICT-STATUS-001):** Does HQ authorize modifying DB-014/AE-009 to include `Suspended` and `Cancelled`, or should the UI drop them / derive them differently?
2. **Naming Semantics:** Map `activityName` exactly to `subtask` or `subtask_display_name`?
