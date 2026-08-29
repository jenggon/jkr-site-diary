# ADR-004: Programme Revision Lifecycle

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

**Status:** Locked

**Date:** 2026-07-22

**Decision Type:** Architecture

---

# Context

Programme Revisions represent formally approved planning baselines.

Each revision defines a complete operational planning context for project execution.

A clear lifecycle is required to ensure planning consistency, operational traceability and historical preservation.

---

# Decision

Every Programme Revision shall follow a controlled lifecycle.

Draft

↓

Approved

↓

Archived

Only one Programme Revision may hold the Approved status at any point in time.

Approving a new Programme Revision automatically archives the previously approved revision.

---

# Motivation

This decision provides:

- Clear planning authority.
- Controlled operational transition.
- Single active planning baseline.
- Complete historical preservation.

---

# Architectural Rules

The following rules are established.

- Multiple Draft revisions are permitted.
- Only one Approved revision may exist.
- Archived revisions are read-only.
- Operational engines consume only the Approved revision.

---

# Lifecycle Behaviour

## Draft

Planning in progress.

Visible only to authorised planning users.

---

## Approved

Official operational planning baseline.

Consumed by all operational engines.

---

## Archived

Historical planning record.

Immutable.

Used only for reference and audit purposes.

---

# Consequences

## Positive

- Clear operational ownership.
- Simplified revision management.
- Reliable audit history.
- Consistent operational behaviour.

## Negative

- New approvals require operational transition.
- Previous revisions cannot be reactivated directly.

---

# Alternatives Considered

## Multiple Active Revisions

Rejected.

Reason:

Creates ambiguity regarding operational authority.

---

## Editable Historical Revisions

Rejected.

Reason:

Compromises audit integrity.

---

# Impact

This decision affects:

- Programme Engine
- Revision Management
- Operational Programme Builder
- Task Engine
- Progress Engine
- Site Diary
- Audit Engine

---

# Related Documents

- PROJECT-CONSTITUTION.md
- ADR-001-Separate-Bounded-Contexts.md
- ADR-002-Program-Kerja-Boundary.md
- ADR-003-No-Migration-Between-Revisions.md
