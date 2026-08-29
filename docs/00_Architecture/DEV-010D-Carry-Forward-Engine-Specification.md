# DEV-010D — CARRY FORWARD ENGINE SPECIFICATION
**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked  
**Reference Standards:** ARCH-000, ADR-007, ADR-009, ADR-010, DEV-010A, DEV-010B, DEV-010C  

---

# 1. Purpose Objectives

- **Business Objective:** Ensure seamless operational continuity on public construction projects by automatically rolling unfinished site activities into subsequent daily site diaries without manual re-entry.
- **Operational Objective:** Eliminate administrative overhead for site supervisors while enforcing accurate physical progress tracking across calendar days.
- **System Objective:** Provide a deterministic, high-performance evaluation engine that computes the active Open Activities pool based strictly on the active Programme Revision, previous physical progress, and approval decisions.

---

# 2. Execution Triggers

1. **Scheduled Midnight Trigger (Cron):** System automatically evaluates Open Activities for all active projects at 00:00:00 local time daily.
2. **On-Demand Site Diary Initialization:** Triggered when a Site Engineer clicks "Initialize New Site Diary" for a specific target date.
3. **Programme Revision Publish Trigger:** Automatically re-evaluates and re-maps the Open Activities pool whenever a new Programme Baseline Revision is published.
4. **Manual Regeneration Trigger:** Triggered by authorized Project Planners / SOs to force a recalculation of active open pools after data corrections.

---

# 3. Inputs & Inputs Context

- **Programme:** Active `programme_id`.
- **Revision:** Active baseline `revision_id` (from `programme_revision`).
- **Activities:** Master list of activities linked to active revision tasks.
- **Site Diary:** Latest site diary entries (`site_diary`) recorded for Date T-1.
- **Progress:** Cumulative physical progress quantities and percentages (`progress`).
- **Approval:** Status of previous day's approval requests (`approval`).
- **Weather:** Weather session logs (Rain/Stoppage indicators).

---

# 4. Output

- **Tomorrow's Open Activities Pool:** A structured set of eligible Activity records populated into the Target Date's Site Diary draft, maintaining historical links to parent tasks and trades.

---

# 5. Eligibility Rules

### An Activity SHALL Appear in Tomorrow's Open Pool IF:
- Cumulative physical progress percentage < 100.00%.
- Activity operational status is `Started`, `Continue`, or `Suspended`.
- Activity is linked to an active WBS task in the current published Baseline Revision.
- Approval status of previous log is NOT `Rejected` (or if `Returned`, awaiting resubmission).

### An Activity SHALL NOT Appear in Tomorrow's Open Pool IF:
- Cumulative physical progress percentage = 100.00%.
- Activity operational status is `Completed`, `Archived`, or `Cancelled`.
- Activity was removed or superseded in a published Revision update.
- Activity is marked `Not Started` AND its scheduled baseline start date is in the future.

---

# 6. Carry Forward Decision Matrix

| Activity State | Physical Progress State | Approval State | Carry Forward Action / Outcome |
|---|---|---|---|
| `Not Started` | 0% | N/A | **INCLUDED** if scheduled start date <= Target Date |
| `Started` | < 100% | `Pending` / `Approved` | **INCLUDED** as `Continue` |
| `Continue` | < 100% | `Pending` / `Approved` | **INCLUDED** as `Continue` |
| `Suspended` | < 100% | `Pending` / `Approved` | **INCLUDED** as `Suspended` |
| `Continue` | 100% | `Approved` | **EXCLUDED** (Transition to `Completed`) |
| `Continue` | 100% | `Pending` | **INCLUDED** until SO approves 100% completion |
| Any State | < 100% | `Rejected` | **INCLUDED** with `Correction Required` flag |
| Any State | Any | `Cancelled` | **EXCLUDED** |
| `Completed` | 100% | `Approved` | **EXCLUDED** (Moved to Archive Pool) |

---

# 7. Priority & Revision Mapping Rules

- **Multiple Revisions:** The engine MUST evaluate activities strictly against the single `programme_revision` marked `is_active = TRUE`.
- **WBS Matching:** Old WBS task codes are mapped to New WBS task codes via `task_id` or unique `wbs_code` match.
- **Replacement / VO / APK:**
  - If a Variation Order (VO) or Arahan Pegawai Penguasa (APK) replaces an Activity, the old Activity is marked `Cancelled` and the replacement Activity is initialized as `Not Started`.
- **Removed Activities:** Activities present in Revision N-1 but omitted in Revision N transition to `Cancelled` and drop out of the pool.

---

# 8. Automatic State Update Ownership

- **`Activity Engine`:** Owns operational state transitions (`Not Started` → `Started` → `Continue` → `Completed` → `Archived`).
- **`Carry Forward Engine`:** Evaluates criteria and triggers Activity Engine state update requests.
- **`Site Diary Engine`:** Inherits updated states for daily logging.
- **`Approval Engine`:** Validates and locks final transition to `Completed` / `Archived`.

---

# 9. Duplicate Prevention & Historical Integrity

- **Idempotent Evaluation:** Running the Carry Forward evaluation multiple times for the same target date MUST produce identical results without duplicating rows.
- **Zero Row Deletion:** Historical records in `site_diary`, `workforce`, and `progress` are NEVER modified or deleted during carry forward.
- **Immutable Log Standard:** State modifications log a new entry in `site_diary_logs` / `audit`.

---

# 10. Performance Specifications

- **Execution Latency:** Maximum 500ms execution time for evaluating project open activities pools up to 1,000 active activities.
- **Batch Evaluation:** Process projects in parallel worker queues using bulk SELECT queries filtered by active `revision_id`.
- **In-Memory Caching:** Cache active Baseline WBS trees during batch evaluation to reduce DB I/O.

---

# 11. Sequence Diagram (Textual)

```
Scheduler / Client Request
  │
  │  1. Execute Carry Forward Evaluation (Target Date)
  ▼
Carry Forward Engine
  │
  │  2. Fetch Active Revision ───────────────► Revision Engine
  │  3. Fetch Ongoing Activities ─────────────► Activity Engine
  │  4. Fetch Cumulative Progress Data ───────► Progress Engine
  │  5. Fetch Approval Statuses ──────────────► Approval Engine
  │
  │  6. Apply Carry Forward Decision Matrix
  │  7. Generate Target Open Activities Pool
  ▼
Open Activities Pool Ready for Site Diary Pre-Population
```

---

# 12. Edge Cases & Exception Protocols

1. **Inclement Weather / Rain Day:** Activity carried forward as `Suspended` or `Continue` with 0 progress.
2. **Public Holiday / Site Shutdown:** Engine carries forward active activities to the next working day; zero progress logged.
3. **Zero Progress Logged:** Activity remains in `Continue` state and continues carrying forward.
4. **Rejected / Returned Approval:** Activity remains in Open Pool marked for correction; progress not locked until approved.
5. **Offline Sync Catch-Up:** Mobile client applies local Carry Forward Matrix offline and reconciles with server pool upon reconnecting.

---

# 13. Future Scalability Recommendations

1. **Incremental Evaluation:** Evaluate Carry Forward delta updates on-the-fly when Site Diaries are submitted, avoiding midnight batch job bottlenecks.
2. **Distributed Queue Architecture:** Deploy Redis/RabbitMQ queues to distribute project carry forward processing across microservices.
3. **Optimistic Pre-Fetching:** Pre-cache Open Activities pools on edge nodes for instant mobile app loading.

---
**END OF SPECIFICATION — DEV-010D**
