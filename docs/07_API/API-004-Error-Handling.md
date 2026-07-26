# API-004
# Error Handling

Status

Approved

---

# Purpose

Defines standard error handling behaviour for all REST API endpoints.

The objective is to provide predictable, consistent and machine-readable error responses.

---

# Principles

Consistent

Descriptive

Secure

No internal implementation details shall be exposed.

---

# Standard Error Response

{
    "success": false,
    "error": {
        "code": "RESOURCE_NOT_FOUND",
        "message": "Programme not found."
    }
}

---

# Error Object

code

Machine readable.

message

Human readable.

details

Optional.

trace_id

Optional.

---

# HTTP Status Mapping

400

Bad Request

401

Unauthorized

403

Forbidden

404

Not Found

409

Conflict

422

Validation Failed

429

Too Many Requests

500

Internal Server Error

503

Service Unavailable

---

# Validation Errors

Example

{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Input validation failed.",
        "details": [
            {
                "field": "activity_date",
                "message": "Activity Date is required."
            }
        ]
    }
}

---

# Logging

All server errors shall be logged.

Unexpected exceptions shall generate audit records.

---

# Security

Database errors shall never be exposed.

Stack traces shall never be returned.

Sensitive information shall be masked.

---

# Related Documents

API-001

API-003

DB-021 Audit