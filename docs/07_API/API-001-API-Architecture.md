# API-001
# API Architecture

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

Status

Locked

---

# Purpose

This document defines the REST API architecture for the JKR Site Diary Platform.

The API layer provides a secure and consistent interface between client applications and backend services.

---

# Principles

RESTful

Stateless

JSON Only

Versioned

Secure by Default

Role Based Access Control

Idempotent where applicable

---

# API Version

Current Version

v1

Base URL

/api/v1

Example

/api/v1/programmes

---

# Response Format

Success

{
    "success": true,
    "data": {}
}

Failure

{
    "success": false,
    "error": {
        "code": "...",
        "message": "..."
    }
}

---

# Authentication

Supabase JWT

Bearer Token

HTTPS Only

---

# Authorization

Permission based.

Every endpoint shall validate permissions before execution.

---

# Pagination

page

page_size

total

total_pages

---

# Filtering

Query Parameters

Example

?status=Open

?trade=Earthwork

?date=2027-01-15

---

# Sorting

sort

order

Example

?sort=date

?order=desc

---

# HTTP Status Codes

200

201

204

400

401

403

404

409

422

500

---

# Logging

Every request shall be logged.

Every failed request shall be audited.

---

# Related Documents

DB-001 Database Architecture

ADR-001
