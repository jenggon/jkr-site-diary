# API-020
# Photo API

Status

Approved

---

# Purpose

Defines REST endpoints for construction photo management.

---

# Resource

/photos

---

# Endpoints

GET /photos

GET /photos/{photoId}

POST /photos

DELETE /photos/{photoId}

---

# Relationships

Activity

Site Diary

AI Metadata

---

# Business Rules

Photos are immutable evidence.

Replacing a photo creates a new record.

GPS information is optional.

---

# Validation

Image format supported.

Maximum image size.

Referenced Activity exists.

---

# Permissions

Read

Upload

Archive

---

# Audit

Upload

Archive

---

# Related Documents

DB-027 Photo Schema

DB-031 AI Metadata Schema