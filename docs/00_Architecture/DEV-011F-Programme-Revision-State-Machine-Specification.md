# DEV-011F — PROGRAMME REVISION STATE MACHINE SPECIFICATION
**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked  
**Reference Standards:** ARCH-000, ADR-007, ADR-009, ADR-010, PR-001, DEV-010A through DEV-011E  

---

# 1. Purpose & Objectives

- **Business Objective:** Provide strict baseline revision governance for public construction projects, managing schedule revisions (VO, EOT, APK) while guaranteeing historical auditability per **ADR-009 (Programme-First Principle)**.
- **Workflow Objective:** Control state transitions of Programme Revisions from raw schedule import (`Draft`/`Imported`) to formal baseline publication (`Published (Active)`).
- **System Objective:** Guarantee exactly ONE active published baseline revision per project at any time (`is_active = TRUE`), locking past revisions as immutable historical snapshots (`Superseded`).

---

# 2. State Diagram (Textual)

```
                 [ Draft ]
                    │
                    ▼ (MSP File Uploaded)
                [ Imported ]
                    │
                    ▼ (WBS Syntax & Graph Validated)
               [ Validated ]
                    │
                    ▼ (Submitted to SO)
            [ Pending Approval ]
               │           │
      ┌────────┴───────────┼───────────┐
      ▼ (SO Approve)       ▼ (SO Return) ▼ (SO Reject / Cancel)
  [ Approved ]        [ Imported ]   [ Cancelled ]
      │
      ▼ (Planner Publishes Baseline)
 [ Published (Active) ] ───► Overwrites Previous Baseline ───► [ Superseded ]
      │                                                             │
      ▼ (Project Closeout)                                          ▼ (Closeout)
  [ Archived ]                                                 [ Archived ]
```

---

# 3. State Definitions

1. **`Draft`**
   - Initial revision container created prior to schedule file upload.
2. **`Imported`**
   - Microsoft Project (`.mpp`/XML) binary uploaded and raw task rows parsed into database.
3. **`Validated`**
   - WBS schedule graph, dependencies, start/finish dates, and milestone links pass 100% structural verification.
4. **`Pending Approval`**
   - Revision submitted to Superintending Officer (SO) / Project Director for baseline review.
5. **`Approved`**
   - SO endorses schedule revision. Available for formal publication.
6. **`Published (Active)`**
   - Official active baseline governing daily site operations (`is_active = TRUE`). Exactly one revision per project possesses this state.
7. **`Superseded`**
   - Former active baseline replaced by a newly published revision. Becomes permanently read-only.
8. **`Archived`**
   - Permanent project closeout archive state.
9. **`Cancelled`**
   - Revision rejected or discarded prior to publication.

---

# 4. State Transition Matrix

| Current State | Target State | Trigger Action | Authorized Role | Transition Rules & Requirements |
|---|---|---|---|---|
| N/A | `Draft` | Create Revision Container | Planner / Admin | Unique revision number assigned |
| `Draft` | `Imported` | Upload MSP Schedule | Planner | File binary parsed successfully |
| `Imported` | `Validated` | Validate WBS Graph | Task Engine | Zero circular dependencies or structural errors |
| `Validated` | `Pending Approval` | Submit for Review | Planner | Mandatory submission notes provided |
| `Pending Approval` | `Approved` | SO Sign-Off | SO / Project Director | Formal baseline endorsement |
| `Pending Approval` | `Returned` | SO Request Fix | SO / Project Director | Unlocks for schedule modification |
| `Pending Approval` | `Cancelled` | SO Rejection | SO / Project Director | Discarded revision |
| `Approved` | `Published (Active)` | Publish Baseline | Planner / SO | Replaces previous active baseline; Atomic Tx |
| `Published (Active)` | `Superseded` | New Baseline Published | System Engine | Automatically applied to previous active baseline |
| `Published` / `Superseded` | `Archived` | Final Contract Closeout | System Engine | Permanent historical lock |

---

# 5. Validation & Active Baseline Rules

1. **Active Baseline Uniqueness Constraint:** The system MUST enforce a strict database partial unique index guaranteeing that ONLY ONE `programme_revision` record has `is_active = TRUE` per `programme_id`.
2. **WBS Integrity Standard:** A revision CANNOT transition to `Validated` if it contains unlinked orphan tasks, negative durations, invalid predecessor links, or missing task names.
3. **Immutability of Superseded Baseline:** Once a revision transitions to `Superseded`, ALL child tasks, baseline dates, and quantities become permanently locked against edits.

---

# 6. Inter-Engine Interactions

- **Task Engine:** Parses, validates, and stores WBS task nodes during `Imported` → `Validated` transition.
- **Activity Engine:** Re-maps ongoing active activities to matching WBS task codes in the new `Published (Active)` baseline.
- **Carry Forward Engine:** Regenerates Open Activities pool using newly published baseline structure.
- **Approval Engine:** Manages formal SO sign-off workflow (`Pending Approval` → `Approved`).
- **Site Diary Engine:** Links daily diary entries to the active `revision_id` at the time of diary creation.
- **Audit Engine:** Synchronously logs all baseline state changes (`event_type = Approve`/`Update`/`Archive`).

---

# 7. Sequence Diagram (Textual)

```
Planner                        Revision Engine                 Task Engine                 Approval Engine
   │                                  │                             │                             │
   │ 1. Upload MSP File               │                             │                             │
   ├─────────────────────────────────►│                             │                             │
   │                                  │ 2. Parse & Store Tasks      │                             │
   │                                  ├────────────────────────────►│                             │
   │                                  │ 3. Validate WBS Graph       │                             │
   │                                  │    (State -> Validated)     │                             │
   │ 4. Submit to SO                  │                             │                             │
   ├──────────────────────────────────┼─────────────────────────────┼────────────────────────────►│
   │                                  │                             │                             │ 5. SO Approves
   │ 6. Publish Baseline              │                             │                             │    Revision
   ├─────────────────────────────────►│                             │                             ◄──────────────┤
   │                                  │ 7. Atomic Baseline Swap:    │                             │
   │                                  │    - Prev Active -> Superseded                            │
   │                                  │    - New Rev -> Published (Active)                        │
   │ 8. Active Baseline Live          │                             │                             │
   ◄──────────────────────────────────┴─────────────────────────────┴─────────────────────────────┘
```

---

# 8. Failure Recovery & Rollback Protocols

1. **Atomic Baseline Swap Rollback:** If Activity re-mapping or Carry Forward pool regeneration fails during baseline publication, the entire transaction rolls back completely and previous baseline remains `Published (Active)`.
2. **Import Parsing Failure:** Flawed `.mpp` files reset revision state back to `Draft` with an explicit parsing diagnostic report.
3. **Optimistic Locking:** Baseline publishing verifies `updated_at` timestamps to prevent concurrent baseline swaps.

---

# 9. Performance & Future Scalability

- **Transition Latency:** Baseline publish and activity re-mapping MUST execute in <= 2.0 seconds for schedules containing up to 5,000 tasks.
- **Batch WBS Processing:** Bulk INSERT and UPDATE SQL operations utilized during schedule import and Activity re-pointing.
- **Edge Cache Invalidation:** Instantly flush edge-cached project schedules upon successful `Published (Active)` transaction commit.

---
**END OF SPECIFICATION — DEV-011F**
