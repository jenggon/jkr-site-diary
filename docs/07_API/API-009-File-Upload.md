# API-009
# File Upload

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

Status

Locked

---

# Purpose

Defines upload behaviour for photos and supporting documents.

---

# Supported Resources

Photo

Attachment

Drawing

Report

Certificate

Checklist

---

# Upload Endpoint

POST

/upload

---

# Content Type

multipart/form-data

---

# Response

{
    "success": true,
    "data": {
        "fileId": "...",
        "storagePath": "...",
        "url": "..."
    }
}

---

# File Validation

Maximum File Size

20 MB

---

Supported Types

JPEG

PNG

PDF

DOCX

XLSX

ZIP

---

# Storage

Supabase Storage

Database stores metadata only.

---

# Business Rules

Upload shall complete before database record creation.

Failed uploads shall not create metadata.

Replacing a file creates a new record.

---

# Security

Virus Scan

File Type Validation

Permission Validation

HTTPS Required

---

# Future Extensions

Chunk Upload

Resumable Upload

Image Compression

OCR

Digital Signature

---

# Related Documents

DB-026 Attachment Schema

DB-027 Photo Schema

API-005
