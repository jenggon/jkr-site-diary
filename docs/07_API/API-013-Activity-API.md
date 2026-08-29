# API-013
# Activity API

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

Status

Locked

---

# Purpose

Defines REST endpoints for construction activities.

Activity represents actual site execution.

---

# Resource

/activities

---

# Endpoints

GET /activities

GET /activities/{activityId}

POST /activities

PATCH /activities/{activityId}

DELETE /activities/{activityId}

---

# Query Support

Pagination

Filtering

Sorting

Search

---

# Relationships

Programme

Revision

Task

Site Diary

Progress

Workforce

Photo

Attachment

Material

Equipment

Weather

---

# Business Rules

Activity belongs to one Programme Revision.

Activity shall reference one Task.

Activity may exist before Site Diary creation.

Archived Activities remain historically accessible.

---

# Validation

Task exists.

Revision exists.

Activity Date valid.

Trade exists.

---

# Permissions

Read Activity

Create Activity

Update Activity

Archive Activity

---

# Audit

Create

Update

Archive

Resume

Complete

---

# Related Documents

DB-014 Activity Schema

ADR-004

API-005
