# API-012
# Task API

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

Status

Locked

---

# Purpose

Defines REST endpoints for planning tasks.

---

# Resource

/tasks

---

# Endpoints

GET

POST

PATCH

DELETE

---

GET /tasks

GET /tasks/{taskId}

POST /tasks

PATCH /tasks/{taskId}

DELETE /tasks/{taskId}

---

# Business Rules

Task belongs to one Revision.

Task cannot exist without Revision.

Task is planning data.

Operational records never modify Tasks.

---

# Validation

Task Code unique within Revision.

Trade exists.

Programme exists.

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

DB-013

DB-019

ADR-004
