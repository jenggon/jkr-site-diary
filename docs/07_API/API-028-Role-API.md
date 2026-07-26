# API-028
# Role API

Status

Approved

---

# Purpose

Defines REST endpoints for Role management.

---

# Resource

/roles

---

# Endpoints

GET /roles

GET /roles/{roleId}

POST /roles

PATCH /roles/{roleId}

DELETE /roles/{roleId}

---

# Relationships

Permission

User

---

# Business Rules

System Roles cannot be deleted.

Inactive Roles remain available for historical references.

---

# Validation

Role Code unique.

Role Name required.

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

DB-023 Role Schema

DB-024 Permission Schema