# PM-101 — Programme Revision

**Version:** 1.0.0
**Project:** JKR Site Diary Platform

## Status

Locked

---

# Purpose

Programme Revision represents a frozen planning baseline.

Only one Revision may be active at any time.

---

# Business Objective

Maintain complete planning history while supporting operational continuity.

---

# Actors

Project Manager

Planning Engineer

HQ Coordinator

---

# Business Flow

Create Revision

↓

Import MSP

↓

Validate

↓

Publish

↓

Lock

↓

Operations Begin

---

# Functional Scope

Included

- Revision creation
- MSP import
- Validation
- Publishing
- Revision locking

Excluded

- Activity execution
- Progress update

---

# User Stories

As a Planning Engineer,

I want to publish a new Revision,

so that site operations follow the latest approved programme.

---

# Functional Requirements

Revision Number unique.

Only one Active Revision.

Published Revision immutable.

Historical Revisions preserved.

---

# Business Rules Reference

ADR-004

ADR-007

---

# Database Reference

DB-012

---

# API Reference

API-011

---

# UI Reference

UI-101

---

# Permissions

Create

Publish

Archive

Read

---

# Notifications

Revision Published

Revision Archived

---

# Audit Requirements

All Revision lifecycle events audited.

---

# Acceptance Criteria

Revision validated.

MSP imported successfully.

Revision published.

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
