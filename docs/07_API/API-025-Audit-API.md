# API-025
# Audit API

Status

Approved

---

# Purpose

Defines REST endpoints for Audit records.

Audit provides immutable historical records for system activities.

---

# Resource

/audits

---

# Endpoints

GET /audits

GET /audits/{auditId}

---

# Relationships

Programme

Activity

Site Diary

Progress

Approval

User

---

# Business Rules

Audit records are append-only.

Audit records cannot be modified.

Audit records cannot be deleted.

---

# Validation

Read-only API.

No POST.

No PATCH.

No DELETE.

---

# Permissions

Read Audit

Administrator Only

---

# Audit

Audit access shall itself be audited.

---

# Related Documents

DB-021 Audit Schema

ADR-009