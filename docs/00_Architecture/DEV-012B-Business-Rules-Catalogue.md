# HQ ENGINEERING SPECIFICATION
## DEV-012B — Business Rules Catalogue

**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked  
**Reference Standards:** ARCH-000, ADR-007, ADR-009, ADR-010, DEV-010A through DEV-012A  

---

# 1. Purpose & Objectives

- **Business Objective:** Establish definitive operational rules governing public construction projects in Malaysia, ensuring compliance with JKR standard site management directives.
- **Operational Objective:** Eliminate ambiguity in site logging, baseline schedule updates, physical progress measurements, and multi-tier approval sign-offs.
- **System Objective:** Provide a comprehensive, technology-agnostic business rules catalog that dictates system behavior across all 11 platform engines per **ARCH-000**.

---

# 2. Business Rule Philosophy

- **Explicit Rules:** Every system action MUST be governed by an explicitly documented rule. No implicit assumptions allowed.
- **Single Source of Truth:** Business rules reside in this locked specification and are enforced uniformly across all engines.
- **Deterministic Behaviour:** Given identical inputs and project state, business rule evaluation outcomes MUST be 100% consistent.
- **Immutable History:** Historical facts (e.g. approved site diaries, superseded baseline revisions) CANNOT be retroactively altered by new business rules.
- **Zero Hidden Rules:** No undocumented rules or hidden side-effects permitted in codebase implementations.
- **Domain Ownership:** Each rule is assigned to a specific primary owner engine responsible for its governance.

---

# 3. Business Rule Categories

1. **Programme Rules:** Master project baseline governance.
2. **Revision Rules:** Schedule revision import, publish, and replacement rules.
3. **Task Rules:** WBS schedule hierarchy rules.
4. **Activity Rules:** Site work unit execution rules.
5. **Open Activities Rules:** Active ongoing work pool evaluation rules.
6. **Site Diary Rules:** Daily site log creation, editing, and uniqueness rules.
7. **Workforce Rules:** Trade manpower headcount and classification rules.
8. **Progress Rules:** Physical measurement calculation and ceiling rules.
9. **Approval Rules:** Review hierarchy, sign-off, and return rules.
10. **Audit Rules:** Traceability logging and append-only rules.
11. **Carry Forward Rules:** Next-day unfinished work roll-forward rules.
12. **Notification Rules:** Alert dispatch rules.

---

# 4. Programme Business Rules (`BR-PROG`)

- **BR-PROG-001 (Uniqueness):** `programme_code` MUST be unique platform-wide across all JKR projects.
- **BR-PROG-002 (Child Guard):** A Programme CANNOT be deleted or archived if child revisions, tasks, or activities exist.
- **BR-PROG-003 (Active Operation):** Daily operational entries (Site Diaries) CAN ONLY be submitted for Programmes with status `Active`.
- **BR-PROG-004 (Closeout Requirement):** Formal project closeout requires all child activities to be `Completed` or `Cancelled` and all approvals signed off.

---

# 5. Revision Business Rules (`BR-REV`)

- **BR-REV-001 (Single Active Baseline):** Exactly ONE baseline revision (`is_active = true`) permitted per Programme at any time (**ADR-009**).
- **BR-REV-002 (Immutability of Published Baseline):** A published baseline revision (`is_active = true`) is PERMANENTLY READ-ONLY and CANNOT be edited.
- **BR-REV-003 (Immutability of Superseded Baseline):** Past baselines (`Superseded`) are permanently read-only historical snapshots.
- **BR-REV-004 (SO Endorsement Requirement):** A new schedule revision CANNOT be published until formally endorsed by the Superintending Officer (SO).
- **BR-REV-005 (Atomic Baseline Swap):** Swapping active baseline revisions MUST execute inside an atomic transaction boundary (**ADR-010**).

---

# 6. Task Business Rules (`BR-TASK`)

- **BR-TASK-001 (WBS Uniqueness):** `wbs_code` MUST be unique within a single baseline revision.
- **BR-TASK-002 (Hierarchy Integrity):** A child task MUST reference a valid parent WBS node within the same `revision_id`.
- **BR-TASK-003 (Acyclic Graph):** Circular predecessor dependencies are strictly prohibited.
- **BR-TASK-004 (Schedule Integrity):** Task `start_date` MUST be <= `finish_date`. Task `duration` MUST be >= 0.

---

# 7. Activity Business Rules (`BR-ACT`)

- **BR-ACT-001 (Single Revision Link):** Every operational Activity MUST belong to exactly one published baseline `revision_id`.
- **BR-ACT-002 (100% Progress Ceiling):** Cumulative progress percentage CANNOT exceed `100.00%`.
- **BR-ACT-003 (Completed Immutability):** `Completed` activities are locked against progress updates unless formally reopened via SO Approval.
- **BR-ACT-004 (Cancelled Scope Exclusion):** `Cancelled` activities are excluded from daily logging and Open Activities pools.
- **BR-ACT-005 (Suspended Work Governance):** `Suspended` activities carry forward to daily diaries but permit 0 progress increments.

---

# 8. Open Activities Rules (`BR-OA`)

- **BR-OA-001 (Eligibility Criteria):** An Activity is eligible for Today's Open Pool IF AND ONLY IF cumulative progress < 100.00% AND status IN (`Started`, `Continue`, `Suspended`).
- **BR-OA-002 (Automatic Pool Population):** Eligible activities are pre-populated into Today's Site Diary draft at 00:00:00 or upon diary initialization.
- **BR-OA-003 (Completion Exclusion):** Activities reaching 100% approved progress are automatically purged from the Open Pool.

---

# 9. Site Diary Rules (`BR-SD`)

- **BR-SD-001 (Composite Uniqueness):** Exactly ONE Site Diary entry permitted per `(programme_id, activity_id, diary_date)` combination.
- **BR-SD-002 (Update Engine Standard):** Submitting a diary for an existing date updates the existing row. System MUST NOT insert duplicate rows for the same activity on the same date.
- **BR-SD-003 (Approved Lock):** A Site Diary entry marked `Approved` is PERMANENTLY READ-ONLY for site engineers.
- **BR-SD-004 (No Future Logging):** `diary_date` CANNOT exceed Current Local Date (Future diaries strictly prohibited).

---

# 10. Workforce Rules (`BR-WF`)

- **BR-WF-001 (Trade Library Governance):** Selected `trade_id` MUST exist and have `is_active = true` in the master Trade Library (`trade_library`).
- **BR-WF-002 (Non-Negative Headcount):** `bumiputera_count >= 0`, `non_bumiputera_count >= 0`, `foreign_count >= 0`.
- **BR-WF-003 (Historical Snapshot):** Workforce entries capture trade name snapshots so future Trade Library modifications do not alter historical records.

---

# 11. Progress Rules (`BR-PG`)

- **BR-PG-001 (Non-Negative Actual Quantity):** Daily `actual_quantity` MUST be >= 0.00.
- **BR-PG-002 (Cumulative Cap):** `sum(actual_quantity) / planned_quantity * 100` MUST NOT exceed 100.00%.
- **BR-PG-003 (Unit Matching):** Physical progress unit MUST match the baseline Activity unit defined in active Revision.

---

# 12. Approval Rules (`BR-AP`)

- **BR-AP-001 (Authority Restriction):** Approval decisions (`Approved`, `Returned`, `Rejected`) restricted strictly to Superintending Officers (SO) / Assistant Engineers (AE).
- **BR-AP-002 (Mandatory Comment on Return/Reject):** Setting status to `Returned` or `Rejected` REQUIRES a mandatory comment (min 5 chars).
- **BR-AP-003 (Immutable Sign-Off):** Once set to `Approved`, approval decisions are immutable.

---

# 13. Audit Rules (`BR-AU`)

- **BR-AU-001 (Append-Only Trail):** Audit records are 100% append-only. UPDATE and DELETE operations strictly forbidden (**ADR-010**).
- **BR-AU-002 (Synchronous Audit Requirement):** Every critical operational transaction MUST write an audit record inside the atomic transaction boundary BEFORE commit.

---

# 14. Carry Forward Rules (`BR-CF`)

- **BR-CF-001 (Unfinished Inclusion):** All activities in `Started`, `Continue`, or `Suspended` states carry forward to the next daily diary automatically.
- **BR-CF-002 (Completed Exclusion):** Completed activities drop out of the carry forward pipeline.
- **BR-CF-003 (Rejected Resubmission):** Activities attached to returned/rejected approvals remain in the open pool flagged for correction.

---

# 15. Cross-Domain Rules & Rule Conflict Resolution

### Cross-Domain Event Cascade
1. **Approval -> Progress:** SO Approval locks Progress measurement record.
2. **Progress -> Activity:** 100% Progress approval triggers Activity status transition to `Completed`.
3. **Activity -> Carry Forward:** `Completed` Activity removed from Carry Forward Open Pool.
4. **Revision -> Activities:** Baseline publish re-maps ongoing activities to new WBS task IDs.

### Rule Evaluation Priority Order
When multiple rules overlap during payload execution, the system evaluates them in strict priority order:
1. **Security & Permission Rules (RBAC)** — Caller authorization checked first.
2. **Global & Technical Validation Rules** — Type, range, UUID, and ISO 8601 formatting checks.
3. **State Machine Transition Rules** — Allowed state transition check (DEV-011).
4. **Domain Business Rules** — Multi-entity business constraints evaluated inside Atomic Transaction Context.

---

# 16. Future Architecture Recommendations

- **External Business Rule Engine:** Evaluate metadata-driven rule engines (e.g. JSON-based decision tables) to allow JKR administrators to tune site diary validation thresholds dynamically.
- **Rule Simulation Sandbox:** Provide planners with a dry-run rule simulation tool to preview baseline revision transition impacts prior to publishing.

---
**END OF SPECIFICATION — DEV-012B**
