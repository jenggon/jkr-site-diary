# API-015
# Progress API

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

Status

Locked

---

# Purpose

Defines REST endpoints for Progress reporting.

Progress records actual work completion.

---

# Resource

/progress

---

# Endpoints

GET /progress

GET /progress/{progressId}

POST /progress

PATCH /progress/{progressId}

DELETE /progress/{progressId}

---

# Relationships

Activity

Site Diary

Approval

---

# Business Rules

Progress belongs to one Activity.

Progress values shall not exceed 100%.

Approved Progress becomes read-only.

Historical Progress shall never be overwritten.

---

# Validation

Activity exists.

Progress value between 0 and 100.

Approval status verified.

---

# Permissions

Read

Create

Update

Approve

Archive

---

# Audit

Create

Update

Approve

Reject

Archive

---

# Related Documents

DB-016 Progress Schema

DB-020 Approval Schema

API-003
