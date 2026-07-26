# API-014
# Site Diary API

Status

Approved

---

# Purpose

Defines REST endpoints for Site Diary management.

Site Diary records daily operational activities.

---

# Resource

/site-diaries

---

# Endpoints

GET /site-diaries

GET /site-diaries/{siteDiaryId}

POST /site-diaries

PATCH /site-diaries/{siteDiaryId}

DELETE /site-diaries/{siteDiaryId}

---

# Relationships

Activity

Weather

Photo

Attachment

Workforce

Equipment

Material

---

# Business Rules

One Site Diary belongs to one Activity.

One Activity may have multiple Site Diaries.

Site Diary cannot exist without Activity.

Historical entries remain immutable after approval.

---

# Validation

Activity exists.

Observation Date required.

Programme access verified.

---

# Permissions

Read

Create

Update

Archive

Approve

---

# Audit

Create

Update

Approve

Archive

---

# Related Documents

DB-015 Site Diary Schema

DB-028 Weather Schema

DB-027 Photo Schema