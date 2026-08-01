# PM-400 — User Management

## Status

Approved

---

# Purpose

Manage the complete lifecycle of users within the Construction Operations Platform.

---

# Business Objective

Provide secure identity management while maintaining operational accountability.

---

# Business Value

- Secure platform access
- Clear user ownership
- Consistent identity management
- Improved auditability

---

# Actors

Administrator

System Administrator

---

# Business Flow

Create User

↓

Assign Organisation

↓

Assign Role

↓

Activate

↓

Operate

↓

Suspend

↓

Archive

---

# Functional Scope

Included

- User registration
- User activation
- User suspension
- Password reset
- Profile management

Excluded

- HR management
- Payroll

---

# Functional Requirements

Every user has one identity.

User status system controlled.

Archived users remain auditable.

---

# Operational Policies

Password Policy

Session Policy

Account Lockout

Identity Verification

---

# Dependencies

Role

Permission

Organisation

Audit

---

# Database Reference

DB-022

---

# API Reference

API-027

---

# UI Reference

UI-400

---

# Success Metrics

100% authenticated users.

---

# Acceptance Criteria

User lifecycle managed successfully.

---

Version

1.0.0

LOCKED