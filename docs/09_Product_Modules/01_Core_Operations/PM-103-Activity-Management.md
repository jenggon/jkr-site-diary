# PM-103 — Activity Management

## Status

Approved

---

# Purpose

Activity represents actual site execution.

Activity bridges planning and daily construction operations.

---

# Business Objective

Provide traceable execution records linked to planning.

---

# Actors

Site Engineer

Resident Engineer

SO

---

# Business Flow

Create Activity

↓

Start

↓

Resume

↓

Pause

↓

Complete

↓

Close

---

# Functional Scope

Included

- Activity lifecycle
- Status
- Ownership
- Carry Forward

Excluded

- Progress calculation
- Approval

---

# Functional Requirements

Activity belongs to one Task.

One Activity may span multiple days.

Completed Activities become read-only.

---

# Business Rules Reference

AE-001

AE-009

---

# Database Reference

DB-014

---

# API Reference

API-013

---

# UI Reference

UI-103

---

# Permissions

Create

Resume

Pause

Complete

Read

---

# Notifications

Activity Completed

---

# Audit Requirements

All lifecycle transitions audited.

---

# Acceptance Criteria

Activity lifecycle valid.

History preserved.

Linked to Task.

---

# Definition of Done

☐ BR

☐ DB

☐ API

☐ UI

☐ Test

☐ Implementation

---

Version

1.0.0

LOCKED