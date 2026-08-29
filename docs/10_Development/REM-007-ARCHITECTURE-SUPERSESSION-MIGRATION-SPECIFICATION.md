# REM-007 — ARCHITECTURE SUPERSESSION & MIGRATION SPECIFICATION

**Project:** JKR Site Diary Digital Platform
**Repository:** `jenggon/jkr-site-diary`
**Branch:** `develop`
**Status:** PENDING HQ ACCEPTANCE
**Mode:** ARCHITECTURE / SPECIFICATION ONLY

---

## 1. Executive Summary

During AUDIT-016 (Daily Operational Cycle), a P1 architectural conflict was discovered regarding the canonical ownership of the `site_diary` PostgreSQL table. REM-006 identified that `siteDiaryRepository` utilized `site_diary` as a daily execution record, whereas `OpenActivityRepository` concurrently mapped `site_diary` as the stateful current activity record. These conflicting paradigms stem from a legacy definition in `AGENTS.md` colliding with modern locked schemas (`DB-014` and `DB-015`).

HQ has formally selected **OPTION C — CANONICAL NORMALIZATION** to resolve this conflict. This specification dictates exactly how the repository will supersede the deprecated architecture and transition to Option C. Implementation is strictly blocked until this architecture specification is reviewed and approved by HQ.

---

## 2. Source-of-Truth Hierarchy

To unequivocally resolve the conflict, the architectural authority hierarchy is established as follows:

1. **HQ Architectural Directives (REM-007):** Upon formal HQ approval, REM-007 becomes the superseding architecture decision for the specific Site Diary / Activity ownership conflict identified in AUDIT-016.
2. **Database Specifications (DB-014, DB-015):** The canonical schemas for Activity and Site Diary.
3. **ADR/Architecture Documents (DEV-010C, etc.):** Implementation workflow guidelines.
4. **AGENTS.md:** Contains legacy LHI rules that conflict with DB-014/DB-015. (To be updated later).
5. **Existing Implementation:** Subordinate to specifications. Current conflicting code will be refactored.

**Authority Shift:** Once REM-007 is approved, DB-014 and DB-015 definitively supersede the legacy `site_diary` table rules currently described in `AGENTS.md`.

---

## 3. Architecture Supersession Decision

**OLD MODEL (Deprecated):**
```
Task
 ↓
site_diary (acting as Open Activity state store)
 ↓
current activity state
```
*Issue:* Forced daily logs and operational state into a single flat schema, violating normalization.

**NEW MODEL (Option C — Canonical Normalization):**
```
Task
 ↓
Activity (owns operational state)
 ↓
Site Diary (owns daily execution records)
```

**Supersession Rules:**
- **Activity** owns operational state.
- **Site Diary** owns daily execution records.
- **Open Activity** is merely an operational concept (an Activity in a non-terminal state); it is **not** a separate persistence owner competing with Activity.

---

## 4. Canonical Entity Ownership

| Entity | Table | Primary Key | Owner Engine | Purpose | Revision Affinity | Lifecycle Owner |
|---|---|---|---|---|---|---|
| **Programme** | `programme` | `programme_id` | Programme Engine | Project Container | N/A | Programme Engine |
| **Programme Revision** | `programme_revision`| `revision_id` | Programme Engine | Baseline Schedule | Parent Programme | Programme Engine |
| **Task** | `task` | `task_id` | Programme Engine | Planned Work Node | Parent Revision | Programme Engine |
| **Activity** | `activity` | `activity_id` | Activity Engine | Operational State | Parent Revision | Activity Engine |
| **Site Diary** | `site_diary` | `site_diary_id` | Site Diary Engine | Daily Snapshot / Log| Parent Activity | Site Diary Engine |
| **Site Diary Log** | `site_diary_logs` | `id` | Audit Engine | Audit Event Trail | Parent Site Diary | Audit Engine |

---

## 5. Activity Model

The `Activity` represents the stateful operational execution of a published Task.

- **activity_id:** UUID (Primary Key)
- **programme_id:** UUID (FK to Programme)
- **revision_id:** UUID (FK to Programme Revision)
- **task_id:** UUID (FK to Task)
- **Operational State:** `status` (`New`, `In Progress`, `Completed`, etc.), `is_locked`, `location`, `trade_info`
- **Locking:** Locked (`is_locked = true`) when its parent revision is superseded.
- **Lifecycle:** Activity creation lifecycle follows the existing Activity Engine specification. REM-007 establishes persistence ownership and does not redefine the Activity creation trigger; closed when 100% complete.
- **Relationship to Task:** Many-to-One (One Task can have multiple operational Activities over time, though normally 1:1).
- **Relationship to Site Diary:** One-to-Many (One Activity spawns many daily Site Diaries).

---

## 6. Site Diary Model

The `Site Diary` is the immutable daily execution record. It does **NOT** own operational Activity state.

- **site_diary_id:** UUID (Primary Key)
- **programme_id:** UUID (FK)
- **revision_id:** UUID (FK)
- **activity_id:** UUID (FK to parent Activity)
- **activity_date:** DATE
- **Daily Record Semantics:** `weather`, `manpower`, `notes`, `status` (snapshot of the day).
- **Relationship:** Exactly ONE Site Diary record represents ONE Activity on ONE day (Unique constraint on `activity_id`, `activity_date`).

---

## 7. Open Activities Architecture

Under Option C, an "Open Activity" is redefined as:
- **Concept:** A domain state/view/service concept representing an `Activity` that is currently operational (e.g., status is `New`, `In Progress`, or `Suspended`).
- **Persistence:** Operational state is stored exclusively in the **`activity`** table. There is no separate `open_activity` table.
- **Identification:** Queried from the `activity` table where `status` is not terminal (`Completed`/`Cancelled`) and `is_locked` is false.
- **Locked Behavior:** When `is_locked = true`, the Open Activity drops out of the active operational pool.
- **Site Diary Reference:** Site Diaries are child records created daily against these active `activity_id`s.

---

## 8. Programme Revision Boundary

The locked boundary rules remain completely intact:
- When a new authorised CPM Revision becomes active:
  - The previous revision operational cycle ends immediately.
  - Previous open activities (`activity` table rows) stop as-is and are locked.
  - They remain historical and are **not** migrated into the new revision.
  - Operational Site Diary begins a new cycle against the new revision's tasks.
  - New operations follow **only** the latest authorised CPM Revision.
- **Cross-revision operational carry-forward is explicitly prohibited.**

---

## 9. REM-004 Impact

**Current REM-004 Implementation:**
- A PostgreSQL trigger protects mutation against the `site_diary` table when the revision transitions.

**Architectural Target (Option C):**
- Revision-transition operational protection belongs to **Activity**, not Site Diary.
- **Old Trigger Location:** `site_diary`
- **New Trigger Target:** `activity`
- **Mutation Boundary:** The trigger must block updates to `status` or operational fields on `activity` rows where the `revision_id` does not point to an `Approved` Programme Revision where `programme.current_revision_id = activity.revision_id`.
- **Locking Semantics:** A `BEFORE UPDATE` (or relevant mutation) trigger executes within the database transaction, performing a `SELECT ... FOR SHARE` against `programme_revision`. Revision validation occurs while the lock is held. Any concurrent programme revision update is serialized, and the lock remains until transaction commit/rollback. Superseded revision mutation is rejected.
- **Historical Preservation:** Legacy Site Diary records remain read-only by virtue of their parent Activity being locked, and historical records remain unchanged.

---

## 10. Continue Yesterday / Daily Continuation

**Architecture:**
- **Activity** persists as the long-lived operational identity and state.
- **Site Diary** records each daily occurrence as a child row.
- **Daily Continuation Flow:** 
  1. System queries the `activity` table for active work (`InProgress`, `is_locked = false`) within the current authorised revision.
  2. For each active `activity`, the engine instantiates a new `site_diary` child record for today's date.
  3. Continuation must remain strictly within the same active Programme Revision. Cross-revision continuation is banned.

Example:
```
Activity A (State: In Progress, Revision: R1)
 ├── Site Diary Day 1 (Date: 2026-08-01)
 ├── Site Diary Day 2 (Date: 2026-08-02)
 └── Site Diary Day 3 (Date: 2026-08-03)
```

---

## 11. Data Migration Strategy

**Strategy Phase:**
1. **Validation Checkpoint:** Backup database state. Verify no active transactions.
2. **Schema Alignment:** Ensure `activity` table correctly contains all stateful columns currently incorrectly stored in `site_diary` (e.g., `activity_name`, `is_locked`, `trade_info`, `material_snapshot`).
3. **Record Migration:** 
   - Extract legacy "Open Activity" rows from `site_diary` (where they acted as state records).
   - `INSERT` them into the `activity` table, mapping identifiers appropriately.
   - Retain true daily log rows in `site_diary`.
4. **Orphan Handling:** Any `site_diary` logs without a valid parent `activity` must be linked to a generated historical `activity` record to preserve integrity.
5. **Deduplication:** Enforce `(activity_id, activity_date)` uniqueness on `site_diary`. Clean up corrupted duplicates generated by the schema clash.
6. **Rollback Strategy:** Wrap all structural data migrations in a strict transaction block (`BEGIN; ... COMMIT;`). Revert to backup on failure.

---

## 12. Repository / Service Boundary Changes

- **`OpenActivityRepository`:** Must be entirely refactored to query and mutate the `activity` table instead of `site_diary`. 
- **`ActivityRepository`:** Will absorb the responsibilities of persisting stateful execution.
- **`SiteDiaryRepository`:** Will remain focused on daily records, but stripped of any logic attempting to manage overarching Activity state.
- **`OpenActivityService`:** Will act as a domain service orchestrating `Activity` state transitions.
- **`SiteDiaryService`:** Will manage daily log creation, ensuring it links to a valid parent `Activity`.

---

## 13. API Boundary Impact

The following APIs require architectural reassessment:
- **Open Activity APIs (`/api/activities/*`):** Must route mutations to the `activity` table.
- **Site Diary APIs (`/api/site-diaries/*`):** Must be created/updated to accept `activity_id` and generate daily logs.
- **Revision Approval APIs:** Must ensure the event dispatcher triggers state locking on the `activity` table instead of `site_diary`.

---

## 14. Test Architecture Impact

- **Unit Tests:** Must be updated to mock the `activity` repository for state and `siteDiary` repository for logs.
- **Integration Tests:** Must test the full relational chain (Revision -> Task -> Activity -> Site Diary).
- **Database Migration:** Real PostgreSQL tests must verify the REM-004 trigger on `activity`.
- **Limitation Acknowledgment:** In-memory mocks **cannot** prove concurrent mutation protection, trigger behavior, or cross-revision isolation at the database constraint level. These mandate real DB executable evidence.

---

## 15. AGENTS.md Supersession

**DO NOT EDIT AGENTS.md at this time.**

- **Obsolete Statements:** The rule *"Table: site_diary. Purpose: One row represents ONE current activity."* is obsolete.
- **Conflict Reason:** It conflates the daily log (`DB-015`) with the operational state (`DB-014`).
- **Future Replacement:** Must be replaced with rules explicitly defining `activity` as the state owner and `site_diary` as the daily log.
- **Governance:** Modification of `AGENTS.md` requires a separate controlled governance change strictly *after* REM-007 approval.

---

## 16. Migration Sequence

- Phase 0 — Governance update & REM-007 Approval
- Phase 1 — Canonical database schema alignment (DB migrations)
- Phase 2 — Activity repository/service alignment
- Phase 3 — Site Diary repository/service alignment
- Phase 4 — REM-004 trigger relocation to `activity`
- Phase 5 — API layer alignment
- Phase 6 — "Continue Yesterday" implementation
- Phase 7 — Test migration & CI pipeline repair
- Phase 8 — Data migration script execution
- Phase 9 — Full verification & E2E Testing
- Phase 10 — AUDIT-016 Re-Audit

---

## 17. Risks

- **Historical Data Corruption:** Translating flat LHI records into normalized parent-child records may drop data if mapping fails.
- **Trigger Placement:** REM-004 logic might fail if relocated without matching exactly the operational transaction boundaries on `activity`.
- **Mock Tests Masking Defects:** Heavy reliance on in-memory arrays has previously hidden massive DB collisions; future implementation must validate against Postgres.
- **Legacy Architecture References:** Overlooked queries expecting state in `site_diary` will break the frontend/API.

---

## 18. Acceptance Criteria

REM-007 is accepted only when:
- Canonical ownership is unambiguous (Activity = state, Site Diary = log).
- Open Activity persistence ownership is unambiguously assigned to `activity`.
- Revision boundary rules are preserved.
- REM-004 target is redefined to `activity`.
- "Continue Yesterday" architecture is defined within Revision boundaries.
- Migration and rollback strategies exist.
- Repository/Service/API boundaries are clearly defined.
- Test strategy acknowledges DB vs Mock limitations.
- AGENTS.md supersession is explicitly documented without immediate mutation.
- No unresolved architectural contradiction remains.

---

## 19. Audit / Governance Impact

- **AUDIT-016:** Remains **FAILED**. No implementation may proceed until REM-007 is accepted by HQ. After implementation, AUDIT-016 must be re-audited.
- **AUDIT-014 / AUDIT-015:** Both audits are structurally affected by this architecture change and will require re-auditing once the codebase transitions to Option C.
- **Scoring System Maintained:**
  - 10.0 / 10.0 = perfect compliance
  - 9.5 / 10.0 = preferred acceptance target
  - 9.0 / 10.0 = hard minimum acceptance
  - <9.0 / 10.0 = remediation required
  - Any P1 finding automatically prevents acceptance regardless of numerical score.

---

## 20. HQ Decision Record

DECISION:
OPTION C — CANONICAL NORMALIZATION

STATUS:
AUTHORIZED FOR SPECIFICATION

IMPLEMENTATION:
NOT YET AUTHORIZED

NEXT GATE:
HQ review and acceptance of REM-007
