# PM-100 — Programme Management

## Status

Approved

---

# Purpose

Programme Management is the highest-level business capability of the Construction Operations Platform.

It establishes the operational container for all construction activities.

---

# Business Objective

Provide a single source of truth for every construction programme.

Support complete lifecycle management from creation until archival.

---

# Actors

Primary

- Project Manager
- HQ Coordinator

Secondary

- Site Engineer
- Resident Engineer

---

# Business Flow

Create Programme

↓

Configure Programme

↓

Assign Team

↓

Create Programme Revision

↓

Publish

↓

Execute

↓

Archive

---

# Functional Scope

Included

- Programme registration
- Metadata management
- Team assignment
- Status management
- Programme archive

Excluded

- Task scheduling
- Daily operations
- Progress recording

---

# User Stories

As a Project Manager,

I want to create a Programme,

so that construction activities can be organised under one operational boundary.

---

# Functional Requirements

Programme Code shall be unique.

Programme Name is mandatory.

Programme Owner is mandatory.

Programme Status shall be system controlled.

Archived Programmes are read-only.

---

# Business Rules Reference

BR-001

ADR-002

ADR-006

---

# Database Reference

DB-011

---

# API Reference

API-010

---

# UI Reference

UI-100

---

# Permissions

Create Programme

Update Programme

Archive Programme

Read Programme

---

# Notifications

Programme Created

Programme Archived

---

# Audit Requirements

Every Programme modification shall be audited.

---

# Acceptance Criteria

Programme created successfully.

Programme uniquely identified.

Programme available for Revision creation.

---

# Definition of Done

☐ Business Rules Linked

☐ Database Linked

☐ API Linked

☐ UI Linked

☐ Test Scenario Linked

☐ Implementation Complete

---

Version

1.0.0

LOCKED