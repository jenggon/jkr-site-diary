# DEV-011E — OPEN ACTIVITIES STATE MACHINE SPECIFICATION
**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked  
**Reference Standards:** ARCH-000, ADR-007, ADR-009, ADR-010, OA-001, DEV-010A through DEV-011D  

---

# 1. Purpose Objectives

- **Business Objective:** Automate and govern the active pool of ongoing site activities across project calendar days, guaranteeing that no unfinished work is omitted from daily site diaries.
- **Workflow Objective:** Dynamically evaluate and transition Open Activity states based on active baseline revisions, daily site diary logs, physical progress calculations, and SO approval decisions.
- **System Objective:** Provide an idempotent, high-performance state machine for pre-populating daily site diary drafts while ensuring strict tenant isolation across projects.

---

# 2. State Diagram (Textual)

```
             [ Pending Initialization ]
                         │
                         ▼ (Baseline Schedule Date Reached)
                    [ Eligible ]
                         │
                         ▼ (Site Work Commenced / Logged)
                     [ Active ]
                         │
        ┌────────────────┼────────────────┐
        ▼ (Day End)      ▼ (Halted)       ▼ (100% Approved Progress)
 [ Carry Forward ]  [ Suspended ]    [ Completed ]
        │                │                │
        ▼ (Resumed)      ▼ (Resumed)      ▼ (Closeout)
    [ Active ]       [ Active ]      [ Archived ]
                         │
                         ▼ (Schedule Revision Omission)
                    [ Cancelled ]
```

---

# 3. State Definitions

1. **`Pending Initialization`**
   - Activity exists in published Baseline Revision schedule but its scheduled start date is in the future.
2. **`Eligible`**
   - Scheduled start date reached; activity is available to be selected for daily site work.
3. **`Active`**
   - Activity is currently being executed on site today with progress or manpower logged.
4. **`Suspended`**
   - Execution temporarily halted due to bad weather, material delays, or SO instruction.
5. **`Carry Forward`**
   - Unfinished work (< 100% progress) rolled forward to tomorrow's Open Activities pool.
6. **`Completed`**
   - Physical progress reached 100% and verified/approved by SO. Automatically removed from Open Pool.
7. **`Cancelled`**
   - Activity scope removed or superseded by a published schedule Revision update.
8. **`Archived`**
   - Read-only historical state upon project final contract completion.

---

# 4. State Transition Matrix

| Current State | Target State | Trigger Action | Owner Engine | Transition Rules & Requirements |
|---|---|---|---|---|
| N/A | `Pending Initialization` | Revision Import | Open Activities Engine | Baseline schedule imported |
| `Pending Init` | `Eligible` | Date Reached | Carry Forward / Scheduler | Target Date >= Scheduled Start Date |
| `Eligible` | `Active` | First Log | Site Diary Engine | First daily log created |
| `Active` | `Carry Forward` | Day End Unfinished | Carry Forward Engine | Progress < 100% at shift end |
| `Carry Forward` | `Active` | Next Day Work | Open Activities Engine | Pre-populated into new day draft |
| `Active` | `Suspended` | Halt Logged | Site Diary / Activity | Stoppage logged in diary |
| `Suspended` | `Active` | Resume Logged | Site Diary / Activity | Work resumed on site |
| `Active` | `Completed` | 100% SO Approval | Approval Engine | SO approves final 100% progress |
| Any Active | `Cancelled` | Revision Publish | Revision Engine | Task removed in Revision N |
| `Completed` | `Archived` | Final Closeout | System Engine | Contract final acceptance |

---

# 5. Forbidden Transitions & Violation Protocols

- **Forbidden:** `Pending Initialization` → `Completed` (Bypassing site execution). Violation: HTTP 400 Bad Request.
- **Forbidden:** `Completed` → `Active` / `Carry Forward` (Re-opening finished activity without approval). Violation: HTTP 409 Conflict.
- **Forbidden:** `Cancelled` → `Active` (Logging work on removed scope). Violation: HTTP 422 Unprocessable Entity.
- **Forbidden:** `Archived` → Any State (Mutating archived entity). Violation: Permanent Lock Error.

---

# 6. Inter-Engine Interactions

- **Scheduler / Cron:** Executes midnight batch evaluation transitioning `Pending Initialization` → `Eligible` and initializing `Carry Forward` pools.
- **Site Diary Engine:** Interacts with `Active` state during daily logging.
- **Progress Engine:** 100% progress triggers transition evaluation to `Completed`.
- **Approval Engine:** Acts as gatekeeper for locking `Completed` state.
- **Revision Engine:** Triggers `Cancelled` state for tasks omitted in new baseline publishes.
- **Audit Engine:** Synchronously logs all Open Activity state transitions.

---

# 7. Sequence Diagram (Textual)

```
Scheduler / Midnight Cron          Open Activities Engine          Carry Forward Engine           Audit Engine
           │                                 │                               │                         │
           │ 1. Trigger Daily Open Pool Eval │                               │                         │
           ├────────────────────────────────►│                               │                         │
           │                                 │ 2. Evaluate Unfinished Work   │                         │
           │                                 ├──────────────────────────────►│                         │
           │                                 │                               │ 3. State -> Carry       │
           │                                 │                               │    Forward              │
           │                                 │ 4. Pre-populate Target Pool   ├────────────────────────►│ 5. Log Event
           │                                 ◄───────────────────────────────┤                         │
```

---

# 8. Edge Cases & Recovery Protocols

1. **Rejected 100% Progress:** SO rejects 100% progress log. Open Activity state reverts from `Pending Completion` back to `Carry Forward`.
2. **Revision Update Mid-Project:** Published Revision N deletes an active task. Open Activity transitions to `Cancelled` and drops out of pool.
3. **Multi-Project Isolation:** All evaluations filter strictly by `programme_id` to guarantee project boundary isolation.

---

# 9. Performance & Future Recommendations

- **Evaluation Latency:** Open Pool evaluation MUST execute in <= 250ms per project.
- **Microservice Readiness:** Designed as an autonomous worker service with zero direct cross-database dependencies.
- **Edge Pre-Caching:** Cache Open Activity pools in edge Redis clusters for instant mobile application startup.

---
**END OF SPECIFICATION — DEV-011E**
