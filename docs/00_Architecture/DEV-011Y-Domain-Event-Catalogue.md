# HQ ENGINEERING SPECIFICATION
## DEV-011Y — Domain Event Catalogue

**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked  
**Reference Standards:** ARCH-000, ADR-007, ADR-009, ADR-010, DEV-010A through DEV-011Z  

---

# 1. Purpose & Objectives

- **Business Objective:** Provide a standardized event messaging catalogue governing every business event across all platform engines.
- **Workflow Objective:** Establish strict contract definitions for asynchronous and synchronous event interactions between domain engines.
- **System Objective:** Ensure technology-agnostic event distribution, idempotency, event versioning, and full audit traceability per **ADR-010**.

---

# 2. Event Naming & Design Principles

- **Past Tense Naming:** All domain events MUST be named in the past tense to indicate facts that have already occurred (e.g., `BaselinePublished`, `SiteDiarySubmitted`).
- **Singular Naming:** Event names MUST use singular noun-verb constructs.
- **Immutable Payload:** Event messages are read-only facts. Once published, an event payload CANNOT be mutated.

---

# 3. Event Categories

1. **Programme Events:** Root project lifecycle events.
2. **Revision Events:** Baseline schedule import and activation events.
3. **Task Events:** WBS hierarchy structural events.
4. **Activity Events:** Site execution activity state change events.
5. **Open Activities Events:** Active pool evaluation events.
6. **Site Diary Events:** Daily log initialization, update, and submission events.
7. **Workforce Events:** Trade manpower headcount events.
8. **Progress Events:** Physical measurement entries and calculations.
9. **Approval Events:** Workflow review decisions (Approved, Returned, Rejected).
10. **Audit Events:** Traceability logging events.
11. **Carry Forward Events:** Daily unfinished work roll-forward events.
12. **Notification Events:** User and system alert dispatches.

---

# 4. Complete Domain Event Catalogue

| Event Name | Description | Publisher Engine | Subscriber Engines | Trigger | Transaction Boundary | Audit Required |
|---|---|---|---|---|---|---|
| `ProgrammeCreated` | New project root registered | Programme Engine | Revision, Audit | Admin registers project | Atomic | Yes |
| `BaselinePublished` | New baseline revision activated | Revision Engine | Task, Activity, Carry Forward, Audit | Planner publishes revision | Atomic | Yes |
| `RevisionSuperseded`| Previous baseline deactivated | Revision Engine | Task, Activity, Audit | BaselinePublished event | Atomic | Yes |
| `ActivityStarted` | First progress logged on site | Activity Engine | Site Diary, Progress, Audit | First measurement entry | Atomic | Yes |
| `ActivityCompleted` | Physical target reached 100% | Activity Engine | Carry Forward, Open Pool, Audit | SO approves 100% progress | Atomic | Yes |
| `SiteDiaryCreated` | Daily site log initialized | Site Diary Engine | Workforce, Progress, Audit | Pre-init / User init | Atomic | Yes |
| `SiteDiarySubmitted`| Daily log submitted for review | Site Diary Engine | Approval, Progress, Audit | User clicks Submit | Atomic | Yes |
| `ProgressRecorded` | Physical quantity logged | Progress Engine | Site Diary, Activity, Audit | Field measurement entry | Atomic | Yes |
| `ApprovalRequested` | Workflow request created | Approval Engine | Site Diary, Audit, Notification | Site Diary submission | Atomic | Yes |
| `ApprovalApproved` | Request approved by SO | Approval Engine | Site Diary, Progress, Activity, Carry Forward, Audit | SO signs off | Atomic | Yes |
| `ApprovalReturned` | SO requests corrections | Approval Engine | Site Diary, Progress, Audit, Notification | SO requests fix | Atomic | Yes |
| `ApprovalRejected` | Request rejected by SO | Approval Engine | Site Diary, Progress, Audit | SO rejects submission | Atomic | Yes |
| `CarryForwardExecuted`| Unfinished work rolled forward | Carry Forward Engine | Open Pool, Site Diary, Audit | Midnight Cron / Day Close | Atomic | Yes |
| `NotificationDispatched`| User alert sent | System Engine | External Client | Workflow state change | Eventually Consistent | No |

---

# 5. Publisher & Subscriber Matrix

| Engine | Publishes | Subscribes To |
|---|---|---|
| **Programme Engine** | `ProgrammeCreated` | None |
| **Revision Engine** | `BaselinePublished`, `RevisionSuperseded` | `ProgrammeCreated` |
| **Task Engine** | None | `BaselinePublished` |
| **Activity Engine** | `ActivityStarted`, `ActivityCompleted` | `BaselinePublished`, `ApprovalApproved` |
| **Open Activities Engine** | None | `BaselinePublished`, `CarryForwardExecuted`, `ActivityCompleted` |
| **Site Diary Engine** | `SiteDiaryCreated`, `SiteDiarySubmitted` | `ApprovalReturned`, `CarryForwardExecuted` |
| **Workforce Engine** | None | `SiteDiaryCreated` |
| **Progress Engine** | `ProgressRecorded` | `SiteDiarySubmitted`, `ApprovalApproved` |
| **Approval Engine** | `ApprovalRequested`, `ApprovalApproved`, `ApprovalReturned`, `ApprovalRejected` | `SiteDiarySubmitted` |
| **Audit Engine** | None (Observer) | All Domain Events |
| **Carry Forward Engine** | `CarryForwardExecuted` | `ApprovalApproved`, `BaselinePublished` |

---

# 6. Standard Event Payload Schema

```json
{
  "event_id": "uuid-v4-event-identifier",
  "event_name": "BaselinePublished",
  "event_version": "1.0.0",
  "programme_id": "uuid-v4-programme-root",
  "revision_id": "uuid-v4-revision-id",
  "entity_type": "ProgrammeRevision",
  "entity_id": "uuid-v4-target-entity",
  "actor_id": "uuid-v4-user-id",
  "occurred_at": "2026-08-03T22:33:46.000Z",
  "correlation_id": "uuid-v4-root-trace-id",
  "causation_id": "uuid-v4-triggering-event-id",
  "metadata": {
    "ip_address": "192.168.1.100",
    "application_version": "1.0.0",
    "change_reason": "Baseline replacement for Variation Order #2"
  }
}
```

---

# 7. Payload Examples for Key Domain Events

### 7.1 `BaselinePublished`
```json
{
  "event_id": "evt-1001",
  "event_name": "BaselinePublished",
  "event_version": "1.0.0",
  "programme_id": "prog-777",
  "revision_id": "rev-002",
  "entity_type": "ProgrammeRevision",
  "entity_id": "rev-002",
  "actor_id": "usr-planner-01",
  "occurred_at": "2026-08-03T22:33:46.000Z",
  "correlation_id": "corr-8888",
  "causation_id": "evt-1000",
  "metadata": { "previous_revision_id": "rev-001" }
}
```

### 7.2 `SiteDiarySubmitted`
```json
{
  "event_id": "evt-1002",
  "event_name": "SiteDiarySubmitted",
  "event_version": "1.0.0",
  "programme_id": "prog-777",
  "revision_id": "rev-002",
  "entity_type": "SiteDiary",
  "entity_id": "diary-20260803-01",
  "actor_id": "usr-engineer-05",
  "occurred_at": "2026-08-03T17:30:00.000Z",
  "correlation_id": "corr-9999",
  "causation_id": "cmd-submit-01",
  "metadata": { "activity_id": "act-101", "submission_version": 1 }
}
```

### 7.3 `ApprovalApproved`
```json
{
  "event_id": "evt-1003",
  "event_name": "ApprovalApproved",
  "event_version": "1.0.0",
  "programme_id": "prog-777",
  "revision_id": "rev-002",
  "entity_type": "Approval",
  "entity_id": "appr-505",
  "actor_id": "usr-so-01",
  "occurred_at": "2026-08-03T18:15:00.000Z",
  "correlation_id": "corr-9999",
  "causation_id": "evt-1002",
  "metadata": { "approval_level": 3, "comment": "Verified on site." }
}
```

---

# 8. Event Guarantees, Idempotency & Versioning Rules

- **Delivery Guarantee:** At-least-once delivery guaranteed for all event handlers.
- **Idempotency Rule:** Every event subscriber MUST check `event_id` or `correlation_id` before processing to prevent duplicate execution during network retries.
- **Event Versioning Policy:** Event schemas use SemVer (`1.0.0`). Breaking schema changes require incrementing major version (`2.0.0`) and maintaining backwards-compatible handlers.
- **Retry Strategy:** Exponential backoff with maximum 5 retry attempts before moving un-processable event payloads to a Dead Letter Queue (DLQ).

---
**END OF SPECIFICATION — DEV-011Y**
