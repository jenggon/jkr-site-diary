# API-002
# Endpoint Naming Convention

Status

Approved

---

# Purpose

Defines endpoint naming standards.

---

# General Rules

Plural nouns

Lowercase

Hyphen separated

No verbs

---

# Examples

/programmes

/programme-revisions

/tasks

/activities

/site-diaries

/progress

/workforce

/photos

/materials

/equipment

---

# Nested Resources

/programmes/{id}/tasks

/programmes/{id}/activities

/site-diaries/{id}/photos

/activities/{id}/progress

---

# HTTP Methods

GET

Retrieve

POST

Create

PUT

Replace

PATCH

Partial Update

DELETE

Archive

---

# Search

/search

Example

GET

/programmes/search

---

# Bulk Operations

/bulk

Example

POST

/workforce/bulk

---

# Export

/export

Example

/programmes/export

---

# Import

/import

---

# File Upload

/upload

---

# Versioning

/api/v1/

Future

/api/v2/

---

# Naming Examples

Good

/programmes

Bad

/getProgramme

/createProgramme

/updateTask

---

# Related Documents

API-001

DB-001