# DEV-011C — APPROVAL STATE MACHINE SPECIFICATION
**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked  
**Reference Standards:** ARCH-000, ADR-007, ADR-009, ADR-010, AP-001, DM-009, DEV-010A through DEV-011B  

---

# 1. Purpose & Objectives

- **Business Objective:** Standardize formal administrative and technical sign-offs for public construction project logs, ensuring Superintending Officers (SO) / Assistant Engineers (AE) retain absolute approval authority.
- **Workflow Objective:** Control state transitions of operational records (Site Diary, Physical Progress) through an immutable, multi-tier approval lifecycle.
- **System Objective:** Enforce strict approval governance, preventing unverified site progress or manpower numbers from locking into baseline financial and progress reports.

---

# 2. State Diagram (Textual)

```
                 [ Draft ]
                    │
                    ▼ (Engineer Submits Request)
                [ Pending ]
                    │
                    ▼ (SO Opens Request for Review)
             [ Under Review ]
                 │     │     │
      ┌──────────┼─────┴─────┼──────────┐
      ▼          ▼           ▼          ▼
 [ Approved ] [Returned] [Rejected] [Cancelled]
      │          │
      │          ▼ (Resubmitted)
      │      [ Pending ]
      ▼
 [ Archived ]
```

---

# 3. State Definitions

1. **`Draft`**
   - Pre-submission approval request shell attached to an unsubmitted Site Diary or Progress measurement draft.
2. **`Pending`**
   - Request formally submitted by Site Engineer; awaiting SO review in the approval queue.
3. **`Under Review`**
   - SO or AE has opened the request detail view. Request is actively being evaluated.
4. **`Returned`**
   - SO has requested corrections or clarifications (e.g. incorrect rain hours, unverified trade counts). Editing unlocked for Site Engineer.
5. **`Approved`**
   - SO has verified and approved the submission. Operational records locked; progress measurements confirmed.
6. **`Rejected`**
   - Formal administrative rejection of invalid or non-compliant site log entries.
7. **`Cancelled`**
   - Request cancelled by Submitter prior to SO evaluation or invalidated by baseline schedule update.
8. **`Archived`**
   - Permanent historical archive state upon project closeout.

---

# 4. State Transition Matrix

| Current State | Target State | Trigger Action | Authorized Role | Transition Rules & Requirements |
|---|---|---|---|---|
| N/A | `Draft` | Diary Pre-Init | System / Engineer | Draft operational record created |
| `Draft` | `Pending` | Submit Request | Site Engineer | Mandatory fields complete; Atomic Tx |
| `Pending` | `Under Review` | Open Request | SO / AE / Admin | SO opens approval detail view |
| `Under Review` | `Approved` | Sign & Approve | SO / AE | Progress confirmed; Lock operational data |
| `Under Review` | `Returned` | Request Fix | SO / AE | Return reason comment mandatory |
| `Returned` | `Pending` | Resubmit Fixes | Site Engineer | Fixed payload attached; Version bumped |
| `Under Review` | `Rejected` | Reject Request | SO / AE | Rejection reason comment mandatory |
| `Pending` | `Cancelled` | Retract Request | Submitter / System | Retracted before SO review |
| `Approved` | `Archived` | Final Closeout | System Engine | Contract final closeout |

---

# 5. Forbidden Transitions & Violation Protocols

- **Forbidden:** `Draft` → `Approved` (Bypassing SO review). Violation: HTTP 403 Forbidden.
- **Forbidden:** `Approved` → `Draft` / `Pending` / `Returned` (Direct mutation of approved sign-off). Violation: HTTP 409 Conflict (Reopen Approval Protocol required).
- **Forbidden:** `Rejected` → `Approved` (Direct approval of rejected request). Violation: HTTP 422 Unprocessable Entity.
- **Forbidden:** `Archived` → Any State (Modification of archived approval). Violation: Permanent System Lock Error.

---

# 6. Approval Authority Hierarchy

1. **Superintending Officer (SO):** Level 3 Authority — Final approval power for all site diaries, major progress entries, and baseline revision updates.
2. **Superintending Officer Representative (SOR) / AE:** Level 2 Authority — Verification and endorsement of daily site diaries and physical measurements.
3. **Site Engineer / Supervisor:** Level 1 Authority — Submitter role; zero approval authority.

---

# 7. Inter-Engine Interactions

- **Site Diary Engine:** Submitting diary transitions approval `Draft` → `Pending`. Approval transitions diary to `Approved` (Locked).
- **Progress Engine:** Approving progress confirms cumulative physical completion. Return unlocks progress quantity editing.
- **Activity Engine:** 100% progress approval triggers Activity state transition from `Continue` to `Completed`.
- **Audit Engine:** Captures synchronous audit event for every approval transition (`event_type = Approve`, `Reject`, `Return`).
- **Notification System:** Dispatches SMS/Email/Push alerts to SO on `Pending` and to Submitter on `Returned`/`Approved`.

---

# 8. Sequence Diagram (Textual)

```
Site Engineer                   Approval Engine                 Superintending Officer (SO)
     │                                │                                      │
     │ 1. Submit Site Diary           │                                      │
     ├───────────────────────────────►│                                      │
     │                                │ 2. State -> Pending                  │
     │                                │ 3. Dispatch Alert                    │
     │                                ├─────────────────────────────────────►│
     │                                │                                      │ 4. Open Request (State -> Under Review)
     │                                │ 5. Sign & Approve                    │
     │                                ◄──────────────────────────────────────┤
     │                                │
     │                                ├──► Lock Site Diary & Progress
     │                                ├──► Log Synchronous Audit Event
     │ 6. Receive Approval Notice     │
     ◄────────────────────────────────┤
```

---

# 9. Rollback & Recovery Protocols

1. **Atomic Approval Rollback:** If database transaction fails while locking site diary records, the approval decision rolls back completely and state remains `Under Review`.
2. **Resubmission Counter:** Returned requests increment `submission_version` to track how many times a log was corrected before final approval.
3. **Optimistic Locking:** Approval decision verifies `updated_at` timestamp to prevent concurrent approvals on stale data.

---

# 10. Performance & Future Recommendations

- **Transition Latency:** Approval decision execution MUST complete in <= 200ms.
- **Digital Signatures:** Future enhancement to embed PKI digital signatures into `Approved` decision records for legal non-repudiation.
- **Delegated Approval Window:** Allow SOs to delegate approval authority to designated AEs during official leave periods with complete audit logging.

---
**END OF SPECIFICATION — DEV-011C**
