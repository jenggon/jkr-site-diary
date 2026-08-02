# ADR-001: Separate Bounded Contexts

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

**Status:** Locked

**Date:** 2026-07-22

**Decision Type:** Architecture

---

# Context

The JKR Site Diary Platform consists of two fundamentally different domains.

Scheduling activities belong to the planning discipline.

Daily site execution belongs to the operational discipline.

Mixing both responsibilities inside a single domain introduces unnecessary coupling, unclear ownership and difficult future maintenance.

---

# Decision

The platform shall be separated into two bounded contexts.

1. Zon Penjadualan
2. Zon Operasi

Each bounded context owns its own data, services, responsibilities and lifecycle.

Communication between both contexts shall only occur through an authorised Program Kerja.

---

# Consequences

## Positive

- Clear separation of responsibility.
- Easier maintenance.
- Independent evolution.
- Better scalability.
- Better testing.
- Better domain ownership.

---

## Negative

- Additional documentation required.
- Clear integration contracts required.

---

# Alternatives Considered

## Single Monolithic Domain

Rejected.

Reason:

Scheduling and Operations have fundamentally different responsibilities.

---

## Shared Database With Mixed Logic

Rejected.

Reason:

High coupling.

Poor maintainability.

Unclear ownership.

---

# Architectural Rules

The following rules are established.

- Zon Penjadualan owns planning.
- Zon Operasi owns execution.
- No direct dependency between both contexts.
- Program Kerja is the official boundary.

---

# Impact

This decision affects:

- Database Design
- API Design
- UI Behaviour
- Business Rules
- Future ADR

---

# Related Documents

- PROJECT-CONSTITUTION.md
- ADR-002 Program Kerja Boundary
