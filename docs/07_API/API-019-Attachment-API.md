# API-019
# Attachment API

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

Status

Locked

---

# Purpose

Defines REST endpoints for attachment management.

---

# Resource

/attachments

---

# Endpoints

GET /attachments

GET /attachments/{attachmentId}

POST /attachments

DELETE /attachments/{attachmentId}

---

# Relationships

Activity

Site Diary

Progress

---

# Business Rules

Files are stored in Supabase Storage.

Database stores metadata only.

Deleting an attachment performs a soft delete.

---

# Validation

Supported file type.

Maximum file size.

Referenced record exists.

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

DB-026 Attachment Schema

API-009 File Upload
