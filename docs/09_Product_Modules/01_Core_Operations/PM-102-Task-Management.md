# PM-102 — Task Management

## Status

Approved

---

# Purpose

Task represents the planning unit imported from Programme Revision.

Tasks define operational intent but do not record execution.

---

# Business Objective

Provide structured planning units for Activity generation.

---

# Actors

Planning Engineer

Project Manager

---

# Business Flow

Import

↓

Validate

↓

Assign

↓

Ready for Activity

---

# Functional Scope

Included

- Task import
- WBS
- UID
- Planned duration
- Planned quantities

Excluded

- Daily execution
- Site diary

---

# Functional Requirements

UID immutable.

Task belongs to one Revision.

Task archived with Revision.

---

# Database Reference

DB-013

---

# API Reference

API-012

---

# UI Reference

UI-102

---

# Acceptance Criteria

Task imported.

UID verified.

Ready for Activity creation.

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