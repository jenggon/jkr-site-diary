# DB-023
# Role Schema

Status

Approved

---

# Purpose

Role defines user responsibilities and access levels within the Site Diary Platform.

Role supports Role-Based Access Control (RBAC).

Permissions are assigned through Roles.

---

# Table Name

role

---

# Primary Key

role_id

UUID

---

# Role Information

role_code

VARCHAR(50)

Unique.

Examples

SYSTEM_ADMIN

HQ_ADMIN

PROJECT_MANAGER

RESIDENT_ENGINEER

SITE_SUPERVISOR

CONTRACTOR

VIEWER

---

role_name

VARCHAR(100)

Required.

---

description

TEXT

Nullable.

---

scope

ENUM

Global

Programme

---

is_system_role

BOOLEAN

Default TRUE

---

is_active

BOOLEAN

Default TRUE

---

# Audit

created_at

TIMESTAMP

---

updated_at

TIMESTAMP

---

# Relationships

Role

1 → Many Users

Role

Many → Many Permissions

---

# Business Rules

Role defines responsibility.

Role does not store permissions directly.

Permissions are assigned through Permission mapping.

Inactive roles cannot be assigned to new users.

System Roles cannot be deleted.

---

# Constraints

role_code UNIQUE

role_name UNIQUE

scope NOT NULL

---

# Indexes

role_code

scope

is_active

---

# Ownership

Owner

Security Engine

Referenced by

User Management

Permission Engine

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

Custom Roles

Temporary Roles

Delegated Roles

Inherited Roles

Project Templates

---

# Related Documents

DB-022 User Schema

DB-024 Permission Schema

ADR-009 Programme First Principle