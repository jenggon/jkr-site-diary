# API-016
# Workforce API

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

Status

Locked

---

# Purpose

Defines REST endpoints for workforce recording.

---

# Resource

/workforce

---

# Endpoints

GET /workforce

GET /workforce/{workforceId}

POST /workforce

PATCH /workforce/{workforceId}

DELETE /workforce/{workforceId}

---

# Relationships

Site Diary

Activity

Trade Library

---

# Business Rules

Workforce belongs to one Site Diary.

Trade shall exist.

Total workforce is system calculated.

Historical workforce records remain immutable.

---

# Validation

Trade exists.

Site Diary exists.

Counts shall not be negative.

---

# Permissions

Read

Create

Update

Archive

---

# Audit

Create

Update

Archive

---

# Related Documents

DB-017 Workforce Schema

DB-018 Trade Library
