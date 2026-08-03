# DEV-011D — PROGRESS STATE MACHINE SPECIFICATION
**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked  
**Reference Standards:** ARCH-000, ADR-007, ADR-009, ADR-010, PG-001, PG-002, DM-007, DEV-010A through DEV-011C  

---

# 1. Purpose Objectives

- **Business Objective:** Provide strict measurement lifecycle governance for physical site execution progress across public construction works, ensuring actual quantities logged translate accurately into progress percentages and financial claims.
- **Workflow Objective:** Control state transitions of physical measurement records from raw field measurements (`Draft`/`Measured`) to formal sign-off (`Approved`/`Locked`).
- **System Objective:** Guarantee physical progress integrity, preventing negative quantities, cumulative progress overflows (>100%), or unverified progress from locking into project reporting.

---

# 2. State Diagram (Textual)

```
                 [ Draft ]
                    │
                    ▼ (Site Quantity Logged)
                [ Measured ]
                    │
                    ▼ (Diary Submitted)
               [ Submitted ]
                    │
                    ▼ (Auto-Linked Request)
            [ Pending Approval ]
               │     │     │
      ┌────────┼─────┴─────┼────────┐
      ▼ (SO Return)  ▼ (SO Approve) ▼ (SO Reject)
  [ Returned ]  [ Approved ]  [ Rejected ]
      │              │
      ▼ (Corrected)  ▼ (Locked Baseline)
  [ Measured ]   [ Locked ]
                     │
                     ▼ (Project Close)
                [ Archived ]
```

---

# 3. State Definitions

1. **`Draft`**
   - Initial measurement shell pre-populated during Site Diary initialization. Actual quantity defaults to `0.00`.
2. **`Measured`**
   - Physical measurement recorded by Site Engineer/Supervisor on site (actual quantity > 0). Editable before submission.
3. **`Submitted`**
   - Attached Site Diary submitted for review. Progress entry becomes read-only for site staff.
4. **`Pending Approval`**
   - Approval Engine request generated and assigned to Superintending Officer (SO) / AE.
5. **`Returned`**
   - SO requests correction on measurement (e.g. over-estimation or incorrect unit). Editing unlocked for site staff.
6. **`Approved`**
   - SO verifies and approves measurement. Cumulative percentage confirmed; Activity progress updated.
7. **`Rejected`**
   - Formal rejection of invalid or unverified measurement.
8. **`Locked`**
   - System lock applied to approved progress record. Strictly immutable.
9. **`Archived`**
   - Read-only historical state upon project closeout.

---

# 4. State Transition Matrix

| Current State | Target State | Trigger Action | Authorized Role | Transition Rules & Requirements |
|---|---|---|---|---|
| N/A | `Draft` | Diary Pre-Init | System | Target quantity pre-filled; actual = 0 |
| `Draft` | `Measured` | Log Quantity | Site Engineer | Actual quantity > 0 entered |
| `Measured` | `Submitted` | Submit Diary | Site Engineer | Attached to submitted Site Diary |
| `Submitted` | `Pending Approval` | Auto-Initiate | System / Approval | Approval request created |
| `Pending Approval` | `Approved` | SO Sign-Off | SO / AE | Cumulative % updated; Record locked |
| `Pending Approval` | `Returned` | SO Request Fix | SO / AE | Return reason required; Unlocks edit |
| `Returned` | `Measured` | Re-enter Value | Site Engineer | Quantity corrected by submitter |
| `Pending Approval` | `Rejected` | SO Rejection | SO / AE | Rejection reason required |
| `Approved` | `Locked` | Day Close Lock | System Engine | Immutable lock applied |
| `Locked` | `Archived` | Project Close | System Engine | Contract final archive |

---

# 5. Quantity Validation & Mathematical Rules

1. **Non-Negative Constraint:** `actual_quantity >= 0.00` (Negative progress entries strictly rejected).
2. **Cumulative Ceiling Rule:** Total cumulative progress (`sum(actual_quantity) / planned_quantity * 100`) MUST NOT exceed `100.00%`. Attempts exceeding 100% flag a HTTP 422 Unprocessable Entity error.
3. **Unit Consistency:** Progress `unit` (e.g., m², m³, kg, nos) MUST match the baseline Activity unit defined in active Revision.

---

# 6. Inter-Engine Interactions

- **Site Diary Engine:** Progress records map 1-to-1 or 1-to-Many with `site_diary_id`. Submitting diary moves progress to `Submitted`.
- **Activity Engine:** Reaching 100% approved cumulative progress triggers Activity transition to `Completed`.
- **Workforce Engine:** Correlates trade headcount with physical progress output for productivity analytics.
- **Approval Engine:** Approval sign-off transitions progress from `Pending Approval` to `Approved`.
- **Carry Forward Engine:** Unfinished progress (<100%) carries forward target quantities to next daily diary.
- **Audit Engine:** Records immutable event log on every progress state change.

---

# 7. Sequence Diagram (Textual)

```
Site Engineer                  Progress Engine                 Approval Engine             Activity Engine
     │                                │                               │                           │
     │ 1. Log Actual Quantity         │                               │                           │
     ├───────────────────────────────►│                               │                           │
     │                                │ 2. State -> Measured          │                           │
     │ 3. Submit Site Diary           │                               │                           │
     ├────────────────────────────────┴──────────────────────────────►│                           │
     │                                                                │ 4. SO Approves            │
     │                                                                ├──────────────────────────►│
     │                                                                │                           │ 5. Update Activity
     │                                                                │                           │    Cumulative %
     │ 6. Progress Locked & Confirmed                                 │                           │ (State -> Completed)
     ◄────────────────────────────────────────────────────────────────┴───────────────────────────┤
```

---

# 8. Edge Cases & Recovery Protocols

1. **Over-Reported Progress:** Site Engineer enters progress exceeding 100%. API rejects payload with HTTP 422 error and returns maximum allowable quantity delta.
2. **SO Returns Progress for Adjustment:** State changes to `Returned`. Editing unlocked; supervisor updates measurement and resubmits.
3. **Rain Day / Zero Work:** Progress logged as 0.00. State transitions `Draft` → `Submitted` → `Approved` with zero progress increment.

---

# 9. Performance & Future Recommendations

- **Transition Latency:** Progress evaluation and state updates MUST execute in <= 150ms.
- **Automated Survey Device Integration:** Support direct IoT / laser scanner payload ingestion into `Measured` progress state.
- **Productivity Variance Alerts:** Flag automated alerts when actual progress per workforce headcount falls 30% below baseline productivity standards.

---
**END OF SPECIFICATION — DEV-011D**
