# API-018
# Resource Assignment API

Status

Approved

---

# Purpose

Defines REST endpoints for planning resource assignments.

Resource Assignment represents planning baseline only.

---

# Resource

/resource-assignments

---

# Endpoints

GET /resource-assignments

GET /resource-assignments/{resourceAssignmentId}

POST /resource-assignments

PATCH /resource-assignments/{resourceAssignmentId}

DELETE /resource-assignments/{resourceAssignmentId}

---

# Relationships

Programme Revision

Task

Trade Library

---

# Business Rules

Resource Assignment belongs to one Programme Revision.

Resource Assignment belongs to one Task.

Operational records shall never modify Resource Assignment.

Only planning users may update Resource Assignment.

---

# Validation

Programme Revision exists.

Task exists.

Trade exists.

Planned Quantity shall be greater than zero.

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

DB-019 Resource Assignment Schema

DB-013 Task Schema

DB-018 Trade Library Schema