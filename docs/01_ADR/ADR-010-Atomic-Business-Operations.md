# ADR-010 — Atomic Business Operations

| Item | Value |
|------|-------|
| ADR | ADR-010 |
| Title | Atomic Business Operations |
| Status | Accepted |
| Owner | HQ Architecture |
| Version | 1.0 |
| Applies To | Entire Platform |

---

# Context

The JKR Site Diary Platform is governed by a LOCKED Blueprint.

Several Blueprint business rules define architectural invariants that shall always remain true throughout the lifetime of the platform.

Examples include:

- Only one Approved Programme Revision may exist.
- Only one Current Revision may exist.
- Only one Approved Site Diary may exist. *(Future Engine)*
- Only one Active Workforce Assignment may exist. *(Future Engine)*

These are Blueprint invariants and shall never be violated during business operations.

---

# Problem Statement

Certain business operations require coordinated updates across multiple persistent records in order to preserve a Blueprint invariant.

Example:

Approve Programme Revision

↓

Archive previously Approved Revision

↓

Approve new Revision

If these updates are executed independently, intermediate states may temporarily violate the Blueprint.

Examples include:

- Two Approved revisions exist simultaneously.
- Zero Approved revisions exist.

Both situations violate the Blueprint.

---

# Decision

Every business operation that preserves or enforces a Blueprint invariant SHALL execute atomically.

Atomicity is an architectural requirement.

The Blueprint defines **WHAT** shall remain true.

Implementation determines **HOW** atomicity is achieved.

---

# Scope

This ADR applies whenever a business operation:

- modifies multiple persistent records;
- modifies multiple entities;
- performs lifecycle transitions;
- maintains Blueprint invariants;
- requires coordinated updates.

---

# Layer Responsibilities

## Domain Model

Responsible only for business entities.

Shall not perform:

- persistence;
- business orchestration;
- transaction management.

---

## Repository

Responsible only for persistence.

Repositories SHALL:

- Create
- Read
- Update
- Delete *(where applicable)*

Repositories SHALL NOT:

- implement business rules;
- orchestrate business workflows;
- manage transactions;
- commit;
- rollback.

---

## Service

Responsible for business orchestration.

Services SHALL:

- implement Blueprint business rules;
- coordinate repository operations;
- invoke atomic business operations when required.

Services SHALL NOT expose intermediate Blueprint violations outside the Service boundary.

---

## Infrastructure

Responsible for atomic execution.

Implementation MAY use:

- Database Transaction
- Stored Procedure
- PostgreSQL Function
- Supabase RPC
- Equivalent transactional mechanism

This ADR intentionally does not mandate any specific implementation technology.

---

# UI Principle

Every business operation SHALL execute as:

User Action

↓

One API Request

↓

One Business Operation

↓

One Atomic Execution

↓

One Response

The user interface SHALL never display an intermediate state that violates a Blueprint invariant.

---

# Architectural Principle

> **Blueprint invariants shall never become externally observable in an invalid state.**

This principle applies to all engines within the platform.

---

# Consequences

This ADR applies to, but is not limited to:

Current:

- Approve Programme Revision
- Archive Programme

Future:

- Submit Site Diary
- Close Activity
- Approve Variation Order
- Publish Progress
- Approve Workforce Assignment
- Lock Monthly Progress

---

# Non-Goals

This ADR does not prescribe:

- database vendor;
- ORM;
- framework;
- Supabase;
- PostgreSQL;
- RPC;
- Stored Procedures.

These remain implementation decisions.

---

# Relationship

This ADR complements:

- ADR-004 — Programme Revision Lifecycle
- ADR-009 — Programme First Principle

This ADR introduces no new business rules.

It defines only the execution model required to preserve existing Blueprint invariants.

---

# Compliance

All future implementations SHALL comply with this ADR whenever a business operation preserves a Blueprint invariant.

Any implementation that may expose an intermediate invalid Blueprint state is non-compliant.

---

# HQ Approval

**Status:** Accepted

This ADR is LOCKED and forms part of the Architecture Baseline.