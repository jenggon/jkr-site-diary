# DEV-010C — SITE DIARY CREATION WORKFLOW SPECIFICATION
**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked  
**Reference Standards:** ARCH-000, ADR-007, ADR-009, ADR-010, DEV-010A, DEV-010B  

---

# 1. Purpose Objectives

- **Business Objective:** Standardize daily construction site record keeping across all JKR public projects by ensuring every day's operational diary accurately captures weather, active activities, trade manpower, physical progress, and approver requests.
- **Workflow Objective:** Automate the daily site diary initialization process so site supervisors are presented with pre-populated active works (Carry Forward) while enforcing strict baseline traceability.
- **System Objective:** Enforce atomic data integrity, eliminate duplicate diary entries, guarantee zero un-audited operational updates, and maintain strict layer separation per **ARCH-000**.

---

# 2. Workflow Triggers

- **Manual Trigger:** Site Engineer or Supervisor selects "Create Today's Site Diary" on the mobile/web application for a specific project date.
- **Automatic Trigger:** System automated scheduled task (Midnight Cron Job) pre-initializes a `Draft` Site Diary shell for active projects by pulling ongoing Open Activities.

---

# 3. Preconditions Checklist

1. **Programme Context:** A valid, non-archived `programme_id` exists in the system.
2. **Active Baseline Revision:** An active schedule revision (`revision_id`) is marked as published in `programme_revision`.
3. **Valid Activity Context:** Target `activity_id` exists, is linked to a valid Task WBS node, and is not in `Archived` or `Cancelled` state.
4. **Open Activity Eligibility:** Activity physical progress is < 100% or is being newly started.
5. **Uniqueness Constraint:** Zero existing `site_diary` entry exists for the exact combination of (`programme_id` + `activity_id` + `date`).
6. **User Permissions:** The calling user possesses `SITE_SUPERVISOR` or `SITE_ENGINEER` write permissions for the project.

---

# 4. Step-by-Step Execution Workflow

```
[ Step 1: Client Request ]
  └─ Engine: REST API Layer
  └─ Input: HTTP POST Payload (Programme ID, Activity ID, Date, Weather, Summary)
  └─ Output: Validated DTO
  └─ Failure: Return HTTP 400 Bad Request; Abort execution.

[ Step 2: Baseline Revision Validation ]
  └─ Engine: Revision Engine
  └─ Input: Programme ID
  └─ Output: Active Baseline revision_id
  └─ Failure: Return HTTP 422 Unprocessable Entity (No Active Revision); Abort.

[ Step 3: Open Activity Status Verification ]
  └─ Engine: Activity Engine / Open Activities Engine
  └─ Input: Activity ID, Active revision_id
  └─ Output: Validated Activity Entity (Status: Not Started, Started, or Continue)
  └─ Failure: Return HTTP 409 Conflict (Activity Ineligible/Archived); Abort.

[ Step 4: Duplicate Check ]
  └─ Engine: Site Diary Engine
  └─ Input: Activity ID, Date
  └─ Output: Duplicate Validation Confirmation
  └─ Failure: Return HTTP 409 Conflict (Diary Entry Already Exists); Abort.

[ Step 5: Transaction Opening ]
  └─ Engine: Service Orchestration Layer
  └─ Input: Open Transaction Signal
  └─ Output: Active DB Transaction Context
  └─ Failure: Return HTTP 500 Internal Server Error; Abort.

[ Step 6: Site Diary Record Persistence ]
  └─ Engine: Site Diary Engine (`siteDiaryRepository`)
  └─ Input: Site Diary Data DTO + Audit Timestamps
  └─ Output: Persisted site_diary_id
  └─ Failure: Rollback DB Transaction; Return HTTP 500.

[ Step 7: Workforce Draft Generation ]
  └─ Engine: Workforce Engine (`workforceRepository`)
  └─ Input: site_diary_id, Trade Manpower Breakdown
  └─ Output: Persisted workforce_id records
  └─ Failure: Rollback DB Transaction; Return HTTP 400/500.

[ Step 8: Progress Draft Persistence ]
  └─ Engine: Progress Engine (`progressRepository`)
  └─ Input: site_diary_id, Actual Quantity, Unit, Date
  └─ Output: Persisted progress_id record (Status: Draft)
  └─ Failure: Rollback DB Transaction; Return HTTP 400/500.

[ Step 9: Approval Request Initiation ]
  └─ Engine: Approval Engine (`approvalRepository`)
  └─ Input: programme_id, revision_id, activity_id, site_diary_id, progress_id
  └─ Output: Persisted approval_id record (Status: Pending)
  └─ Failure: Rollback DB Transaction; Return HTTP 500.

[ Step 10: System Event Audit Logging ]
  └─ Engine: Audit Engine (`auditRepository`)
  └─ Input: Event Type: Create, Entity Name: Site Diary, Entity ID: site_diary_id
  └─ Output: Persisted audit_id record
  └─ Failure: Rollback DB Transaction (Audit Required per ADR-010); Return HTTP 500.

[ Step 11: Transaction Commit & Response Formatting ]
  └─ Engine: REST API Layer
  └─ Input: Committed Entity Payload
  └─ Output: HTTP 201 Created JSON Response { data: ... }
```

---

# 5. Carry Forward Behaviour

1. **Unfinished Work (Yesterday):** Any Activity with cumulative progress < 100% on Date (T-1) is automatically identified by the Open Activities Engine and populated into Today's (Date T) Site Diary creation queue with state `Continue`.
2. **New Activities:** Activities scheduled in the active Programme Revision to start on Date T appear in Today's queue with state `Not Started`.
3. **Completed Activities:** Activities reaching 100% cumulative progress on Date T-1 are excluded from Today's queue and moved to the Completed pool.

---

# 6. Automatic Draft Generation

When a new Site Diary is initialized, the system applies the following auto-generation rules:

- **COPIED FROM YESTERDAY:**
  - Active Activity List (`activity_id`, `trade_id` allocations).
  - Measurement Units (e.g., m², m³, kg, nos).
- **RESET TO ZERO / DEFAULT:**
  - Daily Actual Quantity (reset to `0.00`).
  - Daily Manpower Counts (`bumiputera_count = 0`, `non_bumiputera_count = 0`, `foreign_count = 0`).
  - Weather Condition (reset to unselected / default morning & afternoon sessions).
  - Approver Comments (cleared).
- **RECALCULATED AUTOMATICALLY:**
  - Cumulative Progress Percentage (`(Previous Actual + Today Actual) / Planned Quantity * 100`).
  - Total Manpower Count (`bumiputera + non_bumiputera + foreign`).

---

# 7. Single Atomic Transaction Boundary

Per **ADR-010**, all persistence operations within the Site Diary Creation workflow MUST execute inside a **SINGLE ATOMIC TRANSACTION**.

```
BEGIN TRANSACTION;
  1. INSERT INTO site_diary
  2. INSERT INTO workforce (batch trade manpower)
  3. INSERT INTO progress (draft measurement)
  4. INSERT INTO approval (pending request)
  5. INSERT INTO audit (append-only log)
COMMIT;
-- On ANY failure: ROLLBACK ALL OPERATIONS (0 Partial Records Saved)
```

---

# 8. Duplicate Prevention & Idempotency Rules

- **Composite Key Constraint:** `site_diary` table enforces a strict UNIQUE constraint on `(programme_id, activity_id, date)`.
- **UPDATE Engine Standard:** If a user submits a Site Diary for an activity date that already exists, the Service layer detects the existing `site_diary_id` and executes an `UPDATE` operation instead of an `INSERT`.
- **Idempotency Key:** Client applications send a unique `X-Idempotency-Key` header with POST requests to prevent double-submissions during network retries.

---

# 9. Approval & Audit Engine Integrations

- **Approval Integration:** An `approval` record with status `Pending` is automatically created during Site Diary submission, assigning the request to the designated Superintending Officer (SO) for review.
- **Audit Integration:** An `audit` record is logged as the final step inside the atomic transaction, capturing `event_type = Create`, `entity_name = Site Diary`, actor `performed_by`, IP address, and technical device metadata.

---

# 10. Sequence Diagram (Textual)

```
User (Client)
  │
  │  1. POST /api/site-diary (Payload)
  ▼
Site Diary REST API ───► Validate Request DTO
  │
  │  2. Invoke siteDiaryService.createSiteDiaryWithDetails()
  ▼
Site Diary Service
  │
  │───► Open DB Transaction Context
  │
  ├─► 3. siteDiaryRepository.createSiteDiary() ────────► DB: site_diary
  ├─► 4. workforceRepository.createWorkforce() ────────► DB: workforce
  ├─► 5. progressRepository.createProgress() ──────────► DB: progress
  ├─► 6. approvalRepository.createApproval() ──────────► DB: approval
  └─► 7. auditRepository.createAudit() ────────────────► DB: audit
  │
  │───► Commit DB Transaction
  ▼
Site Diary REST API ───► Return HTTP 201 Created { data: ... }
```

---

# 11. Failure Scenarios & Recovery Matrix

| Failure Scenario | Root Cause | System Response & Recovery |
|---|---|---|
| **Duplicate Diary Entry** | User submits diary twice | Intercepted by Unique constraint / Service check; Converts operation to Update or returns HTTP 409 |
| **Revision Replaced Mid-Day** | Planner published new schedule baseline | System checks active `revision_id`; Re-maps activity to new revision task or flags HTTP 422 |
| **Activity Archived** | Activity closed prior to submission | Intercepted during precondition check; Aborts transaction with HTTP 409 |
| **Workforce Save Fails** | Inactive trade ID or negative count | Transaction rolls back completely; Returns HTTP 400 error payload |
| **Progress Save Fails** | Quantity constraint or decimal overflow | Transaction rolls back completely; Returns HTTP 400 error payload |
| **Approval Creation Fails** | Workflow rule exception | Transaction rolls back completely; Returns HTTP 500 error payload |
| **Audit Log Fails** | DB storage failure | Transaction rolls back completely per ADR-010; Returns HTTP 500 |

---

# 12. Performance & Scalability Targets

- **Maximum Expected Latency:** End-to-end API response time <= 250ms for complete atomic creation transaction.
- **Concurrency Handling:** Support minimum 500 concurrent site diary submissions per minute across multiple regional project sites.
- **Database Optimization:** Batch insert queries utilized for multi-trade workforce records to minimize DB round-trips.

---

# 13. Future Architecture Recommendations

1. **Offline Draft Storage:** Mobile clients store draft site diaries in local SQLite/IndexedDB databases when internet connectivity is unavailable on site.
2. **Background Sync Queue:** Use Service Workers to automatically queue and retry failed atomic submissions upon reconnecting.
3. **Autosave Engine:** Implement debounced autosave endpoints for site diary draft entries to prevent data loss during browser crashes.

---
**END OF SPECIFICATION — DEV-010C**
