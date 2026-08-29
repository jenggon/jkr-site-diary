# DB-024
# Permission Schema

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

Status

Locked

---

# Purpose

Permission defines the smallest access control unit within the Site Diary Platform.

Permissions are grouped into Roles to implement Role-Based Access Control (RBAC).

Permissions are reusable across all modules.

---

# Table Name

permission

---

# Primary Key

permission_id

UUID

---

# Permission Information

permission_code

VARCHAR(100)

Unique.

Examples

PROGRAMME_VIEW

PROGRAMME_CREATE

TASK_IMPORT

TASK_VIEW

ACTIVITY_CREATE

ACTIVITY_UPDATE

SITE_DIARY_SUBMIT

PROGRESS_VERIFY

APPROVAL_APPROVE

USER_MANAGE

---

permission_name

VARCHAR(150)

Required.

---

module

VARCHAR(100)

Required.

Examples

Programme

Task

Activity

Site Diary

Progress

Approval

Reporting

Administration

---

description

TEXT

Nullable.

---

is_system_permission

BOOLEAN

Default TRUE

---

is_active

BOOLEAN

Default TRUE

---

# Relationships

Role

Many → Many Permission

---

# Business Rules

Permission represents a single system capability.

Permissions are assigned through Roles.

System Permissions cannot be deleted.

Inactive Permissions cannot be assigned to Roles.

---

# Constraints

permission_code UNIQUE

permission_name NOT NULL

module NOT NULL

---

# Indexes

permission_code

module

is_active

---

# Ownership

Owner

Security Engine

Referenced by

Role Management

Authentication Engine

Authorization Middleware

Audit Engine

---

# Security

Read

Authorised Users

Write

System Administrator

Delete

Not Allowed

Deactivate only.

---

# Future Extensions

Permission Groups

API Scope Mapping

Feature Flags

Module Licensing

Conditional Permissions

Dynamic Permissions

---

# Related Documents

DB-022 User Schema

DB-023 Role Schema

ADR-009 Programme First Principle
