# DB-027
# Photo Schema

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

Status

Locked

---

# Purpose

Photo stores photographic evidence for construction activities.

Photo metadata supports reporting, AI analysis and progress verification.

Image files are stored externally.

---

# Table Name

photo

---

# Primary Key

photo_id

UUID

---

# Parent Ownership

programme_id

UUID

FK

Required.

revision_id

UUID

FK

Nullable.

activity_id

UUID

FK

Required.

site_diary_id

UUID

FK

Required.

---

# Image Information

photo_name

VARCHAR(255)

Required.

storage_path

TEXT

Required.

mime_type

VARCHAR(100)

Required.

file_size_bytes

BIGINT

Required.

capture_datetime

TIMESTAMP

Required.

---

# GPS

latitude

DECIMAL(10,7)

Nullable.

longitude

DECIMAL(10,7)

Nullable.

---

# Classification

photo_category

ENUM

Before Work

During Work

Completed Work

Inspection

Defect

Safety

General

---

caption

TEXT

Nullable.

---

# Audit

uploaded_by

UUID

Required.

uploaded_at

TIMESTAMP

Required.

---

# Relationships

Activity

1 → Many Photos

Site Diary

1 → Many Photos

---

# Business Rules

Photos are immutable evidence.

Image replacement creates a new Photo record.

GPS is optional.

Photos may be analysed by AI.

---

# Constraints

storage_path UNIQUE

activity_id NOT NULL

site_diary_id NOT NULL

capture_datetime NOT NULL

---

# Indexes

activity_id

site_diary_id

capture_datetime

photo_category

---

# Ownership

Owner

Photo Engine

Referenced by

AI Engine

Reporting Engine

Dashboard

---

# Security

Read

Authorised Users

Write

Photo Engine

Delete

Soft Delete Only

---

# Future Extensions

Auto Compression

Face Blur

Object Detection

AI Progress Detection

360 Images

Drone Images

---

# Related Documents

DB-015 Site Diary Schema

DB-026 Attachment Schema

DB-031 AI Metadata Schema
