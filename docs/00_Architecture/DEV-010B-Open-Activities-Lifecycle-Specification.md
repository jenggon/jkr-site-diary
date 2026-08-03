# DEV-010B — OPEN ACTIVITIES LIFECYCLE SPECIFICATION
**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked  
**Reference Standards:** ARCH-000, ADR-007, ADR-009, ADR-010, DEV-010A  

---

# 1. Purpose & Business Justification

### What is Open Activities?
**Open Activities** represents the engine that manages active, ongoing, or pending construction works on site. It acts as the operational bridge between the macro project schedule (Programme WBS Tasks) and daily site execution logs (Site Diary, Workforce, Physical Progress).

### Why it Exists?
On physical construction sites, activities rarely complete within a single calendar day. Work continuously spans across consecutive days until physical targets are met. Without Open Activities:
1. Site Engineers would have to manually re-select and re-enter ongoing tasks every morning.
2. Unfinished work from yesterday would be lost or omitted from daily site diaries.
3. Historical continuity between daily progress measurements and overall task progress would break.

### Business Justification
- **Operational Automation:** Automatically carries forward active works to today's site diary draft.
- **Data Integrity & Compliance:** Ensures every day's work is linked to a valid baseline Activity and Revision context.
- **Accurate Reporting:** Prevents duplicate diary entries for the same activity on the same date while guaranteeing complete traceability.

---

# 2. Complete Activity Lifecycle & States

```
                 [ Not Started ]
                        │
                        ▼ (Start Work)
                   [ Started ]
                        │
       ┌────────────────┼────────────────┐
       ▼ (Day End)      ▼ (Interrupted)  ▼ (Target Met)
  [ Continue ]     [ Suspended ]    [ Completed ]
       │                │                │
       ▼ (Next Day Work)▼ (Work Resumed) ▼ (Closing)
  [ Continue ]     [ Continue ]     [ Archived ]
```

### State Definitions & Transition Triggers

1. **`Not Started`**
   - *Definition:* Activity exists in the active Programme Baseline schedule but has zero recorded physical progress or Site Diary entries.
   - *Transition:* Transitions to `Started` when the first Site Diary entry or physical measurement is recorded.

2. **`Started`**
   - *Definition:* Initial execution date of the Activity.
   - *Transition:* Transitions to `Continue` at day-end if cumulative progress < 100%, or `Completed` if progress = 100%.

3. **`Continue` (Carry Forward)**
   - *Definition:* Active operational state for ongoing multi-day activities. Work is actively carried forward daily.
   - *Transition:* Remains `Continue` until final physical completion target is achieved.

4. **`Suspended`**
   - *Definition:* Work on the Activity is temporarily halted due to site obstructions, bad weather, material shortages, or SO instruction.
   - *Transition:* Transitions back to `Continue` upon resumption, or `Cancelled` if abandoned.

5. **`Completed`**
   - *Definition:* Activity physical target reached 100% and verified by SO/AE.
   - *Transition:* Automatically removed from daily Open Activities pool. Transitions to `Archived` upon final closure.

6. **`Archived`**
   - *Definition:* Read-only historical state. No further site diaries or progress logs can be attached.

7. **`Cancelled` / `Returned`**
   - *Definition:* Activity removed by schedule revision or returned by SO during approval review.

---

# 3. Carry Forward Engine Rules

1. **Activation Trigger:** Every night at 00:00:00 or when a new Site Diary date is initialized, the Open Activities Engine evaluates all activities with status `Started`, `Continue`, or `Suspended`.
2. **Inclusion Criteria:** An Activity appears in Today's Open Activities list IF AND ONLY IF:
   - Cumulative physical progress < 100%.
   - Operational status is NOT `Completed`, `Archived`, or `Cancelled`.
   - The Activity belongs to the active Programme Baseline Revision.
3. **Disappearance Criteria:** An Activity automatically disappears from the Open Activities pool when:
   - Cumulative progress reaches 100% and is marked `Completed`.
   - The Activity is deleted/superseded by a published schedule Revision update.
4. **Archival Automation:** Completed activities enter `Archived` status once the associated Approval request is approved by the Superintending Officer.

---

# 4. Daily Site Diary Behaviour (Yesterday → Today → Tomorrow)

```
[ YESTERDAY ]                   [ TODAY ]                    [ TOMORROW ]
Site Diary Submitted ───►  Open Activities Evaluated ───►  Auto-Populated Draft
• Activity A (60%)         • Activity A (Unfinished)       • Activity A (Ongoing)
• Activity B (100%)        • Activity B (Completed -> OUT) • Activity C (New Start)
```

- **Yesterday:** Site Diary recorded 60% completion for Activity A and 100% for Activity B.
- **Today:**
  - Activity A (60%) is automatically pulled into Today's Open Activities list as `Continue`.
  - Activity B (100%) is filtered out and no longer appears in Open Activities.
- **Tomorrow:** When Tomorrow's Site Diary is initialized, Activity A will carry forward automatically until marked 100% complete.

---

# 5. State Transition Rules Matrix

| Current State | Target State | Allowed? | Required Trigger | Violation Outcome |
|---|---|---|---|---|
| `Not Started` | `Started` | **YES** | First Site Diary / Progress log | N/A |
| `Not Started` | `Completed` | **NO** | Direct jump without execution | Forbidden State Transition Error |
| `Started` | `Continue` | **YES** | Unfinished work at day-end | N/A |
| `Started` | `Completed` | **YES** | 100% progress recorded on Day 1 | N/A |
| `Continue` | `Suspended` | **YES** | Inclement weather / SO halt order | N/A |
| `Suspended` | `Continue` | **YES** | Site work resumes | N/A |
| `Completed` | `Continue` | **NO** | Attempt to log progress on completed work | Reopen Activity approval required |
| `Completed` | `Archived` | **YES** | SO approval of final diary | N/A |
| `Archived` | Any State | **NO** | Direct modification of archived entity | System Lockout Error |

---

# 6. Core Business & Architecture Rules

1. **Strict Duplicate Prevention:**
   - One `site_diary` row represents ONE current activity for a specific calendar date (`site_diary_id` + `activity_id` + `date` composite constraint).
   - Edits ALWAYS update the existing row. System MUST NOT insert duplicate rows for the same activity on the same date.
2. **LHI Engine (Log Hari Ini) Standard:**
   - Displays ONLY current active records from `site_diary`.
   - Never displays historical UPDATE logs. History resides strictly in `site_diary_logs` / `audit`.
3. **Revision Replacement Rule:**
   - When a new Programme Revision is published, ongoing Open Activities map to matching WBS task codes in the new revision.
   - Removed WBS tasks transition to `Cancelled` and drop out of Open Activities.
4. **Reopening Closed Activities:**
   - A `Completed` activity cannot be reopened directly by site engineers. Reopening requires formal SO approval via Approval Engine.

---

# 7. Engine Ownership Architecture

```
+--------------------------+-------------------------------------------------------------+
| Engine                   | Exclusive Ownership Responsibility                          |
+--------------------------+-------------------------------------------------------------+
| Activity Engine          | Operational States (Not Started, Started, Completed)        |
| Site Diary Engine        | Daily Log Entries, Weather Sessions, Work Summaries         |
| Open Activities Engine   | Carry Forward Logic, Active Pool Evaluation                 |
| Workforce Engine         | Trade Manpower Breakdown & Headcounts                       |
| Progress Engine          | Physical Progress Quantities & Percentage Calculations      |
| Approval Engine          | Workflow Approval States (Pending, Approved, Rejected)      |
| Audit Engine             | Immutable Event Logging & Traceability                      |
+--------------------------+-------------------------------------------------------------+
```

---

# 8. Transaction & Atomicity Rules

Per **ADR-010**, all operations updating Open Activity status, creating daily Site Diaries, recording manpower, and logging progress MUST execute within a single **Atomic Transaction Boundary**.

```
BEGIN TRANSACTION;
  1. Insert/Update Site Diary Entry
  2. Insert/Update Workforce Manpower Records
  3. Insert/Update Progress Physical Measurements
  4. Update Activity Operational State (e.g., Started -> Continue)
  5. Insert Audit Log Event Record
COMMIT TRANSACTION;
-- On Any Failure: ROLLBACK EVERYTHING
```

---

# 9. Sequence Diagram (Textual)

```
User (Site Engineer)
  │
  │ 1. Request Today's Open Activities (GET /api/open-activities)
  ▼
Site Diary REST API
  │ 2. Query openActivitiesService.getOpenActivitiesForDate(date)
  ▼
Open Activities Service ───► Evaluates Active Baseline Revision & Unfinished Works
  │ 3. Return Active Open Activities List
  ▼
User Interface (App Displays Auto-Populated Work List)
  │
  │ 4. Submit Daily Progress & Manpower Log (POST /api/site-diary)
  ▼
Site Diary REST API ───► Site Diary Service
  │
  ├─► Invoke workforceService.createWorkforce() ────► Workforce Repository
  ├─► Invoke progressService.createProgress() ──────► Progress Repository
  ├─► Invoke approvalService.createApproval() ──────► Approval Repository
  └─► Invoke auditService.createAudit() ───────────► Audit Repository
  │
  ▼ (Atomic Commit Completed)
User Receives HTTP 201 Created Response
```

---

# 10. Operational Edge Cases & Handling Protocols

1. **Inclement Weather / Rain Day:**
   - Activity progress remains unchanged (0% for the day). Weather session logged as Rain/Stoppage. Activity carries forward to next day as `Suspended` or `Continue`.
2. **Zero Progress Logged:**
   - Site Diary recorded with 0 progress. Activity remains in `Continue` state and carries forward automatically.
3. **Rejected Approval:**
   - SO rejects submission. Approval state set to `Rejected`. Site Diary and Progress records remain editable by Site Engineer for correction.
4. **Returned Approval:**
   - Approval state set to `Returned`. Activity remains in Open Activities list awaiting corrected resubmission.
5. **Deleted Site Diary Entry:**
   - Physical deletion prohibited. Reverted via audit correction entry; Activity state recalculated from latest valid log.

---

# 11. Future Scalability & Architecture Recommendations

1. **Multi-Project Scalability:** Open Activities Engine must filter active pools strictly by `programme_id` to guarantee tenant isolation across concurrent multi-project deployments.
2. **Offline-First Mobile Sync:** Mobile clients should store local Open Activities snapshots using IndexedDB/SQLite and submit batched atomic transaction payloads upon reconnecting.
3. **High-Concurrency Optimizations:** Implement optimistic concurrency locking (`updated_at` check) to prevent race conditions when multiple site supervisors update different trades on the same Activity.

---
**END OF SPECIFICATION — DEV-010B**
