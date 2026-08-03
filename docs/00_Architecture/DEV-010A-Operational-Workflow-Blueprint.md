# DEV-010A — OPERATIONAL WORKFLOW BLUEPRINT
**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked  
**Reference Standards:** ARCH-000, ADR-007, ADR-009, ADR-010  

---

# 1. Complete Operational Lifecycle

The operational lifecycle of the JKR Site Diary Platform follows a strict, sequential 9-tier hierarchy governed by the **Programme-First Principle (ADR-009)**. Every operational event originates within a root Programme context and cascades through lower-tier domain entities.

```
+-----------------------------------------------------------------------------------+
| 1. Programme Engine                                                              |
|    └─ Owner of Master Project Identity & Global Baseline Governance              |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| 2. MSP Engine / Programme Revision Engine                                         |
|    └─ Owner of Project Structure Import, Baselines & Revision Snapshots           |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| 3. Task Engine                                                                    |
|    └─ Owner of MSP WBS Hierarchy, Task Nodes & Scheduled Baselines                |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| 4. Activity Engine                                                                |
|    └─ Owner of Site Operational Units & Execution Lifecycle States                |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| 5. Site Diary Engine                                                              |
|    └─ Owner of Daily Operations, Weather Sessions & Log Entries                   |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| 6. Workforce Engine                                                               |
|    └─ Owner of Structured Labour Counts & Trade Allocations                       |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| 7. Progress Engine                                                                |
|    └─ Owner of Physical Progress Quantities, Units & Measurement Dates            |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| 8. Approval Engine                                                                |
|    └─ Owner of Operational Review Workflows & Immutable Approval Decisions        |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| 9. Audit Engine                                                                   |
|    └─ Owner of System Traceability, Event Logging & Append-Only Audit Trail      |
+-----------------------------------------------------------------------------------+
```

---

# 2. Stage-by-Stage Architecture Specifications

### Stage 1: Programme Engine
- **Owner Engine:** Programme Engine (`programme`)
- **Input:** Programme Name, Contract Reference Number, Client Details, Start/End Dates.
- **Output:** Unique `programme_id` entity context.
- **Trigger:** System Administrator or Project Director initializes a new construction project.
- **Preconditions:** Valid user credentials with Project Creation authorization.
- **Postconditions:** Active Programme entity established; ready to accept Revision 0 import.
- **Failure Behaviour:** Abort creation; return HTTP 400/500 error payload; log security audit event.
- **Rollback Behaviour:** Atomic database rollback; zero partial Programme records persisted.

### Stage 2: MSP Engine / Revision Engine
- **Owner Engine:** MSP / Revision Engine (`programme_revision`)
- **Input:** `programme_id`, `.mpp` / XML file payload, Revision Number, Version Tag.
- **Output:** Parsed Task structural graph & active `revision_id`.
- **Trigger:** Import of Microsoft Project schedule file by Authorized Planner.
- **Preconditions:** Active `programme_id` exists; imported file passes structural validation.
- **Postconditions:** Immutable baseline revision generated; Task WBS structural hierarchy created.
- **Failure Behaviour:** Reject import payload; generate parsing/validation diagnostics report.
- **Rollback Behaviour:** Complete transaction rollback of revision record and all child tasks.

### Stage 3: Task Engine
- **Owner Engine:** Task Engine (`task`)
- **Input:** `programme_id`, `revision_id`, WBS Code, Task Name, Start Date, Finish Date, Duration, Dependencies.
- **Output:** Persisted structural Task nodes.
- **Trigger:** Automatic batch execution during MSP file processing.
- **Preconditions:** Valid `programme_id` and active `revision_id` context.
- **Postconditions:** Complete WBS schedule graph accessible for Activity mapping.
- **Failure Behaviour:** Flag structural invalidity (e.g., circular dependency, missing parent WBS).
- **Rollback Behaviour:** Purge uncommitted task batch; restore system to pre-import state.

### Stage 4: Activity Engine
- **Owner Engine:** Activity Engine (`activity`)
- **Input:** `programme_id`, `revision_id`, `task_id`, Activity Name, Location, Operational Status.
- **Output:** Persisted operational `activity_id`.
- **Trigger:** Site Engineer creates or maps an executable Activity under a Task.
- **Preconditions:** Active Task node exists; Activity operational status defined (`Not Started`).
- **Postconditions:** Activity initialized; ready for daily Site Diary entries.
- **Failure Behaviour:** Deny Activity creation; present error to client.
- **Rollback Behaviour:** Rollback Activity persistence transaction; log failure event.

### Stage 5: Site Diary Engine
- **Owner Engine:** Site Diary Engine (`site_diary`)
- **Input:** `programme_id`, `revision_id`, `activity_id`, Diary Date, Weather Morning/Afternoon, Work Summary.
- **Output:** Persisted `site_diary_id` record.
- **Trigger:** Daily Site Diary logging by Site Supervisor / Engineer.
- **Preconditions:** Executable Activity exists for specified project date; no duplicate diary for same Activity & date.
- **Postconditions:** Daily site diary record active; ready for Workforce and Progress entries.
- **Failure Behaviour:** Reject submission; alert user of missing mandatory fields or duplicate entry.
- **Rollback Behaviour:** Atomic rollback of Site Diary record; zero orphan child logs created.

### Stage 6: Workforce Engine
- **Owner Engine:** Workforce Engine (`workforce`)
- **Input:** `programme_id`, `revision_id`, `activity_id`, `site_diary_id`, `trade_id`, Bumiputera count, Non-Bumiputera count, Foreign count.
- **Output:** Structured `workforce_id` manpower entries.
- **Trigger:** Submission of daily labor breakdown within Site Diary interface.
- **Preconditions:** Active `site_diary_id` exists; selected `trade_id` is active in Trade Library.
- **Postconditions:** Manpower counts snapshot recorded; total manpower calculated.
- **Failure Behaviour:** Reject workforce payload; flag negative counts or inactive trade IDs.
- **Rollback Behaviour:** Rollback workforce batch insertion; notify parent Site Diary process.

### Stage 7: Progress Engine
- **Owner Engine:** Progress Engine (`progress`)
- **Input:** `programme_id`, `revision_id`, `activity_id`, `site_diary_id`, Measurement Date, Progress Type, Actual Quantity, Unit.
- **Output:** Persisted physical `progress_id` record with status `Draft`.
- **Trigger:** Physical progress measurement logged on site.
- **Preconditions:** Active `site_diary_id` exists; actual quantity >= 0.
- **Postconditions:** Progress physical measurement recorded; workflow approval requested.
- **Failure Behaviour:** Reject progress measurement submission; report validation error.
- **Rollback Behaviour:** Complete rollback of progress transaction.

### Stage 8: Approval Engine
- **Owner Engine:** Approval Engine (`approval`)
- **Input:** `programme_id`, `revision_id`, `activity_id`, `site_diary_id`, `progress_id`, Approval Level, Requested By.
- **Output:** Persisted `approval_id` record with state (`Pending`, `Approved`, `Rejected`, `Returned`, `Cancelled`).
- **Trigger:** Submission of Site Diary or Progress entry for Superintending Officer (SO) review.
- **Preconditions:** Unapproved Site Diary or Progress record submitted.
- **Postconditions:** Approval decision recorded; operational record status updated upon approval.
- **Failure Behaviour:** Reject approval decision transaction; maintain record in `Pending` state.
- **Rollback Behaviour:** Revert approval state update; preserve prior operational snapshot.

### Stage 9: Audit Engine
- **Owner Engine:** Audit Engine (`audit`)
- **Input:** `programme_id`, `revision_id`, Entity Name, Entity ID, Event Type, Performed By, Change Summary, Technical Metadata.
- **Output:** Immutable `audit_id` log record.
- **Trigger:** System-wide operational event execution (Create, Update, Approve, Reject, Archive, etc.).
- **Preconditions:** Upstream operational operation succeeded or explicit audit trigger fired.
- **Postconditions:** Permanent append-only traceability log generated.
- **Failure Behaviour:** Halt transaction cascade (if synchronous audit required by ADR-010); throw system failure.
- **Rollback Behaviour:** Abort entire parent transaction to ensure zero un-audited operations exist.

---

# 3. Complete Workflow Event Definitions

| Event Name | Originating Context | Trigger Action | Required Inputs | State Transition / Outcome |
|---|---|---|---|---|
| **Create Programme** | Programme Engine | Admin creates project | Project metadata, contract info | System registers new Programme root |
| **Import MSP Baseline** | MSP Engine | Planner uploads `.mpp`/XML | File binary, `programme_id` | Tasks & Revision 0 generated |
| **Create Revision** | Revision Engine | Contractual variation issued | Revision metadata, `programme_id` | New Revision initialized |
| **Publish Revision** | Revision Engine | SO approves schedule update | `revision_id` | Revision set to Active Baseline |
| **Create Activity** | Activity Engine | Engineer defines site work | `task_id`, Activity name, location | Activity created (`Not Started`) |
| **Resume Activity** | Activity Engine | Work restarts after delay | `activity_id`, Resume date | Activity state set to `Continue` |
| **Create Site Diary** | Site Diary Engine | Daily log recorded | `activity_id`, Diary Date, Weather | Site Diary record created |
| **Carry Forward** | Site Diary Engine | Active task continues to next day | `site_diary_id`, Target date | Unfinished activity copied to target day |
| **Update Workforce** | Workforce Engine | Labor counts submitted | `site_diary_id`, Trade counts | Manpower snapshot persisted |
| **Record Progress** | Progress Engine | Site measurement taken | `site_diary_id`, Quantities, Unit | Physical progress logged (`Draft`) |
| **Submit Approval** | Approval Engine | Engineer submits diary/progress | Target record IDs, User ID | Approval workflow initiated (`Pending`) |
| **Approve** | Approval Engine | SO approves submission | `approval_id`, Approver ID, Comment | Approval state set to `Approved` |
| **Reject** | Approval Engine | SO rejects submission | `approval_id`, Approver ID, Comment | Approval state set to `Rejected` |
| **Return** | Approval Engine | SO requests correction | `approval_id`, Approver ID, Comment | Approval state set to `Returned` |
| **Archive** | Multi-Engine | Project or record decommissioned | Target entity ID, User ID | Entity state set to `Archived` |
| **Export** | Reporting Engine | Executive requests report | Filters, Date range, Format | PDF/Excel report generated & audited |

---

# 4. Transaction Boundaries & Atomicity Standards

Per **ADR-010**, operations spanning multiple domain engines MUST execute within an explicit atomic transaction boundary. Partial execution is strictly prohibited.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      ATOMIC TRANSACTION BOUNDARY                        │
│                                                                         │
│  1. Create / Update Site Diary Entry (Site Diary Engine)                │
│                            │                                            │
│                            ▼                                            │
│  2. Record Workforce Manpower Breakdown (Workforce Engine)              │
│                            │                                            │
│                            ▼                                            │
│  3. Record Physical Progress Measurement (Progress Engine)              │
│                            │                                            │
│                            ▼                                            │
│  4. Initiate Approval Workflow Request (Approval Engine)                │
│                            │                                            │
│                            ▼                                            │
│  5. Log Append-Only System Event (Audit Engine)                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                   ┌───────────────┴───────────────┐
                   ▼                               ▼
          [ SUCCESS: COMMIT ]             [ FAILURE: ROLLBACK ALL ]
          All records persisted          Zero records persisted
```

---

# 5. Cross-Engine Ownership & Boundary Delegation Rules

To guarantee clean architecture and bounded context integrity, **NO ENGINE MAY DIRECTLY ACCESS OR MUTATE DATABASE TABLES OWNED BY ANOTHER ENGINE**.

### Delegation Standard Rules
1. **Forbidden:** `SiteDiaryService` calling `supabase.from('progress').insert()`.
2. **Allowed:** `SiteDiaryService` calling `progressService.createProgress()`.
3. **Forbidden:** `ApprovalService` updating `site_diary` table directly.
4. **Allowed:** `ApprovalService` calling `siteDiaryService.updateSiteDiaryStatus()`.
5. **Forbidden:** `ActivityService` querying `audit` table directly.
6. **Allowed:** `ActivityService` invoking `auditService.createAudit()`.

```
[ Caller Engine Service ]
           │
           ▼
[ Target Engine Service ]  <-- Business Logic, Audit Population, Validation
           │
           ▼
[ Target Engine Repository ]  <-- Pure Persistence Operations Only
           │
           ▼
[ Target Engine Database Table ]
```

---

# 6. End-to-End Sequence Diagrams (Textual)

### Standard Operational Workflow Sequence
```
User (Client)
  │
  │  1. POST /api/site-diary (Payload: Diary + Workforce + Progress)
  ▼
API Handler (Site Diary REST API)
  │  -- Validates Request Parameters & Body Structure
  │  2. Invoke siteDiaryService.createSiteDiaryWithDetails()
  ▼
Service Layer (siteDiaryService)
  │  -- Generates created_at ISO Timestamps
  │  -- Opens Transaction Context
  │  3. Invoke siteDiaryRepository.createSiteDiary()
  ├───► Site Diary Repository ───► DB: INSERT INTO site_diary
  │
  │  4. Invoke workforceService.createWorkforce()
  ├───► Workforce Service ───► Workforce Repository ───► DB: INSERT INTO workforce
  │
  │  5. Invoke progressService.createProgress()
  ├───► Progress Service ───► Progress Repository ───► DB: INSERT INTO progress
  │
  │  6. Invoke approvalService.createApproval()
  ├───► Approval Service ───► Approval Repository ───► DB: INSERT INTO approval
  │
  │  7. Invoke auditService.createAudit()
  ├───► Audit Service ───► Audit Repository ───► DB: INSERT INTO audit
  │
  │  8. Commit Transaction Context
  ▼
API Handler
  │  9. Format JSON Response { data: ... } [HTTP 201 Created]
  ▼
User (Client)
```

---

# 7. Workflow State Machines

### Activity Lifecycle State Machine
```
[ Not Started ]
       │
       ▼ (Site Work Commences)
  [ Started ]
       │
       ├──────────────────────────────┐
       ▼ (Day Concluded / Continued)  ▼ (Temporarily Suspended)
  [ Continue ]                   [ Suspended ]
       │                              │
       ▼ (Final Works Completed)      ▼ (Work Resumed)
  [ Completed ]                  [ Continue ]
       │
       ▼ (Decommissioned)
  [ Archived ]
```

### Approval Lifecycle State Machine
```
       [ Pending ]
            │
   ┌────────┼────────┬────────┐
   ▼        ▼        ▼        ▼
[Approved] [Rejected] [Returned] [Cancelled]
                       │
                       ▼ (Resubmitted)
                   [ Pending ]
```

---

# 8. Integration Rules Matrix

| Source Engine | Allowed Target Engines | Forbidden Target Engines | Communication Protocol |
|---|---|---|---|
| **Programme Engine** | Revision Engine, Audit Engine | Site Diary, Workforce, Progress | Service-to-Service |
| **Revision Engine** | Task Engine, Activity Engine, Audit Engine | Workforce, Progress, Approval | Service-to-Service |
| **Task Engine** | Activity Engine, Audit Engine | Site Diary, Approval, Workforce | Service-to-Service |
| **Activity Engine** | Site Diary Engine, Audit Engine | Direct DB tables of other engines | Service-to-Service |
| **Site Diary Engine** | Workforce, Progress, Approval, Audit | Direct DB tables of other engines | Service-to-Service |
| **Workforce Engine** | Trade Library Engine, Audit Engine | Progress, Approval, Site Diary DB | Service-to-Service |
| **Progress Engine** | Approval Engine, Audit Engine | Site Diary DB, Task DB | Service-to-Service |
| **Approval Engine** | Audit Engine, Operational Services | Direct DB mutation of caller tables | Service-to-Service |
| **Audit Engine** | None (Leaf Node / Observer) | All Engines (Write Ops) | Passive Receiver Only |

---

# 9. Failure & Rollback Protocols

| Failure Scenario | Trigger Point | Rollback Action | Final State |
|---|---|---|---|
| **Workforce Save Fails** | Inactive `trade_id` or DB error during workforce insertion | Revert workforce batch, abort site diary creation, rollback transaction | Zero records saved; User notified with HTTP 400 |
| **Progress Save Fails** | Negative quantity or constraint violation | Revert progress insertion, rollback workforce & site diary insertions | Zero records saved; System state preserved |
| **Approval Creation Fails** | Workflow rule violation or missing approver | Rollback approval request and all associated site diary records | Zero operational changes committed |
| **Audit Logging Fails** | Storage failure or constraint error during audit record creation | Abort entire operational transaction cascade per ADR-010 audit rule | Zero operational changes committed |
| **Database Timeout** | Connection failure mid-transaction | Automated database transaction rollback via connection pool | Database reverts to pre-transaction state |

---

# 10. Engineering Recommendations

1. **Transaction Management:** Implement a formal Transaction Context Manager at the Service layer to coordinate multi-repository atomic commits without introducing database-specific transaction logic into business services.
2. **Async Audit Queue:** For high-throughput scenarios where synchronous audit logging creates performance bottlenecks, evaluate an asynchronous transactional outbox pattern to decouple audit persistence while guaranteeing zero audit loss.
3. **Microservice Readiness:** Maintain the strict Service-to-Service boundary isolation established in ARCH-000. This ensures that bounded contexts (e.g., Workforce Engine, Approval Engine) can be extracted into standalone microservices without requiring domain model refactoring.
4. **Idempotency Standards:** Mandate client-side idempotency keys for all POST/PATCH requests across operational endpoints to prevent duplicate submissions during network retries.

---
**END OF SPECIFICATION — DEV-010A**
