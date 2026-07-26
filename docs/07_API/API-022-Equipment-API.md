# API-022
# Equipment API

Status

Approved

---

# Purpose

Defines REST endpoints for recording equipment utilisation.

---

# Resource

/equipment

---

# Endpoints

GET /equipment

GET /equipment/{equipmentId}

POST /equipment

PATCH /equipment/{equipmentId}

DELETE /equipment/{equipmentId}

---

# Relationships

Activity

Site Diary

---

# Business Rules

Equipment records actual site utilisation.

Historical records remain immutable.

Equipment does not modify planning baseline.

---

# Validation

Equipment name required.

Working hours shall not be negative.

Activity exists.

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

DB-029 Equipment Schema