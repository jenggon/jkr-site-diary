# API-030
# AI Metadata API

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

Status

Locked

---

# Purpose

Defines REST endpoints for AI-generated metadata.

AI Metadata provides intelligence without modifying operational records.

---

# Resource

/ai-metadata

---

# Endpoints

GET /ai-metadata

GET /ai-metadata/{aiMetadataId}

POST /ai-metadata

PATCH /ai-metadata/{aiMetadataId}/review

DELETE /ai-metadata/{aiMetadataId}

---

# Relationships

Programme

Activity

Site Diary

Progress

Photo

Attachment

---

# Business Rules

AI Metadata is generated automatically.

Operational records shall never be modified by AI.

Human review is required before recommendations are accepted.

Historical AI Metadata remains immutable.

---

# Validation

Referenced record exists.

Analysis Type valid.

Confidence Score between 0 and 100.

---

# Permissions

Read

Review

Archive

Generate

---

# Audit

Generate

Review

Archive

---

# Related Documents

DB-031 AI Metadata Schema

API-003

API-005
