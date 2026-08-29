# DEV-011A — SITE DIARY STATE MACHINE SPECIFICATION
**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked  
**Reference Standards:** ARCH-000, ADR-007, ADR-009, ADR-010, DEV-010A through DEV-010F  

---

# 1. State Diagram (Textual)

```
                 [ Draft ]
                    │
                    ▼ (Submit Daily Diary)
              [ Submitted ]
                    │
                    ▼ (Auto Initiated)
            [ Pending Approval ]
                │         │
      ┌─────────┴─────────┼─────────┐
      ▼ (SO Return)       ▼ (SO Approve) ▼ (SO Reject)
  [ Returned ]       [ Approved ]   [ Rejected ]
      │                   │
      ▼ (Resubmit)        ▼ (24h Elapsed / Lock)
 [ Submitted ]        [ Locked ]
                          │
                          ▼ (Project Closing)
                     [ Archived ]
```

---

# 2. State Definitions

1. **`Draft`**
   - Initial state when a daily Site Diary shell is initialized (manually or via morning Open Activities auto-population).
   - Editable by Site Engineer / Supervisor. Physical progress & manpower fields actively updating.
2. **`Submitted`**
   - Site Engineer has finalized daily inputs and clicked "Submit".
   - Record becomes read-only for Site Engineer.
3. **`Pending Approval`**
   - Approval Engine request generated and assigned to Superintending Officer (SO) / AE.
   - Record read-only for all site staff; open for SO review.
4. **`Returned`**
   - SO has requested corrections or missing details.
   - Editing unlocked for Site Engineer to correct and resubmit.
5. **`Approved`**
   - SO has verified and approved the diary entry.
   - Physical progress confirmed; Carry Forward Engine updates active activity progress.
6. **`Locked`**
   - System lock applied 24 hours after SO approval or upon day-close.
   - Strictly immutable. Re-opening requires formal administrative escalation.
7. **`Archived`**
   - Permanent read-only project archive state upon contract final completion.

---

# 3. State Transition Matrix

| Current State | Target State | Trigger Action | Owner Engine | Transition Rules & Conditions |
|---|---|---|---|---|
| N/A | `Draft` | Initialize Diary | Site Diary Engine | Preconditions met; no duplicate entry |
| `Draft` | `Submitted` | User Submits | Site Diary Engine | All mandatory fields populated; Atomic Tx |
| `Submitted` | `Pending Approval` | Auto-Initiate Request | Approval Engine | Synchronous request creation during submit |
| `Pending Approval` | `Returned` | SO Requests Fix | Approval Engine | SO comment mandatory |
| `Returned` | `Submitted` | Resubmit Fixes | Site Diary Engine | Increment submission version count |
| `Pending Approval` | `Approved` | SO Approves | Approval Engine | Progress confirmed; Lock operational data |
| `Pending Approval` | `Rejected` | SO Rejects | Approval Engine | SO rejection reason mandatory |
| `Approved` | `Locked` | 24h Lock Window | System Engine | Immutable lock applied |
| `Locked` | `Archived` | Contract Closing | System Engine | Permanent archive status |

---

# 4. Forbidden Transitions & Violation Protocols

- **Forbidden:** `Draft` → `Approved` (Direct jump bypassing SO review). Violation Outcome: HTTP 403 Forbidden.
- **Forbidden:** `Approved` → `Draft` (Direct edit of approved record). Violation Outcome: HTTP 409 Conflict; Reopen Approval required.
- **Forbidden:** `Locked` → `Draft` / `Submitted` / `Returned` (Direct mutation of locked history). Violation Outcome: Permanent System Lockout Error.
- **Forbidden:** `Archived` → Any State (Modification of closed project archive). Violation Outcome: Permanent Access Denied.

---

# 5. Transition Ownership & Governance

- **`Site Diary Engine`:** Owns `Draft`, `Submitted`, and `Returned` state handling.
- **`Approval Engine`:** Exclusive owner of `Pending Approval`, `Approved`, `Returned`, and `Rejected` decisions.
- **`Carry Forward Engine`:** Listens to `Approved` events to trigger activity progress roll-forward.
- **`Audit Engine`:** Listens to ALL state transitions and records immutable event logs.

---

# 6. Approval & Audit Integrations

- **Approval Integration:** Submitting a Site Diary generates a `Pending Approval` request in Approval Engine. Returning sets diary to `Returned`; Approving locks physical progress and sets state to `Approved`.
- **Audit Integration:** Every state transition triggers a synchronous `Audit` log entry capturing: `old_state`, `new_state`, `user_id`, `timestamp`, `ip_address`, and `change_reason`.

---

# 7. Sequence Diagram (Textual)

```
Site Engineer                     SO / AE                        Engines
     │                               │                              │
     │ 1. Create/Edit Draft          │                              │ ──► Site Diary Engine (Draft)
     │ 2. Click Submit               │                              │
     ├───────────────────────────────┼─────────────────────────────►│ ──► Submit Tx (Submitted -> Pending Approval)
     │                               │ 3. Alert: Pending Approval   │
     │                               │ 4. Review & Approve          │
     │                               └─────────────────────────────►│ ──► Approval Engine (Approved)
     │                                                              │ ──► Audit Engine (Log Event)
     │                                                              │ ──► Carry Forward Engine (Update Progress)
     │ 5. Lock Applied (24h)         │                              │ ──► System Engine (Locked)
```

---

# 8. Edge Cases & Exception Handling

1. **SO Returns Submission:** State transitions `Pending Approval` → `Returned`. Unlocks editing fields for Site Engineer; increments resubmission counter.
2. **SO Rejects Submission:** State transitions `Pending Approval` → `Rejected`. Diary entry archived as invalid; manual escalation required.
3. **Network Failure During Submit:** Atomic transaction rolls back completely; state remains `Draft`.
4. **Concurrent SO Approval & Engineer Edit:** Optimistic locking check (`updated_at`) aborts stale edit request.

---

# 9. Performance & Future Recommendations

- **Transition Latency:** All state transitions MUST complete within 200ms API response time.
- **Microservice Readiness:** State machine implemented as an isolated domain state handler for clean extraction.
- **Real-Time Push Notifications:** Dispatch WebSocket / Push notifications to SOs upon transition to `Pending Approval` and to Engineers upon transition to `Returned`.

---
**END OF SPECIFICATION — DEV-011A**
