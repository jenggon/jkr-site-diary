# ADR-006: Program Kerja as the Single Source of Truth

**Status:** Accepted

**Date:** 2026-07-22

**Decision Type:** Architecture

---

# Context

Operational consistency requires a single authoritative source for all project execution activities.

Multiple operational data sources introduce ambiguity, inconsistent behaviour and increase integration complexity.

The platform requires a single operational reference that is stable, auditable and officially approved.

---

# Decision

Program Kerja is established as the Single Source of Truth (SSOT) for all operational activities.

All operational engines shall obtain planning information exclusively from the currently Approved Program Kerja.

No operational component shall directly consume scheduling files or unofficial planning data.

---

# Motivation

This decision provides:

- Consistent operational behaviour.
- Stable integration.
- Reliable reporting.
- Simplified architecture.
- Clear ownership.

---

# Architectural Rules

The following rules are established.

- Only one Approved Program Kerja exists at any time.
- Operational engines consume only the Approved Program Kerja.
- Scheduling files remain within Zon Penjadualan.
- Program Kerja becomes the official operational reference.

---

# Data Ownership

## Zon Penjadualan

Owns:

- Scheduling Files
- Import Process
- Programme Revision
- Programme Approval

---

## Zon Operasi

Consumes:

- Approved Program Kerja

Owns:

- Site Diary
- Activities
- Progress
- Workforce
- Validation
- Audit

---

# Consequences

## Positive

- One operational truth.
- Reduced integration complexity.
- Easier maintenance.
- Better scalability.
- Better auditability.

## Negative

- Program Kerja becomes a critical dependency.
- Approval process becomes mandatory before operational execution.

---

# Alternatives Considered

## Multiple Operational Sources

Rejected.

Reason:

Creates conflicting operational information.

---

## Direct Scheduling Integration

Rejected.

Reason:

Violates bounded context separation.

---

# Impact

This decision affects:

- Programme Engine
- Operational Programme Builder
- Task Engine
- Activity Engine
- Progress Engine
- Validation Engine
- Approval Engine
- Audit Engine
- Site Diary

---

# Related Documents

- PROJECT-CONSTITUTION.md
- ADR-001-Separate-Bounded-Contexts.md
- ADR-002-Program-Kerja-Boundary.md
- ADR-003-No-Migration-Between-Revisions.md
- ADR-004-Programme-Revision-Lifecycle.md
- ADR-005-HQ-Compliance-Requirements.md