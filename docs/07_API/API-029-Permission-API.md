# API-029
# Permission API

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

Status

Locked

---

# Purpose

Defines REST endpoints for Permission management.

---

# Resource

/permissions

---

# Endpoints

GET /permissions

GET /permissions/{permissionId}

POST /permissions

PATCH /permissions/{permissionId}

DELETE /permissions/{permissionId}

---

# Business Rules

Permissions are assigned through Roles.

System Permissions cannot be deleted.

Permission Codes are immutable.

---

# Validation

Permission Code unique.

Module required.

---

# Permissions

Administrator Only.

---

# Audit

Create

Update

Archive

---

# Related Documents

DB-024 Permission Schema

DB-023 Role Schema
