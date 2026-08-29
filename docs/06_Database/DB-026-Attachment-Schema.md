# DB-026
# Attachment Schema

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

Status

Locked

---

# Purpose

Attachment stores non-image supporting documents associated with operational records.

Attachments provide evidence for Activities, Site Diaries, Progress and Approvals.

Attachments never store binary content inside the database.

Files are stored externally while this table stores metadata only.

---

# Table Name

attachment

---

# Primary Key

attachment_id

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

Nullable.

site_diary_id

UUID

FK

Nullable.

progress_id

UUID

FK

Nullable.

---

# File Information

file_name

VARCHAR(255)

Required.

original_file_name

VARCHAR(255)

Required.

file_extension

VARCHAR(20)

Required.

mime_type

VARCHAR(100)

Required.

file_size_bytes

BIGINT

Required.

storage_path

TEXT

Required.

storage_provider

VARCHAR(50)

Default

Supabase Storage

---

# Classification

attachment_type

ENUM

Drawing

Method Statement

Inspection Report

Test Report

Checklist

Permit

Certificate

Supporting Document

Others

---

# Status

is_active

BOOLEAN

Default TRUE

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

1 → Many Attachments

Site Diary

1 → Many Attachments

Progress

1 → Many Attachments

---

# Business Rules

Binary files shall never be stored inside PostgreSQL.

Metadata remains after file replacement.

Deleted files are soft deleted.

One attachment belongs to one logical business record.

---

# Constraints

file_name NOT NULL

storage_path UNIQUE

mime_type NOT NULL

---

# Indexes

storage_path

activity_id

site_diary_id

progress_id

attachment_type

---

# Ownership

Owner

Attachment Engine

Referenced by

Reporting

AI Engine

Approval Engine

---

# Security

Read

Authorised Users

Write

Attachment Engine

Delete

Soft Delete Only

---

# Future Extensions

Versioning

Virus Scan

Checksum

OCR

Digital Watermark

Retention Policy

---

# Related Documents

DB-014 Activity Schema

DB-015 Site Diary Schema

DB-016 Progress Schema
