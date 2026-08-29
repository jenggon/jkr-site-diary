# HQ ENGINEERING SPECIFICATION
## DEV-012D — Error Catalogue & Exception Handling Specification

**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked  
**Reference Standards:** ARCH-000, ADR-007, ADR-009, ADR-010, DEV-010A through DEV-012C  

---

# 1. Purpose & Objectives

- **Business Objective:** Eliminate operational downtime and un-audited data corruption across JKR public project deployments by enforcing deterministic, transparent error management.
- **Operational Objective:** Provide site staff and Superintending Officers with unambiguous, actionable error messages during daily logging, approval reviews, and baseline revisions.
- **System Objective:** Establish a unified, technology-agnostic exception handling specification covering REST APIs, Service orchestration, state machines, and database repositories per **ARCH-000**.

---

# 2. Error Handling Philosophy

- **Fail Fast:** Intercept invalid payloads or unauthorized requests at the API gateway layer before initiating service execution or database transactions.
- **Explicit Errors:** Every exception MUST specify a unique error code, descriptive name, and target field location. No generic unhandled crashes.
- **No Silent Failure:** Swallowing exceptions or returning dummy fallback data is STRICTLY FORBIDDEN.
- **Deterministic Error Responses:** Identical error conditions MUST yield identical HTTP status codes, error structures, and error codes.
- **Atomic Rollback:** Multi-engine transaction failures MUST trigger complete rollback ensuring zero partial database state (**ADR-010**).
- **Audit All Critical Failures:** Security violations, validation failures, and transaction rollbacks generate synchronous audit log entries.

---

# 3. Error Categories

1. **Validation Errors:** Input payload fails schema, length, type, or boundary rules.
2. **Authentication Errors:** Missing, expired, or malformed identity credentials.
3. **Authorization Errors:** User role lacks permissions for target operation or project context.
4. **Business Rule Violations:** Operation violates platform domain rules (DEV-012B).
5. **State Machine Violations:** Transition violates allowed state machine matrices (DEV-011).
6. **Resource Not Found:** Target entity ID does not exist in active context.
7. **Concurrency Errors:** Optimistic lock check (`updated_at`) fails due to concurrent edit.
8. **Database Errors:** Foreign key, unique constraint, or connection timeout failures.
9. **External Service Errors:** Upstream integration (e.g. MSP file parser, IdP SSO) failure.
10. **Infrastructure Errors:** Storage, network, or queue failure.
11. **Unexpected System Errors:** Unhandled runtime exceptions.

---

# 4. Standard Error Response Model

All API error responses MUST adhere to the following JSON schema:

```json
{
  "error": {
    "error_code": "ERR-SD-001",
    "error_name": "DUPLICATE_SITE_DIARY_ENTRY",
    "http_status": 409,
    "message": "A Site Diary entry already exists for this activity on the specified date.",
    "details": [
      {
        "field": "diary_date",
        "value": "2026-08-06",
        "constraint": "UNIQUE(programme_id, activity_id, diary_date)"
      }
    ],
    "correlation_id": "corr-uuid-98765",
    "timestamp": "2026-08-06T22:41:55.000Z",
    "path": "/api/site-diary"
  }
}
```

---

# 5. HTTP Error Catalogue

| HTTP Status | Category | Platform Usage |
|---|---|---|
| **400 Bad Request** | Validation | Malformed JSON body, missing mandatory query parameters |
| **401 Unauthorized** | Authentication | Missing or expired JWT token |
| **403 Forbidden** | Authorization | Insufficient RBAC role or project scope violation |
| **404 Not Found** | Resource | Target entity ID (`site_diary_id`, `activity_id`) does not exist |
| **409 Conflict** | State / Concurrency | Duplicate diary entry, invalid state machine transition, optimistic lock failure |
| **410 Gone** | Resource State | Target entity permanently deleted or archived |
| **412 Precondition Failed**| System State | Missing active baseline revision for programme |
| **422 Unprocessable Entity**| Business Rule | Physical progress > 100%, negative manpower count |
| **429 Too Many Requests** | Rate Limiting | Ingress API rate limit exceeded |
| **500 Internal Error** | Unexpected | Unhandled server error or DB connection crash |
| **502 Bad Gateway** | Integration | Upstream MSP schedule parser service failure |
| **503 Service Unavailable**| Maintenance | System undergoing baseline database migration |
| **504 Gateway Timeout** | Timeout | Database transaction or background evaluation timeout |

---

# 6. Domain Error Code Catalogue

### Programme Engine (`PROG`)
- `ERR-PROG-001`: Duplicate programme code (`409 Conflict`).
- `ERR-PROG-002`: Programme has active child entities; archive prohibited (`422 Unprocessable Entity`).

### Programme Revision Engine (`REV`)
- `ERR-REV-001`: No active baseline revision found for programme (`412 Precondition Failed`).
- `ERR-REV-002`: Attempt to mutate published baseline revision (`409 Conflict`).
- `ERR-REV-003`: Circular dependency in imported WBS schedule graph (`422 Unprocessable Entity`).

### Task Engine (`TASK`)
- `ERR-TASK-001`: Invalid WBS parent code reference (`404 Not Found`).
- `ERR-TASK-002`: Task finish date precedes start date (`400 Bad Request`).

### Activity Engine (`ACT`)
- `ERR-ACT-001`: Progress update logged on completed/cancelled activity (`409 Conflict`).
- `ERR-ACT-002`: Invalid activity operational state transition (`409 Conflict`).

### Site Diary Engine (`SD`)
- `ERR-SD-001`: Duplicate site diary entry for same activity and date (`409 Conflict`).
- `ERR-SD-002`: Attempt to edit approved/locked site diary (`409 Conflict`).
- `ERR-SD-003`: Future site diary date prohibited (`400 Bad Request`).

### Workforce Engine (`WF`)
- `ERR-WF-001`: Selected trade ID is inactive in Trade Library (`422 Unprocessable Entity`).
- `ERR-WF-002`: Negative manpower headcount entered (`400 Bad Request`).

### Progress Engine (`PG`)
- `ERR-PG-001`: Cumulative physical progress exceeds 100.00% planned ceiling (`422 Unprocessable Entity`).
- `ERR-PG-002`: Negative progress quantity entered (`400 Bad Request`).
- `ERR-PG-003`: Progress measurement unit mismatch with baseline activity (`400 Bad Request`).

### Approval Engine (`AP`)
- `ERR-AP-001`: Mandatory return/rejection comment missing (`400 Bad Request`).
- `ERR-AP-002`: Submitter unauthorized to execute approval sign-off (`403 Forbidden`).

### Audit Engine (`AU`)
- `ERR-AU-001`: Direct update or delete of audit record prohibited (`403 Forbidden`).

---

# 7. Transaction Failure & Resiliency Rules

- **Atomic Rollback Rule:** Any exception thrown during a multi-engine service transaction MUST execute a complete DB rollback. Zero partial records persisted.
- **Dead Letter Queue (DLQ):** Failed asynchronous background events (e.g. notification dispatch) retry 3 times before routing to DLQ for admin inspection.
- **Idempotency Recovery:** Retried POST/PATCH requests containing identical `X-Idempotency-Key` headers return cached prior success responses without re-executing business logic.

---

# 8. Logging, Audit & Tracing Requirements

- **Synchronous Failures:** Permission violations and state machine errors MUST log an audit event (`event_type = Reject/Update`) capturing actor ID, timestamp, and IP address.
- **Masking Policy:** Passwords, API tokens, and personally identifiable information (PII) MUST be masked (`***MASKED***`) in server logs.
- **Correlation ID:** Every incoming API request assigns a unique `correlation_id` header propagated across all internal service logs.

---

# 9. Client Behaviour Guidelines

- **409 Conflict (Concurrency):** Client prompts user to refresh screen and merge changes.
- **401/403 (Auth):** Client redirects user to SSO login or displays access denied notification.
- **Offline Sync Failure:** Mobile client stores un-synced entries locally and retries upon connection restore.

---

# 10. Future Observability Recommendations

- **Distributed Tracing:** Implement OpenTelemetry context propagation across REST services.
- **Centralized Log Aggregation:** Stream JSON error logs to ELK Stack / Grafana Loki with automated Slack/PagerDuty alerts for HTTP 500 error spikes (>10 errors/min).

---
**END OF SPECIFICATION — DEV-012D**
