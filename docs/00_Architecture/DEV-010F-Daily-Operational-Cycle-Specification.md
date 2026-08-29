# DEV-010F — DAILY OPERATIONAL CYCLE SPECIFICATION
**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked  
**Reference Standards:** ARCH-000, ADR-007, ADR-009, ADR-010, DEV-010A through DEV-010E  

---

# 1. Purpose Objectives

- **Business Objective:** Standardize the daily 24-hour construction operational cycle across public infrastructure projects, ensuring zero site activity goes unrecorded or un-audited.
- **Operational Objective:** Seamlessly connect morning site initialization, daytime progress logging, evening submission, and Superintending Officer (SO) approval into a cohesive, automated daily workflow.
- **System Objective:** Coordinate all 11 core platform engines in a strict, transaction-safe lifecycle that guarantees data integrity, immutability, and instant auditability.

---

# 2. Daily Timeline (24-Hour Cycle)

```
00:00 - Midnight      │ Cron pre-initializes Open Activities pool & Draft Site Diary.
07:00 - Morning       │ Site Supervisor opens app; active tasks & trade lists pre-populated.
08:00 - 17:00 Working │ On-site progress & manpower updates logged in real-time.
17:30 - Submission    │ Supervisor submits completed Daily Site Diary for SO review.
18:00 - Approval      │ Superintending Officer (SO) reviews, comments, and approves/returns.
22:00 - Day Close     │ Approved diaries locked; Carry Forward Engine evaluates next day pool.
```

---

# 3. Participating Engines Matrix

1. **Programme Engine:** Provides master project context (`programme_id`).
2. **Revision Engine:** Provides current active baseline revision context (`revision_id`).
3. **Task Engine:** Links operational activities to WBS baseline nodes.
4. **Activity Engine:** Controls operational activity lifecycle states.
5. **Open Activities Engine:** Evaluates active/ongoing work pool for daily pre-population.
6. **Site Diary Engine:** Manages daily log entries, weather sessions, and summaries.
7. **Workforce Engine:** Manages trade manpower counts (Bumiputera, Non-Bumiputera, Foreign).
8. **Progress Engine:** Manages physical measurement quantities and percentages.
9. **Approval Engine:** Manages multi-level SO approval workflows.
10. **Audit Engine:** Captures immutable append-only event trail.
11. **Carry Forward Engine:** Automates rolling unfinished works to subsequent day.

---

# 4. Morning Initialization Workflow (00:00 - 08:00)

- **Draft Site Diary Initialization:** System creates a `Draft` shell for the target date.
- **Open Activities Evaluation:** Open Activities Engine identifies all activities with status `Started`, `Continue`, or `Suspended` from active baseline.
- **Trade Master Loading:** Workforce Engine fetches active trades from Trade Library (`trade_library`).
- **Progress Draft Pre-Population:** Progress Engine sets baseline targets (`planned_quantity`, `unit`) while resetting daily `actual_quantity = 0.00`.
- **Weather Session Reset:** Weather fields initialized to default morning/afternoon options.

---

# 5. Operational Daytime Updates (08:00 - 17:00)

- **Real-Time Data Capture:** Site Supervisors log actual manpower headcounts per trade and physical quantities executed during the shift.
- **Optimistic Autosave:** Client application debounces field changes and sends autosave updates to the backend API every 30 seconds.
- **Local Draft Integrity:** Un-submitted entries remain in `Draft` status and are accessible only to authorized project site staff.

---

# 6. Evening Submission Workflow (17:30)

```
[ Site Engineer Clicks "Submit Site Diary" ]
                    │
                    ▼
┌────────────────────────────────────────────────────────┐
│ 1. Validate mandatory fields (Weather, Manpower, etc.) │
│ 2. Execute Atomic Transaction (ADR-010):              │
│    - Save Site Diary Record                           │
│    - Batch Insert Workforce Trade Counts              │
│    - Record Progress Quantities                       │
│    - Create Approval Record (Status: Pending)         │
│    - Insert Audit Event Record (Event: Create/Submit) │
│ 3. Update Activity State to 'Continue' or 'Completed' │
└────────────────────────────────────────────────────────┘
                    │
                    ▼
[ User Receives HTTP 201 Created & Approval Request Dispatched ]
```

---

# 7. Approval & Review Workflow (18:00 - 21:00)

1. **Pending:** SO receives push notification / dashboard alert for pending site diary.
2. **Approved:** SO verifies entries and approves. Record status set to `Approved`; physical progress locked; audit logged.
3. **Returned:** SO requests correction (e.g., inaccurate manpower or rain hours omitted). Record status set to `Returned`; supervisor notified to resubmit.
4. **Rejected:** Formal rejection of invalid site record.

---

# 8. Day Closing & Carry Forward Execution (22:00 - 00:00)

- **Completion Locking:** Activities with 100% approved progress transition to `Completed` and drop out of active Open Pool.
- **Carry Forward Trigger:** Carry Forward Engine executes at 23:59:59, evaluating all approved unfinished activities and populating tomorrow's Open Pool.
- **Immutability Enforcement:** Approved day records are locked against further modification.

---

# 9. Sequence Diagram (Textual)

```
Scheduler / User
  │
  ├─► 1. Midnight: Pre-populate Open Activities Pool ──► Open Activities Engine
  │
  ├─► 2. Morning: Open App & Pre-fill Draft ───────────► Site Diary Engine
  │
  ├─► 3. Daytime: Real-time Manpower & Progress Logs ──► Workforce & Progress Engines
  │
  ├─► 4. Evening: Submit Site Diary (Atomic Tx) ───────► Approval Engine
  │
  ├─► 5. Night: SO Approves Submission ────────────────► Audit Engine
  │
  └─► 6. Day Close: Carry Forward Engine Runs ─────────► Next Day Open Pool
```

---

# 10. Failure Recovery & Resiliency Protocols

| Failure Scenario | Impact | System Recovery Mechanism |
|---|---|---|
| **Network Loss During Shift** | Supervisor unable to reach server | Client saves locally in offline database; syncs automatically upon reconnect |
| **Approval Returned by SO** | Diary locked in pending review | Status changes to `Returned`; unlocks editing for site supervisor resubmission |
| **Mid-Day Baseline Change** | Schedule revision updated during shift | System re-maps active activities to new baseline revision transparently |
| **Concurrent Editing Conflict** | Two supervisors update same activity | Optimistic locking (`updated_at` check) rejects stale payload and prompts merge |

---

# 11. Performance & Throughput Targets

- **Daily Peak Throughput:** Support 10,000+ simultaneous daily site diary submissions between 17:00 and 19:00.
- **Autosave Debounce Frequency:** 30 seconds interval for client background sync.
- **End-to-End Submission Latency:** <= 300ms for full atomic submission transaction.

---

# 12. Future Architecture Recommendations

1. **Offline-First Mobile Architecture:** Deploy PWA / Native Mobile apps with SQLite offline storage and background sync queues.
2. **Live Co-Authoring:** Implement WebSockets/CRDTs to allow real-time collaborative diary editing by multiple site engineers.
3. **Automated SO Notifications:** Send automated SMS/Push alerts to SOs for pending approvals exceeding 2 hours.

---
**END OF SPECIFICATION — DEV-010F**
