# SPEC-001 — SUSPEND / CANCEL CANONICAL MECHANISM SPECIFICATION

**Project:** JKR Site Diary Digital Platform
**Date:** 2026-08-10
**Mode:** ARCHITECTURE / DOMAIN SPECIFICATION ONLY

---

## 1. Requirement Evidence

**Suspended (CURRENT REQUIREMENT)**
- **Business Meaning:** Work is temporarily halted due to site obstructions, bad weather, material shortages, or Superintending Officer (SO) instruction. (Source: DEV-010B)
- **Initiator:** Site Engineer / Supervisor / SO.
- **Physical Effect:** Work remains physically incomplete.
- **Workflow Effect:** Carries forward to daily diaries (DEV-010D) but permits 0 progress increments (DEV-012B: BR-ACT-005).
- **Resumable:** Yes (DEV-010B).

**Cancelled (CURRENT REQUIREMENT)**
- **Business Meaning:** Activity is abandoned or replaced due to Variation Order (VO), Arahan Pegawai Penguasa (APK), or task removal in a new baseline schedule.
- **Initiator:** Planner / Project Director (via Revision Engine).
- **Physical Effect:** Work halts permanently.
- **Workflow Effect:** Excluded from daily logging and Open Activities pools (DEV-012B: BR-ACT-004, DEV-010D).
- **Resumable:** No (Terminal).

---

## 2. State Ownership
**Owner Engine:** Activity Engine (Workflow / Administrative Module).
**Reasoning:** These states dictate the operational lifecycle of the Activity itself. They do not belong to Site Diary (a daily log), Progress (physical measurement), or Task Engine (MSP representation). 

---

## 3. Persistence Design
**PROPOSED (FUTURE IMPLEMENTATION — REQUIRES HQ APPROVAL)**

**Pattern:** Append-only Administrative Event Log.
To keep the physical `activity` table (DB-014) pristine, a new sidecar table is proposed.

**Entity:** `activity_workflow_events`
**Owner:** Activity Engine
**Identity:** `event_id` (UUID, PK)
**Parent:** `activity_id` (FK to DB-014 `activity`)
**Fields:**
- `event_type` ENUM (`Suspend`, `Resume`, `Cancel`)
- `reason` TEXT (Required)
- `actor_id` UUID (FK)
- `created_at` TIMESTAMP
**Revision affinity:** Belongs to the `activity`, so implicitly inherits the activity's `revision_id`.
**Lifecycle & History:** Append-only. The *current administrative state* is derived from the latest event for a given `activity_id`. (Defaults to `Active` if no events).

---

## 4. Suspend Semantics
- **Who:** Site Engineer, Supervisor, SO.
- **When:** When Activity physical state is `New` or `In Progress`.
- **Business Requirements (LOCKED):** Carries forward to daily diaries (DEV-010D) but permits 0 progress increments (DEV-012B: BR-ACT-005). Remains resumable.
- **Physical Interpretation (PROPOSED):** Because AE-009 strictly limits physical state, the physical Activity state remains exactly as it was (`New` or `In Progress`).
- **Daily Site Diary:** Continues to be generated (Carry Forward includes Suspended). Weather and stoppage notes can be logged.
- **Progress:** Locked to 0 increment while suspended.
- **Carry Forward:** Carries forward daily as "Suspended".
- **Resume:** Yes.
- **Records:** Creates an `event_type = Suspend` row.

---

## 5. Cancel Semantics
- **Who:** Planner, SO, Revision Engine.
- **Level:** Activity-level (often triggered by Task-level deletion).
- **Physical Activity State:** Remains exactly as it was (capturing the physical reality that it was started but abandoned).
- **Reversible:** No.
- **Site Diary / Progress / Carry Forward:** Instantly excluded from all future Carry Forward pools. No new daily diaries or progress can be logged.
- **Records:** Creates an `event_type = Cancel` row.

---

## 6. Revision Boundary
- **REM-004 Integrity:** The `activity_workflow_events` table must be protected by the same REM-004 logic that enforces a `FOR SHARE` lock on the parent `programme_revision`. This protects the revision boundary and prevents operational mutation against a superseded revision during revision transition.
- **Cross-Revision Migration (UNRESOLVED):** R1 workflow history remains bound to the R1 Activity. The R2 Activity is a distinct Activity under R2. No automatic migration of workflow events occurs across revisions unless HQ subsequently authorizes it. If carry-over is desired, that requires an explicit revision-transition business rule and separate approval.

---

## 7. Resume Semantics
- **Flow:** `Suspended` → (Resume Command) → `Active`.
- **Owner:** Activity Engine.
- **Action:** Inserts an `event_type = Resume` row. Physical state (e.g., `In Progress`) remains unaffected.

---

## 8. Site Diary Interaction
- Suspend/Cancel commands are administrative actions on the Activity.
- They do **not** create a Site Diary record directly.
- However, if suspended due to rain, the Supervisor will likely log "Rain" in that day's Site Diary. The Site Diary captures the *daily evidence*, while the Workflow Event captures the *administrative state change*.

---

## 9. Audit Trail
- **`activity_workflow_events`**: Serves as the append-only administrative workflow history.
- **`site_diary_logs`**: Serves as the daily operational history.
These responsibilities are strictly separated and not merged. The event table acts as the canonical, immutable audit trail for administrative state changes.

---

## 10. API Contract
**Command: `SuspendActivity`**
- **Actor:** Site Engineer / SO
- **Input:** `activityId`, `reason`
- **Preconditions:** Activity is not Completed or Cancelled. Activity belongs to active revision.
- **Result:** Latest admin state = Suspended.

**Command: `ResumeActivity`**
- **Input:** `activityId`, `reason`
- **Preconditions:** Activity admin state is currently Suspended.
- **Result:** Latest admin state = Active.

**Command: `CancelActivity`**
- **Input:** `activityId`, `reason`
- **Preconditions:** Activity is not Completed.
- **Result:** Latest admin state = Cancelled.

---

## 11. UI / Projection (OpenActivityDto)
The API layer will compose DB-014 and the workflow events into:
```typescript
interface OpenActivityDto {
  activityId: string;
  physicalStatus: 'New' | 'In Progress' | 'Completed'; // From DB-014
  administrativeStatus: 'Active' | 'Suspended' | 'Cancelled'; // From latest workflow event
  suspensionReason?: string;
  isLocked: boolean; // Derived from Revision
}
```

---

## 12. State Model
**Allowed Combinations:**
- `New` + `Active`
- `New` + `Suspended`
- `New` + `Cancelled`
- `In Progress` + `Active`
- `In Progress` + `Suspended`
- `In Progress` + `Cancelled`
- `Completed` + `Active` (Terminal success)

**Rejected Combinations:**
- `Completed` + `Suspended` (Cannot suspend finished work)
- `Completed` + `Cancelled` (Cannot cancel finished work)

---

## 13. Conflict / Edge Cases
- **Suspend while Site Diary open:** Allowed. Prevents further progress entries for that day.
- **Suspend after daily completion:** Allowed. Takes effect tomorrow.
- **Cancel while In Progress:** Allowed. Work stops; drops from tomorrow's Carry Forward.
- **Concurrent Suspend + Complete:** Rejected. Requires resolution.

---

## 14. Concurrency
Two separate concurrency mechanisms must be explicitly distinguished:
**A. Revision Safety (LOCKED):** Governed by REM-004 via a `FOR SHARE` lock on `programme_revision`. Its purpose is to protect the revision boundary and prevent mutations on superseded revisions.
**B. Activity Workflow Concurrency (PROPOSED):** To determine the "current" state safely during a transaction (e.g., Progress Engine verifying if it's suspended), a standard pessimistic read lock (`FOR UPDATE`) on the parent `activity` row should be used to serialize administrative workflow events and physical operational mutations. 
**Note:** The `FOR UPDATE` mechanism on `activity` is a SPEC-001 design proposal and is NOT part of REM-004.

---

## 15. Canonical Ownership Summary
- **Activity:** Activity Engine (Physical state owner - DB-014)
- **Suspension / Cancellation:** Activity Engine (Administrative state owner - `activity_workflow_events`)
- **SiteDiary:** Site Diary Engine (Daily execution record - DB-015)
- **Progress:** Progress Engine (Measurement owner)

---

## 16. Migration Impact
**FUTURE IMPLEMENTATION — REQUIRES HQ APPROVAL.**
Requires a new database migration to create the `activity_workflow_events` table (or similar). No legacy data migration is technically required since legacy OpenActivities were abandoned in DB-001A.

---

## 17. Specification Quality
- `New/In Progress/Completed` Physical State: **LOCKED** (AE-009)
- `Suspend/Cancel` Requirements: **LOCKED** (DEV-012B, DEV-010D)
- `activity_workflow_events` architecture: **PROPOSED**
- Cross-Revision Suspension Carry-over: **UNRESOLVED** (Requires HQ decision if suspension automatically applies to replacement tasks in Rev N+1).

---

## 18. Recommended Architecture
**Recommendation:** Implement the Append-Only Workflow Event Table (`activity_workflow_events`).
**Why:** 
1. **Preserves DB-014 & AE-009:** The physical state machine remains exactly `New → In Progress → Completed`.
2. **Preserves DB-015:** Site Diary remains a clean daily record without inheriting administrative states.
3. **Satisfies DEV-012B:** Provides a concrete, auditable persistence layer for `Suspended` and `Cancelled` that the Carry Forward engine can accurately query.
4. **Preserves REM-004:** Can be easily bound by the same triggers that enforce `FOR SHARE` on `programme_revision` to protect the revision boundary.
