# API-005
# Request Validation

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

Status

Locked

---

# Purpose

Defines validation requirements before business logic execution.

Validation shall occur before database operations.

---

# Validation Order

Authentication

↓

Authorization

↓

Request Format

↓

Business Rules

↓

Database Transaction

---

# Validation Categories

Required Fields

Data Type

Length

Range

Enum

Foreign Key

Business Rule

Duplicate Detection

---

# Examples

Required

activity_date

trade_id

programme_id

---

String Length

Minimum

1

Maximum

255

---

Numeric Validation

Quantity ≥ 0

Working Hours ≥ 0

Progress %

0–100

---

Date Validation

No invalid dates.

Future dates shall follow business rules.

---

Enum Validation

Only predefined values are accepted.

---

Foreign Key Validation

Referenced entity shall exist.

Referenced entity shall not be archived.

---

Business Validation

Programme must exist.

Revision must belong to Programme.

Activity must belong to Revision.

Site Diary must belong to Activity.

---

# Validation Failure

HTTP 422

Standard error response shall be returned.

---

# Security

Validation shall never trust client input.

Server-side validation is mandatory.

---

# Related Documents

API-004

DB-007 Constraints
