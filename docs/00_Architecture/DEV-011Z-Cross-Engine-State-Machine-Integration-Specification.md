# DEV-011Z — CROSS-ENGINE STATE MACHINE INTEGRATION SPECIFICATION
**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked  
**Reference Standards:** ARCH-000, ADR-007, ADR-009, ADR-010, DEV-010A through DEV-011F  

---

# 1. Purpose Objectives

- **Business Objective:** Provide global architecture governance for all platform state machine interactions across public construction projects.
- **Workflow Objective:** Orchestrate events across all 11 domain engines to ensure state transitions occur in a deterministic, conflict-free, transactionally sound sequence.
- **System Objective:** Enforce strict boundary isolation, explicit locking orders, clear transaction boundaries (Atomic, Compensation, Eventual Consistency), and synchronous auditability per **ADR-010**.

---

# 2. Participating Engines

1. **Programme Engine:** Master project root context (`programme_id`).
2. **Revision Engine:** Active baseline schedule governance (`revision_id`).
3. **Task Engine:** WBS schedule hierarchy nodes.
4. **Activity Engine:** Site work unit execution states.
5. **Open Activities Engine:** Active/ongoing work pool evaluation.
6. **Site Diary Engine:** Daily site log entries, weather, summaries.
7. **Workforce Engine:** Trade manpower headcounts.
8. **Progress Engine:** Physical quantity measurements & percentages.
9. **Approval Engine:** SO/AE review and approval decisions.
10. **Audit Engine:** Immutable append-only event logging.
11. **Carry Forward Engine:** Automatic next-day work pool roll-forward.

---

# 3. State Transition Ownership Matrix

| Domain Entity | State Transition | Owner Engine | Auxiliary Subscribed Engines |
|---|---|---|---|
| **Programme** | Active → Archived | Programme Engine | Revision, Audit |
| **Revision** | Approved → Published (Active) | Revision Engine | Task, Activity, Carry Forward, Audit |
| **Activity** | Not Started → Started → Continue | Activity Engine | Site Diary, Progress, Carry Forward, Audit |
| **Activity** | Continue → Completed | Activity Engine | Approval, Progress, Carry Forward, Audit |
| **Site Diary** | Draft → Submitted | Site Diary Engine | Approval, Workforce, Progress, Audit |
| **Site Diary** | Submitted → Approved / Returned | Site Diary Engine | Approval, Carry Forward, Audit |
| **Progress** | Draft → Measured → Approved | Progress Engine | Site Diary, Activity, Approval, Audit |
| **Approval** | Pending → Approved / Returned / Rejected | Approval Engine | Site Diary, Progress, Activity, Audit |

---

# 4. Cross-Engine Event Catalogue & Matrix

| Event Name | Publisher | Subscribers | Expected Outcome |
|---|---|---|---|
| `BaselinePublished` | Revision Engine | Task, Activity, Carry Forward, Audit | Re-maps active activities; Swaps active baseline |
| `SiteDiaryCreated` | Site Diary Engine | Workforce, Progress, Audit | Pre-populates daily draft; Initializes counts |
| `SiteDiarySubmitted` | Site Diary Engine | Approval, Progress, Audit | Locks editing; Spawns Pending Approval request |
| `ApprovalApproved` | Approval Engine | Site Diary, Progress, Activity, Carry Forward, Audit | Confirms progress; Locks diary; Updates Activity |
| `ApprovalReturned` | Approval Engine | Site Diary, Progress, Audit | Unlocks diary editing for resubmission |
| `ActivityCompleted` | Activity Engine | Carry Forward, Open Activities, Audit | Removes Activity from Open Pool |
| `CarryForwardExecuted`| Carry Forward Engine | Open Activities, Site Diary, Audit | Populates tomorrow's Open Pool |

---

# 5. Transaction Boundary Architecture

```
+-----------------------------------------------------------------------------------+
| 1. ATOMIC TRANSACTION BOUNDARY (Synchronous Database Commit / Rollback)           |
|    - Site Diary Save / Update                                                     |
|    - Workforce Trade Headcount Persistence                                        |
|    - Progress Physical Quantity Persistence                                       |
|    - Approval Request State Generation                                            |
|    - Audit Event Log Insertion                                                    |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| 2. EVENTUALLY CONSISTENT BOUNDARY (Asynchronous Event Dispatch)                   |
|    - Push Notification Dispatch to Superintending Officer                         |
|    - Executive HQ Dashboard Metric Cache Update                                   |
|    - Analytics Engine Ingestion                                                   |
+-----------------------------------------------------------------------------------+
```

---

# 6. Resource Locking & Execution Orders

### Resource Locking Order (Prevents Deadlocks)
1. Lock `programme` (READ LOCK)
2. Lock `programme_revision` (READ LOCK)
3. Lock `activity` (ROW EXCLUSIVE LOCK)
4. Lock `site_diary` (ROW EXCLUSIVE LOCK)
5. Lock `progress` / `workforce` (ROW EXCLUSIVE LOCK)
6. Lock `approval` (ROW EXCLUSIVE LOCK)
7. Insert `audit` (ROW INSERT)

### Audit & Notification Logging Order
1. **Validation & State Check:** Perform preconditions and permissions checks.
2. **Business Operation Execution:** Update domain tables inside Atomic Transaction.
3. **Synchronous Audit Persistence:** Insert audit event record BEFORE transaction commit.
4. **Transaction Commit:** Commit database transaction.
5. **Post-Commit Notification Dispatch:** Trigger async notification events after successful commit.

---

# 7. End-to-End Flow Specifications

### 7.1 Submit Site Diary Flow
1. User clicks "Submit Site Diary". REST API validates DTO.
2. `siteDiaryService` opens Atomic DB Transaction Context.
3. `siteDiaryRepository` updates state to `Submitted`.
4. `workforceService` & `progressService` persist final counts/quantities.
5. `approvalService` creates `Approval` record (`Status: Pending`).
6. `auditService` inserts synchronous `Audit` event record (`Event: Submit`).
7. Transaction commits. Async notification dispatched to Superintending Officer.

### 7.2 Approve Site Diary Flow
1. SO clicks "Approve Request". REST API validates SO authorization.
2. `approvalService` opens Atomic DB Transaction Context.
3. `approvalRepository` updates status to `Approved`.
4. `siteDiaryService` updates diary state to `Approved` (Locked).
5. `progressService` confirms physical progress; `activityService` updates cumulative percentage.
6. If progress = 100%, `activityService` transitions Activity to `Completed`.
7. `auditService` inserts `Audit` log (`Event: Approve`). Transaction commits.

### 7.3 Publish Baseline Revision Flow
1. Planner clicks "Publish Revision". REST API validates authorization.
2. `revisionService` opens Atomic DB Transaction Context.
3. `taskService` executes WBS structural diff between Revision N-1 and Revision N.
4. `activityService` re-maps ongoing active activities to new WBS task IDs in Revision N.
5. Un-matched activities in Revision N transition to `Cancelled`.
6. `revisionRepository` sets `new_revision.is_active = TRUE` and `old_revision.is_active = FALSE`.
7. `carryForwardService` regenerates Open Activities pool.
8. `auditService` inserts `Audit` log (`Event: Publish`). Transaction commits.

---

# 8. Failure & Recovery Protocols

| Failure Event | Detection Point | Rollback / Recovery Protocol |
|---|---|---|
| **DB Error during Submit** | Mid-transaction SQL Exception | Full DB Rollback; State remains `Draft`; HTTP 500 returned |
| **Audit Insert Fails** | End of transaction before commit | Full DB Rollback per ADR-010; Zero partial records saved |
| **Revision Re-Map Failure** | Baseline publish transaction | Full DB Rollback; Previous baseline remains `Published (Active)` |
| **Concurrent SO Sign-Off** | Optimistic lock `updated_at` check | Rejects stale transaction; Prompts user to refresh view |

---

# 9. Performance & Scalability Requirements

- **Submit / Approve End-to-End Latency:** <= 250ms for complete multi-engine atomic transaction.
- **Baseline Publish Latency:** <= 2.0s for projects with 5,000+ tasks and 1,000 active activities.
- **Deadlock Prevention:** Strict resource locking order enforced across all services.
- **Microservice Extraction Readiness:** Zero cross-engine database foreign keys outside parent IDs (`programme_id`, `revision_id`, `activity_id`). All communication flows through explicit Service APIs.

---
**END OF SPECIFICATION — DEV-011Z**
