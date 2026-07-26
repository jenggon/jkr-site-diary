# API-010
# Programme API

Status

Approved

---

# Purpose

Defines REST endpoints for Programme management.

---

# Resource

/programmes

---

# Endpoints

GET    /programmes

GET    /programmes/{programmeId}

POST   /programmes

PATCH  /programmes/{programmeId}

DELETE /programmes/{programmeId}

---

# Permissions

Read Programme

Create Programme

Update Programme

Archive Programme

---

# GET Collection

Supports

Pagination

Filtering

Sorting

Search

---

# GET By ID

Returns complete Programme information.

---

# POST

Creates a new Programme.

---

# PATCH

Partial update.

---

# DELETE

Archive only.

No physical deletion.

---

# Validation

Programme Code unique.

Programme Name required.

---

# Response

Refer API-006.

---

# Audit

Create

Update

Archive

---

# Related Documents

DB-011

API-004

API-005