# API-024
# Approval API

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

Status

Locked

---

# Purpose

Defines REST endpoints for Approval workflow.

Approval controls business-level authorisation for operational records.

---

# Resource

/approvals

---

# Endpoints

GET /approvals

GET /approvals/{approvalId}

POST /approvals

PATCH /approvals/{approvalId}

DELETE /approvals/{approvalId}

POST /approvals/{approvalId}/approve

POST /approvals/{approvalId}/reject

POST /approvals/{approvalId}/return

---

# Relationships

Activity

Site Diary

Progress

User

---

# Business Rules

Approval belongs to one business record.

Approved records become read-only.

Rejected records require correction before resubmission.

Returned records remain editable.

Approval history is immutable.

---

# Validation

Approver has permission.

Record exists.

Record not archived.

Approval status valid.

---

# Permissions

Read

Request Approval

Approve

Reject

Return

Archive

---

# Audit

Request

Approve

Reject

Return

Archive

---

# Related Documents

DB-020 Approval Schema

DB-021 Audit Schema

API-003
