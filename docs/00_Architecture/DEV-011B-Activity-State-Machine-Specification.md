# DEV-011B — ACTIVITY STATE MACHINE SPECIFICATION
**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked  
**Reference Standards:** ARCH-000, ADR-007, ADR-009, ADR-010, DM-004, DEV-010A through DEV-011A  

---

# 1. State Diagram (Textual)

```
                 [ Not Started ]
                        │
                        ▼ (Preconditions & Baseline Start Date Met)
                    [ Ready ]
                        │
                        ▼ (First Work / Progress Logged)
                   [ Started ]
                        │
        ┌───────────────┼───────────────┐
        ▼ (Day End)     ▼ (Interrupted) ▼ (Target 100% Met & Approved)
   [ Continue ]   [ Suspended ]   [ Completed ]
        │               │               │
        ▼ (Work Resume) ▼ (Work Resume) ▼ (Project Closing)
   [ Continue ]   [ Continue ]    [ Archived ]
                        │
                        ▼ (VO / Schedule Revision Omission)
                   [ Cancelled ]
```

---

# 2. State Definitions

1. **`Not Started`**
   - Activity exists in active Baseline Revision schedule but execution preconditions (predecessor tasks, baseline start date) have not arrived. Cumulative progress = 0%.
2. **`Ready`**
   - Scheduled start date reached and predecessor tasks completed. Activity is available in Open Activities pool for site work initialization.
3. **`Started`**
   - First daily Site Diary entry or physical measurement recorded on site.
4. **`Continue`**
   - Active multi-day execution state. Carried forward daily while cumulative progress < 100%.
5. **`Suspended`**
   - Work temporarily halted due to inclement weather, material delay, or SO instruction.
6. **`Completed`**
   - Physical progress reached 100% and verified/approved by Superintending Officer.
7. **`Cancelled`**
   - Scope removed or replaced via contractual Variation Order (VO) or Arahan Pegawai Penguasa (APK) in a published schedule Revision update.
8. **`Archived`**
   - Permanent read-only project archive state upon final project closeout.

---

# 3. State Transition Matrix

| Current State | Target State | Trigger Event | Primary Owner Engine | Transition Rules & Requirements |
|---|---|---|---|---|
| N/A | `Not Started` | Revision Import | Activity Engine | Created during baseline publish |
| `Not Started` | `Ready` | Schedule Date Met | Activity Engine | Predecessors 100% complete |
| `Ready` | `Started` | First Progress Log | Activity Engine / Site Diary | Progress quantity > 0 logged |
| `Started` | `Continue` | Day End Unfinished | Carry Forward Engine | Progress < 100% at shift end |
| `Started` | `Completed` | 100% Progress Logged | Approval Engine | SO approves 100% measurement |
| `Continue` | `Suspended` | Site Work Halted | Activity Engine / Site Diary | Rain day or SO halt order logged |
| `Suspended` | `Continue` | Site Work Resumed | Activity Engine / Site Diary | Progress logging resumed |
| `Continue` | `Completed` | 100% Progress Logged | Approval Engine | SO approves final 100% progress |
| Any Active | `Cancelled` | Revision Publish | Revision Engine | Task removed/superseded in Rev N |
| `Completed` | `Archived` | Final Closeout | System Engine | Contract final acceptance |

---

# 4. Forbidden Transitions & Violation Protocols

- **Forbidden:** `Not Started` → `Completed` (Direct completion without recording progress). Violation: HTTP 400 Bad Request.
- **Forbidden:** `Completed` → `Continue` / `Started` (Direct logging of progress on finished activity). Violation: HTTP 409 Conflict (Reopen Approval required).
- **Forbidden:** `Cancelled` → `Started` / `Continue` (Logging work on cancelled scope). Violation: HTTP 422 Unprocessable Entity.
- **Forbidden:** `Archived` → Any State (Modification of archived activity). Violation: Permanent Lock Error.

---

# 5. Inter-Engine Interactions

- **Progress Engine:** Evaluates physical measurement quantities. Reaching 100% triggers transition request from `Continue` to `Completed`.
- **Workforce Engine:** Tracks daily trade manpower attached to the Activity during `Started`, `Continue`, and `Suspended` states.
- **Approval Engine:** Acts as gatekeeper for transition to `Completed`. Progress reaching 100% remains in `Pending` until SO approves.
- **Carry Forward Engine:** Monitors activities in `Started`, `Continue`, and `Suspended` states, populating them into tomorrow's Open Activities pool.
- **Audit Engine:** Records immutable event logs for every state transition with timestamp, actor ID, and justification.

---

# 6. Sequence Diagram (Textual)

```
Site Engineer                  Approval Engine               Activity Engine             Audit Engine
     │                                │                             │                          │
     │ 1. Log 100% Progress           │                             │                          │
     ├───────────────────────────────►│                             │                          │
     │                                │ 2. SO Approves 100% Progress│                          │
     │                                ├────────────────────────────►│                          │
     │                                │                             │ 3. Transition: Continue  │
     │                                │                             │    -> Completed          │
     │                                │                             ├─────────────────────────►│ 4. Log Audit Event
     │                                │                             │                          │    (Event: Complete)
     │ 5. Activity Removed from Open Pool                           │                          │
```

---

# 7. Edge Cases & Recovery Protocols

1. **Rejection of 100% Progress:** SO rejects 100% progress submission. Activity state reverts from `Pending Completion` back to `Continue`.
2. **Variation Order Supersedes Activity:** Baseline Revision N published while Activity is in `Continue` state. Old Activity marked `Cancelled`; new VO Activity initialized as `Not Started`.
3. **Work Resumed After Extended Suspension:** Activity suspended for > 30 days. Site Engineer submits resume request; state transitions `Suspended` → `Continue`.

---

# 8. Performance & Future Recommendations

- **Transition Latency:** All Activity state evaluations MUST execute in <= 150ms.
- **Batch State Transitions:** Support bulk state transitions during Programme Revision publish events (processing 5,000+ activities in < 1 second).
- **Automated Alerts:** Send automated notifications to Project Managers when an Activity remains in `Suspended` state for > 7 consecutive days.

---
**END OF SPECIFICATION — DEV-011B**
