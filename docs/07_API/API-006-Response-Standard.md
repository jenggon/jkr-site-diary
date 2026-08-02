# API-006
# Response Standard

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

Status

Locked

---

# Purpose

Defines standard response format for every API endpoint.

---

# Success Response

{
    "success": true,
    "data": {}
}

---

# Collection Response

{
    "success": true,
    "data": [],
    "pagination": {}
}

---

# Empty Response

HTTP 204

No response body.

---

# Metadata

Optional.

Example

timestamp

request_id

version

---

# Pagination

Returned only for collection endpoints.

---

# Error Response

Refer API-004.

---

# Date Format

ISO-8601

Example

2027-04-20T14:30:00Z

---

# Number Format

JSON Number

No formatted strings.

---

# Boolean

true

false

---

# Null

Used only when value is unknown or not applicable.

---

# Naming Convention

camelCase

Examples

activityDate

siteDiaryId

workingHours

---

# Performance

Large payloads should use pagination.

Repeated calculations should use Reporting Cache.

---

# Related Documents

API-001

API-004

DB-032 Reporting Cache
