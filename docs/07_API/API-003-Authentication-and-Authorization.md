# API-003
# Authentication and Authorization

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

Status

Locked

---

# Purpose

Defines API authentication and authorization strategy.

---

# Authentication

Provider

Supabase Auth

Protocol

JWT

Header

Authorization

Bearer <token>

---

# Session

Stateless

No server session storage.

---

# Authorization

RBAC

Permission Table

Role Table

User Table

---

# Access Flow

Client Login

↓

JWT Issued

↓

API Request

↓

Token Validation

↓

Permission Validation

↓

Business Validation

↓

Database Access

↓

Response

---

# Token Expiry

Handled by Supabase.

Expired tokens shall return HTTP 401.

---

# Permission Checks

Every endpoint shall verify

Authentication

Role

Permission

Programme Access

---

# Audit

Successful Login

Failed Login

Permission Denied

Token Expired

Logout

shall be audited.

---

# Security

HTTPS Required

JWT Required

No Anonymous Access

No Plain Password

---

# Related Documents

DB-021 Audit

DB-022 User

DB-023 Role

DB-024 Permission
