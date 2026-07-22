# ADR-002: Program Kerja as the Official Boundary

**Status:** Accepted

**Date:** 2026-07-22

**Decision Type:** Architecture

---

# Context

The platform requires a clear and controlled integration point between Zon Penjadualan and Zon Operasi.

Operational components must not consume scheduling files directly.

Without a formal boundary, both bounded contexts become tightly coupled and difficult to maintain.

---

# Decision

Program Kerja is established as the only official boundary between Zon Penjadualan and Zon Operasi.

Only an authorised Program Kerja may be consumed by operational engines.

Scheduling files such as Microsoft Project, Primavera or imported XML files shall never be accessed directly by operational components.

---

# Motivation

This decision provides:

- Single operational source of truth.
- Stable integration contract.
- Clear ownership.
- Independent evolution of both bounded contexts.
- Better testing and validation.

---

# Architectural Rules

The following rules are established.

- Zon Penjadualan owns Programme Planning.
- Zon Operasi owns Project Execution.
- Program Kerja is the integration boundary.
- No operational engine may access scheduling files directly.

---

# Consequences

## Positive

- Loose coupling.
- Better maintainability.
- Clear responsibilities.
- Controlled data flow.

## Negative

- Program Kerja becomes a critical architectural component.
- Boundary validation becomes mandatory.

---

# Alternatives Considered

## Direct MSP Access

Rejected.

Reason:

Creates tight coupling between scheduling and operational domains.

---

## Shared Scheduling Database

Rejected.

Reason:

Violates bounded context ownership.

---

# Impact

This decision affects:

- Import Engine
- Operational Programme Builder
- Task Engine
- Activity Engine
- Progress Engine
- Validation Engine
- Site Diary

---

# Related Documents

- PROJECT-CONSTITUTION.md
- ADR-001-Separate-Bounded-Contexts.md