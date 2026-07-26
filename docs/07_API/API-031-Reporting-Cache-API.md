# API-031
# Reporting Cache API

Status

Approved

---

# Purpose

Defines REST endpoints for Reporting Cache.

Reporting Cache improves dashboard performance using pre-generated summaries.

---

# Resource

/reporting-cache

---

# Endpoints

GET /reporting-cache

GET /reporting-cache/{cacheId}

POST /reporting-cache/refresh

DELETE /reporting-cache/{cacheId}

---

# Relationships

Programme

Programme Revision

Dashboard

Reporting Engine

---

# Business Rules

Reporting Cache stores derived data only.

Cache may be regenerated at any time.

Deleting cache shall never affect operational data.

Expired cache shall be recreated automatically.

---

# Validation

Programme exists.

Cache Key unique.

Cache Type valid.

---

# Permissions

Read

Refresh

Delete

Administrator Only

---

# Audit

Generate

Refresh

Delete

---

# Related Documents

DB-032 Reporting Cache Schema

API-006