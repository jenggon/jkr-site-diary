# API-023
# Material API

Status

Approved

---

# Purpose

Defines REST endpoints for recording material consumption.

---

# Resource

/materials

---

# Endpoints

GET /materials

GET /materials/{materialId}

POST /materials

PATCH /materials/{materialId}

DELETE /materials/{materialId}

---

# Relationships

Activity

Site Diary

---

# Business Rules

Material represents actual consumption.

Negative quantities are not permitted.

Returned materials remain in historical records.

---

# Validation

Material name required.

Quantity greater than zero.

Unit required.

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

DB-030 Material Schema