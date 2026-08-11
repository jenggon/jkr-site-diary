# REM-006 — SITE DIARY / OPEN ACTIVITY ARCHITECTURE DECISION

**Project:** JKR Site Diary Digital Platform
**Date:** 2026-08-09
**Status:** PENDING HQ DECISION
**Auditor:** Independent Lead Architect

---

## 1. Problem Statement
**P1 Architecture Finding (from AUDIT-016):**
There is a catastrophic Table Ownership Collision on the PostgreSQL table `public.site_diary`. 
- **Site Diary Engine** treats `site_diary` as a daily execution log with `site_diary_id` as Primary Key (per DB-015 migration).
- **Open Activities Engine** treats `site_diary` as the stateful current activity record with `id` as Primary Key (per `AGENTS.md` legacy LHI rules).
Both engines are mutating the same table with completely incompatible schemas, columns, and domain rules.

---

## 2. Evidence
1. `src/repositories/siteDiaryRepository.ts`: Inserts `site_diary_id`, `weather`, `manpower`, `notes`, `activity_date`.
2. `src/repositories/OpenActivityRepository.ts`: Inserts `id`, `activity_name`, `is_locked`, `trade_info`, `material_snapshot`.
3. `supabase/migrations/baseline.sql`: Defines `site_diary` (PK `id`) with legacy flat columns.
4. `supabase/migrations/20260802232900_site_diary_engine.sql`: Defines `site_diary` (PK `site_diary_id`) with normalized daily operational columns.
5. `supabase/migrations/20260802231500_activity_engine.sql`: Defines `activity` (PK `activity_id`) with stateful operational columns.

---

## 3. Locked Specification Evidence
1. **AGENTS.md (Locked Rule):** "Table: site_diary. Purpose: One row represents ONE current activity."
2. **DB-014 (Activity Schema):** "Activity represents the operational execution of a published Task. Operational state belongs to Activity." (PK: `activity_id`)
3. **DB-015 (Site Diary Schema):** "Site Diary records the daily execution log for an Activity... One record represents one Activity on one day." (PK: `site_diary_id`)
4. **DEV-010C (Workflow Spec):** Mandates atomic transactions inserting into `site_diary` (for the daily log) linked to a parent `activity`.

**Contradiction:** `AGENTS.md` enforces a deprecated flat-file architecture (Log Hari Ini), directly contradicting the normalized multi-engine architecture established in DB-014 and DB-015.

---

## 4. Domain Relationship
The canonical relationship, derived from the latest database specification (DB-014/DB-015), is:

```
Programme
   ↓
Programme Revision
   ↓
Task (Planning)
   ↓
Activity (Stateful Operational Execution)
   ↓
Site Diary (Daily Operational Snapshot/Log)
```

**Is "Open Activity" a separate domain entity?**
No. "Open Activity" is simply an operational projection (or lifecycle state — `New`, `In Progress`, `Suspended`) of the canonical **Activity** entity. They are the same domain entity.

---

## 5. Persistence Ownership Matrix

| Domain Entity | Owning Engine | Canonical DB Table | Primary Key |
|---|---|---|---|
| Programme | Programme Engine | `programme` | `programme_id` |
| Programme Revision | Programme Engine | `programme_revision` | `revision_id` |
| Task | Programme Engine | `task` | `task_id` |
| **Activity (Open Activity)** | **Activity Engine** | **`activity`** | **`activity_id`** |
| **Site Diary** | **Site Diary Engine** | **`site_diary`** | **`site_diary_id`** |
| Progress | Progress Engine | `progress` | `progress_id` |

---

## 6. Canonical Schema Ownership
- DB-015 `site_diary` is strictly the daily execution record (Option A in HQ prompt). 
- It is NOT the persistence store for an Open Activity.
- The `OpenActivityRepository` is violating ownership by mapping its stateful Activity model onto the `site_diary` table instead of the `activity` table.

---

## 7. Migration History
1. **`baseline.sql`:** Created a flat, legacy `site_diary` table with `id` PK (the old LHI model).
2. **`20260802231500_activity_engine.sql`:** Created the `activity` table to hold operational state (the new model).
3. **`20260802232900_site_diary_engine.sql`:** Re-defined `site_diary` using `site_diary_id` PK to act as the daily child record of `activity`.

*Result:* The PostgreSQL database contains both schemas overlaid on top of each other due to incomplete migration pruning, but logically DB-014 and DB-015 supersede the baseline.

---

## 8. Architecture Options

### OPTION A: Revert to Legacy LHI (AGENTS.md)
- **Concept:** Delete `activity` table. Force all Site Diary daily logs and Activity states into the single flat `site_diary` table.
- **Advantages:** Complies strictly with the text of `AGENTS.md`.
- **Disadvantages:** Destroys historical traceability, violates DB-014/DB-015, makes "Continue Yesterday" mathematically impossible without duplicating state rows.

### OPTION B: Separate Open Activity Table
- **Concept:** Create a new `open_activity` table parallel to `activity`.
- **Advantages:** Leaves existing `site_diary` code alone.
- **Disadvantages:** Violates normalization. Creates two tables representing the exact same operational concept.

### OPTION C: Canonical Normalization (Recommended)
- **Concept:** `OpenActivity` maps exclusively to the `activity` table (`activity_id`). `SiteDiary` maps exclusively to the `site_diary` table (`site_diary_id`). 
- **Advantages:** Aligns 100% with DB-014, DB-015, and DEV-010C. Fixes the P1 collision immediately.
- **Disadvantages:** Requires `AGENTS.md` to be formally unlocked and updated. Requires updating `OpenActivityRepository` to point to `activity`.

---

## 9. Business Rule Impact (Option C)
- **Site Diary / Active Revision:** The daily `site_diary` record binds safely to the parent `activity`, which is bound to the latest authorised revision.
- **Continue Yesterday:** Supported gracefully. The engine queries the `activity` table for active work, and instantiates a new child `site_diary` entry for Today.
- **Revision Transition:** The locking mechanism (`isLocked = true`) occurs exactly where it belongs — on the `activity` table — protecting all underlying historical site diary logs inherently.
- **Task Picker:** Safely maps WBS sub-tasks to the `activity` table.

---

## 10. Recommendation
**OPTION C.** 
The root cause of the P1 defect is that `AGENTS.md` enforces a deprecated architectural constraint ("site_diary represents ONE current activity") that conflicts with the modern DB-014/DB-015 specifications. `OpenActivityRepository` was incorrectly built against the legacy `site_diary` table instead of the `activity` table.

---

## 11. Decision Required from HQ
**We require explicit HQ authorization to override `AGENTS.md`.**
HQ must approve changing the architecture rules to:
1. `OpenActivities` are loaded from and persisted to the `activity` table.
2. `site_diary` is strictly the daily child log of an `activity`.
3. The REM-004 Revision Transition trigger must be migrated from `site_diary` to `activity`.

---

## 12. Consequences & Migration Risk
- `OpenActivityRepository.ts` must be refactored to query `activity`.
- The REM-004 v2 migration (`20260809140000_rem004_revision_safety.sql`) must be amended to apply its `FOR SHARE` locks and triggers to the `activity` table rather than `site_diary`.
- Risk: High complexity refactor for Open Activities, but zero-risk for Site Diary daily operations.

---

## 13. Audit Impact
- **AUDIT-014 (Open Activities Engine):** The previous score (9.50) is structurally invalidated because the underlying repository was mapping to the wrong domain table, a fact obscured by in-memory test mocks. AUDIT-014 must be re-run after this architecture fix.
- **AUDIT-015 (Revision Transition):** The REM-004 v2 trigger was applied to the wrong table (`site_diary`). It must be moved to `activity` and re-audited.
