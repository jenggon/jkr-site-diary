# API-011
# Programme Revision API

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

Status

Locked

---

# Purpose

Defines REST endpoints for Programme Revision.

---

# Resource

/programme-revisions

---

# Endpoints

GET

POST

PATCH

Archive

---

# Business Rules

Revision belongs to one Programme.

Revision is immutable after approval.

Only one Active Revision.

---

# Endpoints

GET /programme-revisions

GET /programme-revisions/{revisionId}

POST /programme-revisions

PATCH /programme-revisions/{revisionId}

DELETE /programme-revisions/{revisionId}

---

# Validation

Programme exists.

Revision number unique within Programme.

---

# Audit

Create

Approve

Archive

---

# Related Documents

DB-012

ADR-002

ADR-005
