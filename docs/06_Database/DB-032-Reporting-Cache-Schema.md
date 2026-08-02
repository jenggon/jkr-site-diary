# DB-032
# Reporting Cache Schema

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

Status

Locked

---

# Purpose

Reporting Cache stores pre-calculated reporting data to improve dashboard and report performance.

Reporting Cache contains derived data only.

Operational records remain the single source of truth.

---

# Table Name

reporting_cache

---

# Primary Key

reporting_cache_id

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

---

# Cache Information

cache_name

VARCHAR(150)

Required.

---

cache_type

ENUM

Dashboard

KPI

Progress

Resource Summary

Daily Summary

Monthly Summary

Executive Summary

AI Summary

---

cache_key

VARCHAR(255)

Required.

Unique.

---

cache_value

JSONB

Required.

---

generated_at

TIMESTAMP

Required.

---

expires_at

TIMESTAMP

Nullable.

---

generation_duration_ms

INTEGER

Nullable.

---

status

ENUM

Valid

Expired

Refreshing

Failed

---

# Relationships

Programme

1 → Many Reporting Cache

Programme Revision

1 → Many Reporting Cache

---

# Business Rules

Reporting Cache stores derived information only.

Expired cache shall be regenerated automatically.

Cache may be deleted safely without affecting operational records.

Dashboard shall prefer valid cache before recalculation.

---

# Constraints

cache_key UNIQUE

cache_name NOT NULL

cache_value NOT NULL

generated_at NOT NULL

---

# Indexes

programme_id

revision_id

cache_type

status

generated_at

expires_at

---

# Ownership

Owner

Reporting Engine

Referenced by

Dashboard

Analytics

Executive Reporting

---

# Security

Read

Authorised Users

Write

Reporting Engine

Delete

Allowed

Cache is reproducible.

---

# Future Extensions

Distributed Cache

Background Refresh

Incremental Refresh

Cache Compression

Real-time Dashboard

---

# Related Documents

DB-011 Programme Schema

DB-012 Programme Revision Schema

DB-031 AI Metadata Schema
