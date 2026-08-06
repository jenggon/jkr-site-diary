# HQ ENGINEERING SPECIFICATION
## DEV-012A — Validation Rules Catalogue

**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked  
**Reference Standards:** ARCH-000, ADR-007, ADR-009, ADR-010, DEV-010A through DEV-011Z  

---

# 1. Purpose & Objectives

- **Business Objective:** Safeguard public infrastructure project records against corrupt, invalid, or non-compliant data entries, ensuring legal non-repudiation and accurate contractual reporting.
- **Operational Objective:** Provide deterministic, instant feedback to site staff and Superintending Officers (SOs) during daily site logging, progress recording, and workflow approvals.
- **System Objective:** Establish strict, technology-agnostic validation boundaries across all 11 platform engines, enforcing data integrity BEFORE database persistence or business execution per **ARCH-000**.

---

# 2. Validation Philosophy

- **Fail Fast:** Validate all input payloads at the system ingress boundary (REST API / DTO layer) prior to invoking Service or Repository layers.
- **Deterministic Validation:** Given identical inputs and context state, validation outcomes MUST be 100% predictable and reproducible.
- **Stateless Validation Rules:** Individual rule evaluations must rely strictly on explicit input payloads and immutable context records without transient side-effects.
- **Immutable Historical Data:** Approved historical records (e.g., locked Site Diaries, superseded baseline revisions) are permanently read-only and immutable.
- **Consistent Validation Behaviour:** Uniform validation rules and error payload structures across all mobile, web, and system integration interfaces.
- **Zero Hidden Business Logic:** All validation constraints MUST be explicitly declared in this specification; no silent fallback defaults or implicit assumptions.

---

# 3. Validation Categories

1. **Required Field Validation:** Checks for presence of mandatory payload fields.
2. **Data Type Validation:** Enforces correct primitive types (String, Number, Boolean, UUID, Date).
3. **Length Validation:** Restricts string character counts and array item limits.
4. **Range Validation:** Enforces minimum/maximum numerical boundaries and date intervals.
5. **Enumeration Validation:** Restricts input values to locked system enums.
6. **Date Validation:** Verifies ISO 8601 calendar format (`YYYY-MM-DD`).
7. **Time Validation:** Verifies timestamp formats (`YYYY-MM-DDTHH:mm:ss.sssZ`).
8. **Cross-Field Validation:** Evaluates relationships between fields within the same payload (e.g., `start_date <= finish_date`).
9. **Cross-Entity Validation:** Verifies references against external baseline entities (e.g., `activity_id` belongs to active `revision_id`).
10. **State Transition Validation:** Validates current state against target state using state machine transition matrices (DEV-011).
11. **Permission Validation:** Verifies caller role authorization before processing payload.
12. **Referential Integrity Validation:** Guarantees foreign key targets exist and are active.
13. **File Validation:** Verifies binary file size, MIME type, and structural syntax (e.g., `.mpp`/XML schedule imports).

---

# 4. Global Validation Rules

- **Mandatory Fields:** Null or undefined values in non-nullable fields are strictly rejected.
- **Null Handling:** Optional fields permit explicit `null` values; empty strings (`""`) are converted to `null` or rejected.
- **Whitespace Trimming:** All incoming string parameters must be automatically trimmed of leading/trailing whitespace before validation.
- **Maximum String Lengths:**
  - Standard Identifiers / Codes: Max 30 characters.
  - Names & Titles: Max 100 characters.
  - Text Descriptions & Summaries: Max 2,000 characters.
- **Allowed Unicode:** Standard UTF-8 characters permitted. Control characters (`\u0000` - `\u001F`) are forbidden.
- **Decimal Precision:** All monetary and physical progress quantities enforce maximum `DECIMAL(18,4)` precision (4 decimal places). Percentages enforce `DECIMAL(5,2)` (0.00% to 100.00%).
- **Boolean Validation:** Strictly boolean primitives (`true` / `false`); truthy/falsy strings rejected.
- **UUID Validation:** RFC 4122 Version 4 compliant UUID strings (`8-4-4-4-12` hex format).
- **ISO 8601 Datetime Policy:** UTC timezone enforced (`YYYY-MM-DDTHH:mm:ss.sssZ`).

---

# 5. Domain Validation Rules

### 5.1 Programme Engine (`programme`)
- **Required Fields:** `programme_id`, `programme_code`, `programme_name`, `created_at`.
- **Value Constraints:** `programme_code` unique across platform; `programme_name` 3-100 chars.
- **Cross-Entity Constraints:** Deletion prohibited if child revisions or activities exist.

### 5.2 Programme Revision Engine (`programme_revision`)
- **Required Fields:** `revision_id`, `programme_id`, `revision_number`, `is_active`, `created_at`.
- **Value Constraints:** `revision_number` >= 0; exactly ONE revision per programme has `is_active = true`.
- **State Constraints:** `Published (Active)` revision is immutable; cannot be edited or deleted.

### 5.3 Task Engine (`task`)
- **Required Fields:** `task_id`, `programme_id`, `revision_id`, `wbs_code`, `task_name`, `created_at`.
- **Value Constraints:** `duration` >= 0; `start_date <= finish_date`.
- **Cross-Entity Constraints:** Parent WBS node MUST exist within the same `revision_id`.

### 5.4 Activity Engine (`activity`)
- **Required Fields:** `activity_id`, `programme_id`, `revision_id`, `task_id`, `activity_name`, `operational_status`.
- **Value Constraints:** `operational_status` MUST be a valid `ActivityStatus` enum (`Not Started`, `Started`, `Continue`, `Suspended`, `Completed`, `Cancelled`, `Archived`).
- **State Constraints:** Cannot log progress on `Completed`, `Cancelled`, or `Archived` activities.

### 5.5 Open Activities Engine (`open_activities`)
- **Value Constraints:** Activity eligible for Open Pool IF cumulative progress < 100.00% AND status IN (`Started`, `Continue`, `Suspended`).

### 5.6 Site Diary Engine (`site_diary`)
- **Required Fields:** `site_diary_id`, `programme_id`, `revision_id`, `activity_id`, `diary_date`, `created_at`.
- **Value Constraints:** `diary_date <= Today` (Future site diary entries strictly prohibited).
- **Cross-Entity Constraints:** Composite UNIQUE constraint `(programme_id, activity_id, diary_date)` enforced.

### 5.7 Workforce Engine (`workforce`)
- **Required Fields:** `workforce_id`, `programme_id`, `revision_id`, `activity_id`, `site_diary_id`, `trade_id`.
- **Value Constraints:** `bumiputera_count >= 0`, `non_bumiputera_count >= 0`, `foreign_count >= 0`.
- **Cross-Entity Constraints:** Selected `trade_id` MUST exist and have `is_active = true` in `trade_library`.

### 5.8 Progress Engine (`progress`)
- **Required Fields:** `progress_id`, `programme_id`, `revision_id`, `activity_id`, `site_diary_id`, `measurement_date`, `actual_quantity`.
- **Value Constraints:** `actual_quantity >= 0.00`; `progress_percentage >= 0.00` AND `<= 100.00`.
- **Cross-Entity Constraints:** Unit MUST match baseline Activity unit.

### 5.9 Approval Engine (`approval`)
- **Required Fields:** `approval_id`, `programme_id`, `revision_id`, `activity_id`, `approval_status`, `requested_by`, `requested_at`.
- **Value Constraints:** `approval_status` IN (`Pending`, `Approved`, `Rejected`, `Returned`, `Cancelled`).
- **State Constraints:** `Returned` or `Rejected` decisions REQUIRE non-empty `approval_comment` (min 5 chars).

### 5.10 Audit Engine (`audit`)
- **Required Fields:** `audit_id`, `programme_id`, `entity_name`, `entity_id`, `event_type`, `event_timestamp`, `performed_by`.
- **State Constraints:** Audit records are 100% append-only. UPDATE or DELETE operations strictly forbidden.

---

# 6. Mathematical Validation Rules

1. **Progress Upper Limit:** Cumulative progress MUST NOT exceed `100.00%`. Attempts exceeding 100% trigger HTTP 422 Unprocessable Entity.
2. **Non-Negative Quantity Rule:** `actual_quantity >= 0.00` and `planned_quantity > 0.00`.
3. **Rounding & Precision Policy:** Quantities rounded using Half-Up Rounding to 4 decimal places (`DECIMAL(18,4)`).
4. **Unit Consistency Enforcement:** Physical progress unit MUST match the baseline Activity unit defined in active Revision.

---

# 7. Workflow Validation Rules

- **Site Diary Submission:** Requires valid Weather session, non-negative Manpower counts, non-negative Progress, and zero validation errors.
- **Approval Sign-Off:** Restricted to authorized Superintending Officers (Level 2/3); requires valid pending approval request.
- **Revision Publishing:** Requires WBS graph validation (0 circular dependencies, 0 unlinked tasks) and SO sign-off.

---

# 8. State Machine & Permission Validation Rules

- **State Transition Validation:** Payload must satisfy allowed state transition matrices (DEV-011A through DEV-011F). Forbidden jumps (e.g. `Draft` → `Approved`) trigger HTTP 403/409 errors.
- **Role-Based Access Control (RBAC):**
  - `SITE_SUPERVISOR` / `ENGINEER`: Write access to Draft Site Diaries, Manpower, Progress. Zero Approval sign-off rights.
  - `SUPERINTENDING_OFFICER` (SO): Read/Write access to Approval decisions and Baseline Publishing.

---

# 9. Validation Failure & Error Response Standards

### Failure Behaviour
- **Fail Fast / Short-Circuit:** Input payloads validated sequentially. Fatal schema errors short-circuit execution before invoking DB transactions.
- **Field-Level Granularity:** Validation errors identify specific field names, constraint codes, and human-readable messages.

### Standard Validation Error Response Schema (HTTP 400 / 422)
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Input validation failed for one or more fields",
    "status": 422,
    "timestamp": "2026-08-06T22:35:59.000Z",
    "correlation_id": "corr-uuid-12345",
    "details": [
      {
        "field": "actual_quantity",
        "code": "EXCEEDS_CUMULATIVE_CEILING",
        "message": "Cumulative progress quantity would exceed 100.00% planned target"
      },
      {
        "field": "trade_id",
        "code": "INACTIVE_TRADE_REFERENCE",
        "message": "Selected trade_id is inactive in Trade Library"
      }
    ]
  }
}
```

---

# 10. Performance & Scalability Requirements

- **Validation Latency:** Ingress payload validation MUST complete in <= 15ms.
- **Batch Processing:** Support bulk validation of array payloads (e.g., 50 workforce trade entries validated in < 30ms).
- **Stateless Execution:** Validation functions remain 100% stateless for horizontal scaling across worker nodes.

---
**END OF SPECIFICATION — DEV-012A**
