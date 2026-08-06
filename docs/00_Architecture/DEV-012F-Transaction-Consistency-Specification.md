# HQ ENGINEERING SPECIFICATION
## DEV-012F — Transaction & Consistency Specification

**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked  
**Reference Standards:** ARCH-000, ADR-007, ADR-009, ADR-010, DEV-001 through DEV-012E  

---

# 1. Purpose & Objectives

- **Business Objective:** Safeguard public infrastructure construction records against data corruption, lost updates, or inconsistent state transitions across multi-engine operations.
- **Operational Objective:** Guarantee that site logs, physical progress calculations, and Superintending Officer (SO) approval decisions execute within deterministic, failure-safe transaction boundaries.
- **System Objective:** Establish a vendor-neutral, technology-agnostic transaction, concurrency, isolation, and consistency model across all 11 platform engines per **ARCH-000** and **ADR-010**.

---

# 2. Transaction Philosophy

- **ACID Supremacy:** All relational persistence operations MUST enforce Atomicity, Consistency, Isolation, and Durability guarantees.
- **No Partial Writes:** A transaction modifying multiple tables or entities MUST complete 100% of its writes or execute a complete rollback. Zero partial state permitted.
- **Fail Fast & Rollback Immediately:** Any unhandled exception, validation failure, or audit log error inside a transaction context triggers immediate, full transaction rollback (**ADR-010**).
- **Explicit Transaction Boundaries:** Service layer components MUST explicitly define transaction boundaries; Repositories MUST execute within the caller's transaction context.

---

# 3. Transaction Categories

1. **Read-Only Transactions:** Query operations (e.g. fetching WBS trees or historical site diaries). Require zero row locks.
2. **Single-Aggregate Transactions:** Mutation operations targeting a single aggregate root (e.g. updating user profile).
3. **Multi-Aggregate Transactions:** Operations spanning multiple aggregates within a single domain engine (e.g. saving Site Diary with attached Workforce trade counts).
4. **Cross-Engine Transactions:** Orchestrated operations spanning multiple domain engines (e.g. Site Diary submission invoking Site Diary, Workforce, Progress, Approval, and Audit engines).
5. **Background Job Transactions:** Asynchronous batch tasks (e.g. midnight Open Activities evaluation). Executed in isolated transaction chunks per project.
6. **Batch Processing Transactions:** Bulk updates (e.g. re-mapping 5,000 WBS activities during baseline revision publication). Executed in explicit bulk batches.

---

# 4. Atomic Transaction Rules

- **Beginning Transactions:** Service methods executing mutating workflows MUST initialize an Atomic Transaction Boundary prior to calling repository persistence methods.
- **Commit Rules:** Commit MUST occur ONLY after all domain writes, validation rules, state machine transitions, and synchronous audit log insertions succeed without error.
- **Rollback Rules:** Any error (DB constraint failure, business rule violation, audit insertion error) MUST trigger a complete transaction rollback.
- **Nested Transaction Policy:** Nested transactions are strictly forbidden. Service operations join the existing ambient transaction or throw an error.
- **Maximum Transaction Scope:** A single database transaction MUST NOT exceed 2.0 seconds execution duration.

---

# 5. Consistency & Visibility Model

- **Strong Consistency (Synchronous Boundary):** All relational tables within the core operational database (Site Diary, Progress, Approval, Audit) enforce 100% strong consistency.
- **Eventual Consistency (Asynchronous Boundary):** Non-critical auxiliary operations (e.g. SMS/Email notifications, executive analytics cache updates) execute asynchronously post-transaction commit.
- **Read-After-Write Consistency:** Once an atomic transaction commits, subsequent GET requests from any client MUST immediately reflect the updated state.

---

# 6. Workflow Transaction Boundaries Matrix

### 6.1 Site Diary Submission Workflow
- **INSIDE Transaction Boundary (Atomic):**
  - Update `site_diary` state to `Submitted`.
  - Save `workforce` trade headcount rows.
  - Save `progress` physical measurement rows.
  - Create `approval` request row (`Status: Pending`).
  - Insert `audit` log row (**ADR-010**).
- **OUTSIDE Transaction Boundary (Eventual Consistency):**
  - Dispatch SO Push/SMS Notification.
  - Refresh executive analytics cache.

### 6.2 Approval Workflow
- **INSIDE Transaction Boundary (Atomic):**
  - Update `approval` status to `Approved`.
  - Update `site_diary` state to `Approved` (Locked).
  - Update `progress` status to `Approved`; update `activity` cumulative progress percentage.
  - If progress = 100%, update `activity` operational status to `Completed`.
  - Insert `audit` log row.
- **OUTSIDE Transaction Boundary (Eventual Consistency):**
  - Dispatch Contractor notification alert.

### 6.3 Programme Revision Publish Workflow
- **INSIDE Transaction Boundary (Atomic):**
  - Diff WBS task hierarchy between Revision N-1 and Revision N.
  - Re-map ongoing active activities to matching task IDs in Revision N.
  - Transition un-matched activities to `Cancelled`.
  - Update `new_revision.is_active = true` AND `old_revision.is_active = false`.
  - Regenerate Open Activities pool for target date.
  - Insert `audit` log row.

---

# 7. Concurrency Control & Isolation Levels

- **Optimistic Locking:** All mutable domain entities (`site_diary`, `activity`, `progress`) enforce Optimistic Concurrency Control using an `updated_at` timestamp check. Concurrent edits with stale timestamps trigger HTTP 409 Conflict.
- **Required Database Isolation Levels:**
  - **Read Committed:** Standard isolation level for Read-Only and single-entity mutation operations. Prevents Dirty Reads.
  - **Repeatable Read:** Required isolation level for Multi-Aggregate and Cross-Engine transactions (e.g. Site Diary submission, Approval sign-offs). Prevents Non-Repeatable Reads.
  - **Serializable:** Required isolation level for Programme Revision Baseline Swap transactions to prevent Phantom Reads and race conditions.

---

# 8. Outbox Pattern & Eventual Delivery

- **Transactional Outbox Standard:** When domain state changes require external message publishing, the service MUST write an outbox event record into an `outbox` table INSIDE the primary atomic transaction.
- **Guaranteed At-Least-Once Delivery:** An asynchronous background worker polls the `outbox` table post-commit, dispatches events to message brokers, and marks outbox rows as processed.

---

# 9. Deadlock Prevention & Resource Locking Order

To eliminate database deadlocks across multi-engine transactions, all platform services MUST acquire resource locks in the following strict global order:
1. `programme`
2. `programme_revision`
3. `task`
4. `activity`
5. `site_diary`
6. `workforce` / `progress`
7. `approval`
8. `audit` (Insert only)

---

# 10. Performance & Scalability Targets

- **Maximum Transaction Duration:** <= 500ms for standard Site Diary submission / approval transactions.
- **Maximum Lock Hold Time:** <= 50ms per row lock.
- **Bulk Batch Processing Limits:** Bulk database inserts/updates MUST process in maximum chunks of 500 records per transaction.

---

**Task DEV-012F Complete.** Stopped after DEV-012F.
